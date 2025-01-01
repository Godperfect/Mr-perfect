module.exports = {
  config: {
    name: "prefix",
    version: "1.1",
    author: "Tokodori_Frtiz", //remodified by cliff
    countDown: 5,
    role: 0,
    shortDescription: "Display bot's prefix",
    longDescription: "Shows the bot's prefix with a cool style and animated response",
    category: "auto 🪐",
  },

  onStart: async function () {},

  onChat: async function ({ event, message, getLang }) {
    if (event.body && event.body.toLowerCase() === "prefix") {
      return message.reply({
        body: `

✨  Prefix Command  ✨

🚀 My prefix is  +  . Use it to interact with me!

Example: +help, +info, and much more!

⚡ Stay tuned for more cool updates! 🌌

        `,
        attachment: await global.utils.getStreamFromURL("https://i.imgur.com/M4luPbE.gif"),
      });
    }
  },
};