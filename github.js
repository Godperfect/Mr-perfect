const { GoatWrapper } = require('fca-liane-utils');
const moment = require("moment");
const fetch = require("node-fetch");
const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "github",
    author: "Mr perfect",
    countdown: 5,
    role: 0,
    category: "media",
    shortDescription: {
      en: "Fetch GitHub user information",
    },
  },

  onStart: async function ({ api, event, args }) {
    if (!args[0]) {
      api.sendMessage("Please provide a GitHub username!", event.threadID, event.messageID);
      return;
    }

    const username = encodeURI(args.join(" "));
    const url = `https://api.github.com/users/${username}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `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` // Optional: Replace with your GitHub token
        }
      });

      if (!response.ok) {
        const errorMessage = `GitHub API responded with status ${response.status}.`;
        console.error(errorMessage);
        api.sendMessage("User not found or an error occurred while fetching the information.", event.threadID, event.messageID);
        return;
      }

      const body = await response.json();
      if (body.message) {
        api.sendMessage("User not found. Please provide a valid username!", event.threadID, event.messageID);
        return;
      }

      const { login, avatar_url, name, id, html_url, public_repos, followers, following, location, created_at, bio } = body;
      const info = `>> ${name || login}'s GitHub Information <<\n\n` +
        `Username: ${login}\n` +
        `ID: ${id}\n` +
        `Bio: ${bio || "No Bio"}\n` +
        `Public Repositories: ${public_repos || "None"}\n` +
        `Followers: ${followers}\n` +
        `Following: ${following}\n` +
        `Location: ${location || "No Location"}\n` +
        `Account Created: ${moment.utc(created_at).format("dddd, MMMM Do YYYY")}\n` +
        `Profile: ${html_url}\nAvatar:`;

      const imageBuffer = await axios.get(avatar_url, { responseType: "arraybuffer" }).then(res => res.data);
      const avatarPath = `${__dirname}/cache/avatargithub.png`;
      fs.writeFileSync(avatarPath, Buffer.from(imageBuffer, "utf-8"));

      api.sendMessage(
        {
          attachment: fs.createReadStream(avatarPath),
          body: info,
        },
        event.threadID,
        () => fs.unlinkSync(avatarPath)
      );
    } catch (error) {
      console.error("Error fetching GitHub user data:", error);
      api.sendMessage("An error occurred while fetching the user's information. Please try again later.", event.threadID, event.messageID);
    }
  },
};

const wrapper = new GoatWrapper(module.exports);
wrapper.applyNoPrefix({ allowPrefix: true });