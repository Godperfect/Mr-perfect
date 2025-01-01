const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "get", // Command name
    version: "1.0", // Command version
    author: "YourName", // Your name
    countDown: 5, // Time to wait before executing command again (in seconds)
    role: 2, // Role required to use the command (0: normal user, 1: admin, 2: owner)
    shortDescription: {
      vi: "Tải tệp lên các nền tảng",
      en: "Upload file to different platforms"
    },
    description: {
      vi: "Lệnh này tải tệp lên Pastebin, Mocky hoặc gửi trực tiếp.",
      en: "This command uploads a file to Pastebin, Mocky or sends it directly."
    },
    category: "Owner", // Category for the command
    guide: {
      en: "{pn} file_name" // Guide to use the command
    }
  },

  onStart: async function ({ api, event, args, message, GoatWrapper }) {
    try {
      const fileName = args[0];

      // Ensure file name is provided
      if (!fileName) {
        return message.reply("❌ Please provide a file name.");
      }

      const filePath = path.join(__dirname, `${fileName}.js`);

      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        return message.reply(`❌ File not found: ${fileName}.js`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');

      // Send the initial prompt to ask where to upload the code
      message.reply("Select where to upload the code:\n1. Pastebin\n2. Mocky\n3. Bin (directly send the content)");

      // Listen for the user's response
      GoatWrapper.listenMessage(event.threadID, async (responseEvent) => {
        const response = responseEvent.body.trim(); // Clean user input

        // Handle user selection for uploading the file
        if (response === "1" || response.toLowerCase() === "pastebin") {
          // Pastebin Logic
          const { PasteClient } = require('pastebin-api');
          const client = new PasteClient("YOUR_PASTEBIN_API_KEY");

          try {
            const pasteUrl = await client.createPaste({
              code: fileContent,
              expireDate: 'N',
              format: "javascript",
              name: fileName,
              publicity: 1
            });

            const pastebinLink = `https://pastebin.com/raw/${pasteUrl.split('/')[3]}`;
            message.reply(`✅ File uploaded to Pastebin: ${pastebinLink}`);
          } catch (err) {
            message.reply(`❌ Failed to upload to Pastebin: ${err.message}`);
          }

        } else if (response === "2" || response.toLowerCase() === "mocky") {
          // Mocky Logic
          try {
            const mockyResponse = await axios.post('https://api.mocky.io/api/mock', {
              status: 200,
              content: fileContent,
              content_type: 'application/json',
              charset: 'UTF-8',
              secret: 'Y6PFNNYJO2DCCF4EOmTeB7C7LuWCX0SaIx52',
              expiration: "1year"
            });

            message.reply(`✅ File uploaded to Mocky: ${mockyResponse.data.link}`);
          } catch (err) {
            message.reply(`❌ Failed to upload to Mocky: ${err.message}`);
          }

        } else if (response === "3" || response.toLowerCase() === "bin") {
          // Bin Logic (send file content directly)
          message.reply(`✅ Sending content directly:\n\n${fileContent}`);
        } else {
          // Invalid choice
          message.reply("❌ Invalid choice! Please select a valid option:\n1. Pastebin\n2. Mocky\n3. Bin");
        }
      });
    } catch (error) {
      console.error(error);
      message.reply("❌ An error occurred. Please try again.");
    }
  }
};