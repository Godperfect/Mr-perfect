const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "tiktok",
    version: "1.0.0",
    role: 0,
    countDown: 0,
    credits: "cliff",
    author: "cliff",
    shortDescription: "TikTok search videos and send them.",
    hasPrefix: false,
    category: "search",
    aliases: ["tik"],
    usage: "[tiktok <search text>]",
    cooldown: 5,
  },

  onStart: async function ({ api, event, args }) {
    const CLIENT_KEY = "awd82gf4b9hub14i"; // Your TikTok client key
    const CLIENT_SECRET = "BQLfIV5gXRNyiBeqbG96VQLUoDGfDNvo"; // Your TikTok client secret

    try {
      const searchQuery = args.join(" ");
      if (!searchQuery) {
        return api.sendMessage("Usage: tiktok <search text>", event.threadID);
      }

      api.sendMessage("⏱️ | Searching TikTok, please wait...", event.threadID);

      // Step 1: Generate Access Token using CLIENT_KEY and CLIENT_SECRET
      const tokenResponse = await axios.post("https://open.tiktokapis.com/v1/oauth/token/", {
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials",
      });

      const accessToken = tokenResponse.data.access_token;

      if (!accessToken) {
        return api.sendMessage("Failed to authenticate with TikTok API.", event.threadID);
      }

      // Step 2: Perform Search Request
      const searchResponse = await axios.get("https://open.tiktokapis.com/v1/video/discover/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          keyword: searchQuery,
          count: 1, // Limit to one result
        },
      });

      const videos = searchResponse.data.data;

      if (!videos || videos.length === 0) {
        return api.sendMessage("No videos found for the given search query.", event.threadID);
      }

      const videoData = videos[0];
      const videoUrl = videoData.download_url;

      const message = `𝐓𝐢𝐤𝐭𝐨𝐤 𝐑𝐞𝐬𝐮𝐥𝐭:\n\n𝐏𝐨𝐬𝐭 𝐛𝐲: ${videoData.author.nickname}\n𝐔𝐬𝐞𝐫𝐧𝐚𝐦𝐞: ${videoData.author.unique_id}\n\n𝐓𝐢𝐭𝐥𝐞: ${videoData.title}`;

      // Step 3: Download Video
      const filePath = path.join(__dirname, `/cache/tiktok_video.mp4`);
      const writer = fs.createWriteStream(filePath);

      const videoResponse = await axios({
        method: "get",
        url: videoUrl,
        responseType: "stream",
      });

      videoResponse.data.pipe(writer);

      writer.on("finish", () => {
        api.sendMessage(
          { body: message, attachment: fs.createReadStream(filePath) },
          event.threadID,
          () => fs.unlinkSync(filePath)
        );
      });
    } catch (error) {
      console.error("Error:", error.message);
      api.sendMessage("An error occurred while processing the request.", event.threadID);
    }
  },
};