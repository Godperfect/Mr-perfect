const { GoatWrapper } = require('fca-liane-utils');

module.exports = {
	config: {
		name: "notice",
		aliases: ["notif"],
		version: "1.0",
		author: "NTKhang",
		countDown: 5,
		role: 2,
		shortDescription: "Send notice from admin to all boxes",
		longDescription: "Send a notice from the admin to all groups and update it after a delay.",
		category: "owner",
		guide: "{pn} <message>", // Guide for usage
		envConfig: {
			delayPerGroup: 250, // Delay per group to avoid flooding requests
		},
	},

	onStart: async function ({ message, api, event, args, commandName, envCommands }) {
		const { delayPerGroup } = envCommands[commandName];

		if (!args[0]) {
			return message.reply("Please enter the message you want to send to all groups.");
		}

		const initialNotice = args.join(" "); // The initial notice provided by the admin

		// Send the "please be here within 10 seconds" message first
		const formSend = {
			body: `Notice from SuperAdmin\n────────────────\nPlease be here within 10 seconds!`,
			attachment: await getStreamsFromAttachment([...event.attachments, ...(event.messageReply?.attachments || [])]),
		};

		const allThreadID = (await api.getThreadList(2000, null, ["INBOX"]))
			.filter((item) => item.isGroup === true && item.threadID !== event.threadID)
			.map((item) => item.threadID);

		message.reply(`Starting to send notice to ${allThreadID.length} groups.`);

		let sendSuccess = 0;
		const sendError = [];
		const waitingSend = [];

		// Storing the sent message IDs to edit them later
		const messageIDs = {};

		for (const tid of allThreadID) {
			try {
				const sentMessage = await api.sendMessage(formSend, tid);
				waitingSend.push({
					threadID: tid,
					messageID: sentMessage.messageID, // Store the messageID
				});
				await new Promise((resolve) => setTimeout(resolve, delayPerGroup));
			} catch (e) {
				sendError.push(tid);
			}
		}

		for (const sended of waitingSend) {
			try {
				await sended.pending;
				sendSuccess++;
			} catch (e) {
				sendError.push(sended.threadID);
			}
		}

		// Now, after 10 seconds, update the sent message to the initial notice content.
		setTimeout(async () => {
			for (const sended of waitingSend) {
				try {
					const messageID = sended.messageID;
					const editedMessage = `Notice from SuperAdmin\n────────────────\n${initialNotice}`;

					// Edit the sent message with the actual notice content
					await api.editMessage(editedMessage, messageID);
				} catch (error) {
					console.error("Error editing message:", error);
				}
			}
		}, 10000); // Edit the message after 10 seconds (10000ms)

		message.reply(
			`✅ Sent notice to ${sendSuccess} groups. ${sendError.length > 0 ? `\n❌ Error occurred while sending to ${sendError.length} groups:\n${sendError.join("\n ")}` : ""}`
		);
	},
};

// Helper method to retrieve attachments if needed
const getStreamsFromAttachment = async (attachments) => {
	// Logic to handle attachments
};