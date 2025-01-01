const { GoatWrapper } = require('fca-liane-utils');
const axios = require("axios");

module.exports = {
  config: {
    name: "gpa",
    aliases: ["gpacalc"],
    version: "1.3", // Updated version
    author: "kshitiz",
    countDown: 5,
    role: 0,
    shortDescription: "GPA calculate",
    longDescription: {
      en: "Convert GPA to percentage, provide letter equivalent, and also allow percentage to GPA conversion.",
    },
    category: "info",
    guide: {
      en: "{prefix}gpa <your GPA or percentage>",
    },
  },

  onStart: async function ({ api, event, args }) {
    const userInput = parseFloat(args[0]);

    // Check if the user input is a GPA (between 0 and 4)
    if (!isNaN(userInput) && userInput >= 0 && userInput <= 4) {
      // If it's a GPA, calculate percentage and letter equivalent
      const percentage = userInput * 25;

      let letterEquivalent;
      if (userInput < 0.8) letterEquivalent = "E";
      else if (userInput < 1.2) letterEquivalent = "D";
      else if (userInput < 1.6) letterEquivalent = "D+";
      else if (userInput < 2.0) letterEquivalent = "C";
      else if (userInput < 2.4) letterEquivalent = "C+";
      else if (userInput < 2.8) letterEquivalent = "B";
      else if (userInput < 3.2) letterEquivalent = "B+";
      else if (userInput < 3.6) letterEquivalent = "A";
      else letterEquivalent = "A+";

      // Send back GPA, percentage, and letter equivalent
      return api.sendMessage(
        `𝐏𝐫𝐨𝐯𝐢𝐝𝐞𝐝 𝐆𝐏𝐀: ${userInput}\n𝐏𝐫𝐨𝐛𝐚𝐛𝐥𝐞 𝐏𝐞𝐫𝐜𝐞𝐧𝐭𝐚𝐠𝐞: ${percentage}%\n𝐋𝐞𝐭𝐭𝐞𝐫 𝐄𝐪𝐮𝐢𝐯𝐚𝐥𝐞𝐧𝐭: ${letterEquivalent}`,
        event.threadID,
        event.messageID
      );
    }

    // If the input is a percentage, convert to GPA
    const userPercentage = parseFloat(args[0]);

    if (!isNaN(userPercentage) && userPercentage >= 0 && userPercentage <= 100) {
      // Calculate GPA from percentage (assuming linear conversion)
      const gpa = userPercentage / 25; // GPA = Percentage / 25

      let letterEquivalent;
      if (userPercentage < 50) letterEquivalent = "E";
      else if (userPercentage < 60) letterEquivalent = "D";
      else if (userPercentage < 70) letterEquivalent = "D+";
      else if (userPercentage < 80) letterEquivalent = "C";
      else if (userPercentage < 85) letterEquivalent = "C+";
      else if (userPercentage < 90) letterEquivalent = "B";
      else if (userPercentage < 95) letterEquivalent = "B+";
      else if (userPercentage < 100) letterEquivalent = "A";
      else letterEquivalent = "A+";

      // Send back percentage, GPA, and letter equivalent
      return api.sendMessage(
        `𝐏𝐫𝐨𝐯𝐢𝐝𝐞𝐝 𝐏𝐞𝐫𝐜𝐞𝐧𝐭𝐚𝐠𝐞: ${userPercentage}%\n𝐏𝐫𝐨𝐛𝐚𝐛𝐥𝐞 𝐆𝐏𝐀: ${gpa}\n𝐋𝐞𝐭𝐭𝐞𝐫 𝐄𝐪𝐮𝐢𝐯𝐚𝐥𝐞𝐧𝐭: ${letterEquivalent}`,
        event.threadID,
        event.messageID
      );
    }

    // If neither GPA nor percentage is provided, return an error
    return api.sendMessage(
      "Please provide a valid GPA (between 0 and 4) or a percentage (between 0 and 100).",
      event.threadID
    );
  },
};

const wrapper = new GoatWrapper(module.exports);
wrapper.applyNoPrefix({ allowPrefix: true });