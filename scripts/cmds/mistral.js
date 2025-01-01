const axios = require('axios');
const fs = require('fs');
const path = require('path');

const chatHistoryDir = 'mistralChatHistory';
const apiKey = '0jgnkugoKftsu99SXo6AgZ81fKxssXfq';  // Your Mistral API key

const systemPrompt = "Examine the prompt and respond precisely as directed, omitting superfluous information. Provide brief responses, typically 1-2 sentences, except when detailed answers like essays, poems, or stories are requested.";

module.exports = {
    config: {
        name: 'mistral',
        aliases: ['mst'],
        version: '1.0.0',
        author: 'Mr perfect',
        countDown: 0,
        role: 0,
        category: 'Ai',
        description: {
            en: 'Mistral Model Integration.',
        },
        guide: {
            en: '{pn} [question]',
        },
    },
    onStart: async function ({ api, message, event, args, commandName }) {
        var prompt = args.join(" ");

        let chatHistory = [];

        if (prompt.toLowerCase() === "clear") {
            clearChatHistory(event.senderID);
            message.reply("Chat history cleared!");
            return;
        }

        var content = (event.type == "message_reply") ? event.messageReply.body : args.join(" ");
        var targetMessageID = (event.type == "message_reply") ? event.messageReply.messageID : event.messageID;

        if (event.type == "message_reply") {
            content = content + " " + prompt;
            clearChatHistory(event.senderID);

            api.setMessageReaction("⌛", event.messageID, () => { }, true);

            const startTime = Date.now();

            try {
                const chatMessages = [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": content }
                ];

                const chatCompletion = await sendMistralRequest(chatMessages);

                const assistantResponse = chatCompletion.choices[0].message.content;

                const endTime = new Date().getTime();
                const completionTime = ((endTime - startTime) / 1000).toFixed(2);
                const totalWords = assistantResponse.split(/\s+/).filter(word => word !== '').length;

                let finalMessage = `${assistantResponse}\n\nCompletion time: ${completionTime} seconds\nTotal words: ${totalWords}`;

                api.sendMessage(finalMessage, event.threadID, (err, info) => {
                    if (!err) {
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName,
                            messageID: info.messageID,
                            author: event.senderID,
                            replyToMessageID: targetMessageID
                        });
                    } else {
                        console.error("Error sending message:", err);
                    }
                });

                chatHistory.push({ role: "user", content: prompt });
                chatHistory.push({ role: "assistant", content: assistantResponse });
                appendToChatHistory(targetMessageID, chatHistory);

                api.setMessageReaction("✅", event.messageID, () => { }, true);
            } catch (error) {
                console.error("Error in chat completion:", error);
                api.setMessageReaction("❌", event.messageID, () => { }, true);
                return message.reply(`An error occurred: ${error}`, event.threadID, event.messageID);
            }
        }
        else {
            clearChatHistory(event.senderID);

            if (args.length == 0 && prompt == "") {
                message.reply("Please provide a prompt.");
                return;
            }

            api.setMessageReaction("⌛", event.messageID, () => { }, true);

            const startTime = Date.now();

            try {
                const chatMessages = [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": prompt }
                ];

                const chatCompletion = await sendMistralRequest(chatMessages);

                const assistantResponse = chatCompletion.choices[0].message.content;

                const endTime = new Date().getTime();
                const completionTime = ((endTime - startTime) / 1000).toFixed(2);
                const totalWords = assistantResponse.split(/\s+/).filter(word => word !== '').length;

                let finalMessage = `${assistantResponse}\n\nCompletion time: ${completionTime} seconds\nTotal words: ${totalWords}`;

                api.sendMessage(finalMessage, event.threadID, (err, info) => {
                    if (!err) {
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName,
                            messageID: info.messageID,
                            author: event.senderID,
                            replyToMessageID: event.messageID
                        });
                    } else {
                        console.error("Error sending message:", err);
                    }
                });

                chatHistory.push({ role: "user", content: prompt });
                chatHistory.push({ role: "assistant", content: assistantResponse });
                appendToChatHistory(event.senderID, chatHistory);

                api.setMessageReaction("✅", event.messageID, () => { }, true);
            } catch (error) {
                console.error("Error in chat completion:", error);
                api.setMessageReaction("❌", event.messageID, () => { }, true);
                return message.reply(`An error occurred: ${error}`, event.threadID, event.messageID);
            }
        }
    },
    onReply: async function ({ api, message, event, Reply, args }) {
        var prompt = args.join(" ");
        let { author, commandName } = Reply;

        if (event.senderID !== author) return;

        if (prompt.toLowerCase() === "clear") {
            clearChatHistory(author);
            message.reply("Chat history cleared!");
            return;
        }

        api.setMessageReaction("⌛", event.messageID, () => { }, true);

        const startTime = Date.now();

        try {
            const chatHistory = loadChatHistory(event.senderID);

            const chatMessages = [
                { "role": "system", "content": systemPrompt },
                ...chatHistory,
                { "role": "user", "content": prompt }
            ];

            const chatCompletion = await sendMistralRequest(chatMessages);

            const assistantResponse = chatCompletion.choices[0].message.content;

            const endTime = new Date().getTime();
            const completionTime = ((endTime - startTime) / 1000).toFixed(2);
            const totalWords = assistantResponse.split(/\s+/).filter(word => word !== '').length;

            let finalMessage = `${assistantResponse}\n\nCompletion time: ${completionTime} seconds\nTotal words: ${totalWords}`;

            message.reply(finalMessage, (err, info) => {
                if (!err) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName,
                        messageID: info.messageID,
                        author: event.senderID,
                    });
                } else {
                    console.error("Error sending message:", err);
                }
            });

            chatHistory.push({ role: "user", content: prompt });
            chatHistory.push({ role: "assistant", content: assistantResponse });
            appendToChatHistory(event.senderID, chatHistory);

            api.setMessageReaction("✅", event.messageID, () => { }, true);
        } catch (error) {
            console.error("Error in chat completion:", error);
            message.reply(error.message);
            api.setMessageReaction("❌", event.messageID, () => { }, true);
        }
    }
};

async function sendMistralRequest(messages) {
    try {
        const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
            model: 'mistral-large-latest',
            messages: messages
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error("Error in Mistral API request:");

        if (error.response) {
            // Log detailed error response from API
            console.error("Status:", error.response.status);
            console.error("Error Message:", error.response.data.error.message);
            console.error("Error Details:", JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error("Request:", error.request);
        } else {
            console.error("Message:", error.message);
        }

        throw error;
    }
}

function loadChatHistory(uid) {
    const chatHistoryFile = path.join(chatHistoryDir, `memory_${uid}.json`);

    try {
        if (fs.existsSync(chatHistoryFile)) {
            const fileData = fs.readFileSync(chatHistoryFile, 'utf8');
            const chatHistory = JSON.parse(fileData);
            return chatHistory.map((message) => {
                if (message.role === "user" && message.parts) {
                    return { role: "user", content: message.parts[0].text };
                } else {
                    return message;
                }
            });
        } else {
            return [];
        }
    } catch (error) {
        console.error(`Error loading chat history for UID ${uid}:`, error);
        return [];
    }
}

function appendToChatHistory(uid, chatHistory) {
    const chatHistoryFile = path.join(chatHistoryDir, `memory_${uid}.json`);

    try {
        if (!fs.existsSync(chatHistoryDir)) {
            fs.mkdirSync(chatHistoryDir);
        }

        fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
    } catch (error) {
        console.error(`Error saving chat history for UID ${uid}:`, error);
    }
}

function clearChatHistory(uid) {
    const chatHistoryFile = path.join(chatHistoryDir, `memory_${uid}.json`);

    try {
        fs.unlinkSync(chatHistoryFile);
    } catch (err) {
        console.error("Error deleting chat history file:", err);
    }
}