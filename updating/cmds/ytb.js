module.exports = {
  config: {
    name: "ytdl",
    version: "1.1",
    author: "Rishad",
    countDown: 25,
    role: 0,
    shortDescription: { en: "Download YouTube video or audio." },
    longDescription: { en: "Download YouTube video or audio based on a query or link." },
    category: "media",
    guide: {
      en: "{pn} <video/audio> <search query>\n{pn} -v <search query>\n{pn} -a <search query>\n{pn} -v <link>\n{pn} -a <link>\nUse -v for video and -a for audio.",
    },
  },

  onStart: async function ({ api, event, args, message }) {
    if (args.length < 2) {
      return message.reply(
        "Usage:\n1. `/ytdl video <search query>` or `/ytdl -v <search query>` to download a video.\n" +
        "2. `/ytdl audio <search query>` or `/ytdl -a <search query>` to download audio.\n" +
        "3. `/ytdl -v <link>` or `/ytdl -a <link>` to download directly from a YouTube link."
      );
    }

    const type = args[0].toLowerCase();
    let query = args.slice(1).join(" ");

    if (!["video", "audio", "-v", "-a"].includes(type)) {
      return message.reply("Invalid format. Use `video`, `audio`, `-v`, or `-a` as the first parameter.");
    }

    const isVideo = type === "video" || type === "-v";
    const isAudio = type === "audio" || type === "-a";

    if (!query) {
      return message.reply("Please provide a valid search query or YouTube link.");
    }

    const isLink = query.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/);

    try {
      if (isLink) {
        await handleDownload({ api, event, message, query, isVideo, isAudio });
      } else {
        const response = await global.utils.ytSearch(query);
        const videos = response.slice(0, 6);

        if (videos.length === 0) return message.reply("No YouTube videos found for the given query.");

        const videoList = videos
          .map(
            (video, index) =>
              `${index + 1}. ${video.title}\nViews: ${video.viewCount}\nDuration: ${video.duration}`
          )
          .join('\n\n');

        const buttons = videos.map((_, index) => ({
          text: `${index + 1}`,
          callback_data: `${index + 1}`,
        }));

        const options = {
          reply_markup: { inline_keyboard: [buttons] },
        };

        const sentMessage = await api.sendMessage(event.threadID, videoList, options);
        const formSet = {
          commandName: this.config.name,
          author: event.senderID,
          videos,
          isVideo,
          isAudio,
        };
        formSet.messageID = String(sentMessage.message_id);
        global.MikoBot.onCallbackQuery.set(String(sentMessage.message_id), formSet);
      }
    } catch (error) {
      console.error("Error:", error.message);
      message.reply("An error occurred while processing your request.");
    }
  },

  onCallbackQuery: async function ({ api, event, Query, message }) {
    const { videos, author, isVideo, isAudio } = Query;

    if (event.senderID !== author) return message.reply("Only the original requester can select a video.");

    const selectedIndex = parseInt(event.data) - 1;
    global.MikoBot.onCallbackQuery.delete(Query.messageID);
    await api.deleteMessage(event.threadID, Query.messageID);

    if (selectedIndex < 0 || selectedIndex >= videos.length) {
      return api.sendMessage(event.threadID, "Please select a valid video number.");
    }

    const selectedVideo = videos[selectedIndex];
    await handleDownload({ api, event, message, query: selectedVideo.url, isVideo, isAudio });
  },
};

async function handleDownload({ api, event, message, query, isVideo, isAudio }) {
  try {
    const downloadData = await global.utils.ytDl(query);
    const mediaData = isVideo ? downloadData.video : downloadData.audio;

    const mediaStream = await global.utils.getStreamFromURL(mediaData.url);

    if (isVideo) {
      await api.sendVideo(event.threadID, mediaStream, {
        caption: `• Title: ${downloadData.info.title}\n• Views: ${downloadData.info.views}\n• Duration: ${downloadData.info.duration}`,
      });
    } else if (isAudio) {
      await api.sendVoice(event.threadID, mediaStream, {
        caption: `• Title: ${downloadData.info.title}\n• Channel: ${downloadData.info.channel}\n• Duration: ${downloadData.info.duration}`
      });
    }
  } catch (error) {
    console.error("Download Error:", error.message);
    message.reply("An error occurred while downloading the media.");
  }
}