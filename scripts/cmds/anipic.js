const { GoatWrapper } = require("fca-liane-utils");
const fs = require("fs");
const axios = require("axios");

module.exports = {
  config: {
    name: "anipic",
    aliases: [],
    author: "Mr-perfect",
    version: "1.1",
    cooldowns: 5,
    role: 0,
    shortDescription: {
      en: "Fetch a random anime picture"
    },
    longDescription: {
      en: "Get a random anime picture from an online source."
    },
    category: "𝗠𝗘𝗗𝗜𝗔",
    guide: {
      en: "Type the command to receive a random anime picture."
    }
  },
  onStart: async function ({ api, event }) {
    const perfect = `${__dirname}/cache/anipic_image_${event.threadID}_${Date.now()}.png`;

    try {
      const response = await axios.get("https://pic.re/image", { responseType: "stream" });

      if (response.status === 200) {
        const imageStream = response.data;
        const mr = fs.createWriteStream(perfect);

        imageStream.pipe(mr);

        mr.on("finish", () => {
          api.sendMessage(
            { attachment: fs.createReadStream(perfect) },
            event.threadID,
            () => fs.unlinkSync(perfect),
            event.messageID
          );
        });

        mr.on("error", () => {
          fs.unlinkSync(perfect);
          api.sendMessage("Error saving the image file.", event.threadID, event.messageID);
        });
      } else {
        api.sendMessage("Failed to fetch the anime picture. Please try again later.", event.threadID, event.messageID);
      }
    } catch (error) {
      api.sendMessage(`Error: ${error.message}`, event.threadID, event.messageID);
    }
  }
};

const wrapper = new GoatWrapper(module.exports);
wrapper.applyNoPrefix({ allowPrefix: true });