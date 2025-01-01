const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
  config: {
    name: "sing",
    version: "1.0",
    author: "YourName",
    description: "Fetch and play audio from YouTube",
    category: "entertainment",
    guide: "{pn} <song name>"
  },

  onStart: async function ({ message, args, api }) {
    if (!args[0]) {
      return message.reply("Please specify a song name to fetch.");
    }

    const query = args.join(" ");
    const youtubeApiKey = "AIzaSyDj77IGKDMlK6sn6jNBIho7GYo9AbRTVqQ"; // Replace this with your existing API key
    const youtubeSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${youtubeApiKey}`;

    try {
      // Search for the song on YouTube
      const searchResponse = await axios.get(youtubeSearchUrl);
      const video = searchResponse.data.items[0];

      if (!video) {
        return message.reply("No results found for your query. Please try again.");
      }

      const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
      const videoTitle = video.snippet.title;

      message.reply(`🎵 Found the song: ${videoTitle}\nFetching audio, please wait...`);

      // Download the audio
      const audioPath = path.resolve(__dirname, `${video.id.videoId}.mp3`);
      const audioStream = ytdl(videoUrl, { filter: "audioonly", quality: "highestaudio" });

      const writeStream = fs.createWriteStream(audioPath);
      audioStream.pipe(writeStream);

      writeStream.on("finish", () => {
        api.sendMessage(
          {
            body: `🎶 Here's your requested song: ${videoTitle}`,
            attachment: fs.createReadStream(audioPath)
          },
          message.threadID,
          () => {
            // Delete the audio file after sending
            fs.unlinkSync(audioPath);
          }
        );
      });

      writeStream.on("error", (err) => {
        console.error("Error writing audio file:", err);
        message.reply("Failed to fetch the audio. Please try again.");
      });

    } catch (error) {
      console.error("Error fetching song:", error);
      message.reply("An error occurred while processing your request. Please try again.");
    }
  }
};