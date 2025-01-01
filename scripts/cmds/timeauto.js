module.exports = {
  config: {
    name: "timeauto",
    version: "1.0",
    author: "YourName",
    shortDescription: "Activate or deactivate hourly time-based messages",
    longDescription: "",
    category: "boxchat",
    guide: "{pn} [on | off]"
  },

  onStart: async function({ message, event, threadsData, args }) {
    const { threadID } = event;
    let timeAuto = await threadsData.get(threadID, "settings.timeauto");

    // If timeauto setting doesn't exist, default it to false (off)
    if (timeAuto === undefined) {
      await threadsData.set(threadID, false, "settings.timeauto");
      timeAuto = false;
    }

    if (!["on", "off"].includes(args[0])) {
      return message.reply("Please use 'on' or 'off' as an argument.");
    }

    // Turn on or off time-based messages
    if (args[0] === "on") {
      await threadsData.set(threadID, true, "settings.timeauto");
      return message.reply("Time-based messages have been **enabled**.");
    } else {
      await threadsData.set(threadID, false, "settings.timeauto");
      return message.reply("Time-based messages have been **disabled**.");
    }
  }
};