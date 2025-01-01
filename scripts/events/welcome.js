const { getTime, drive } = global.utils;

if (!global.temp.welcomeEvent) global.temp.welcomeEvent = {};

module.exports = {
  config: {
    name: "welcome",
    version: "1.7",
    author: "NTKhang",
    category: "events"
  },

  langs: {
    vi: {
      session1: "sáng",
      session2: "trưa",
      session3: "chiều",
      session4: "tối",
      welcomeMessage: "Cảm ơn bạn đã mời tôi vào nhóm!\nPrefix bot: %1\nĐể xem danh sách lệnh hãy nhập: %1help",
      multiple1: "bạn",
      multiple2: "các bạn",
      defaultWelcomeMessage: "Xin chào {userName}.\nChào mừng bạn đến với {boxName}.\nChúc bạn có buổi {session} vui vẻ!"
    },
    en: {
      session1: "morning",
      session2: "noon",
      session3: "afternoon",
      session4: "evening",
      session5: "night",
      welcomeMessage: "Thank you for inviting me to the group!\nBot prefix: %1\nTo view the list of commands, please enter: %1help",
      multiple1: "you",
      multiple2: "you guys",
      defaultWelcomeMessage: `Hello {userName}.\nWelcome {multiple} to the chat group: {boxName}\nHave a nice {session} 😊`
    }
  },

  onStart: async ({ threadsData, message, event, api, getLang }) => {
    try {
      if (event.logMessageType === "log:subscribe") {
        return async function () {
          const hours = getTime("HH");
          const { threadID } = event;
          const { nickNameBot } = global.GoatBot.config;
          const prefix = global.utils.getPrefix(threadID);
          const dataAddedParticipants = event.logMessageData.addedParticipants;

          // If new member is bot
          if (dataAddedParticipants.some((item) => item.userFbId === api.getCurrentUserID())) {
            if (nickNameBot) api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());
            return message.send(getLang("welcomeMessage", prefix));
          }

          // If new member(s) joined:
          if (!global.temp.welcomeEvent[threadID]) {
            global.temp.welcomeEvent[threadID] = { joinTimeout: null, dataAddedParticipants: [] };
          }

          // Add new participants to the array
          global.temp.welcomeEvent[threadID].dataAddedParticipants.push(...dataAddedParticipants);

          // Clear previous timeout if set
          clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

          // Set new timeout to send welcome message
          global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async function () {
            const threadData = await threadsData.get(threadID);
            if (threadData.settings.sendWelcomeMessage === false) return;

            const dataAddedParticipants = global.temp.welcomeEvent[threadID].dataAddedParticipants;
            const dataBanned = threadData.data.banned_ban || [];
            const threadName = threadData.threadName;
            const userName = [];
            const mentions = [];
            let multiple = false;

            if (dataAddedParticipants.length > 1) multiple = true;

            // Filter out banned users
            const validUsers = dataAddedParticipants.filter(user =>
              !dataBanned.some(banned => banned.id === user.userFbId)
            );

            validUsers.forEach(user => {
              userName.push(user.fullName);
              mentions.push({ tag: user.fullName, id: user.userFbId });
            });

            if (userName.length === 0) return;

            let { welcomeMessage = getLang("defaultWelcomeMessage") } = threadData.data;
            const session = getSession(hours);

            welcomeMessage = welcomeMessage
              .replace(/\{userName\}|\{userNameTag\}/g, userName.join(", "))
              .replace(/\{boxName\}|\{threadName\}/g, threadName)
              .replace(/\{multiple\}/g, multiple ? getLang("multiple2") : getLang("multiple1"))
              .replace(/\{session\}/g, session);

            const form = {
              mentions: welcomeMessage.match(/\{userNameTag\}/g) ? mentions : null,
              body: welcomeMessage
            };

            if (threadData.data.welcomeAttachment) {
              const files = threadData.data.welcomeAttachment;
              const attachments = await loadAttachments(files);
              if (attachments.length > 0) form.attachment = attachments;
            }

            message.send(form);
            delete global.temp.welcomeEvent[threadID];
          }, 1500);
        };
      }
    } catch (err) {
      console.error("Error in welcome event:", err);
    }
  }
};

// Helper function to get the session of the day based on the time of day
function getSession(hours) {
  if (hours >= 5 && hours < 10) return "morning";
  if (hours >= 10 && hours < 12) return "noon";
  if (hours >= 12 && hours < 18) return "afternoon";
  if (hours >= 18 && hours < 22) return "evening";
  return "night";
}

// Helper function to load attachments
async function loadAttachments(files) {
  try {
    const attachments = await Promise.allSettled(files.map(file => drive.getFile(file, "stream")));
    return attachments.filter(({ status }) => status === "fulfilled").map(({ value }) => value);
  } catch (error) {
    console.error("Error loading attachments:", error);
    return [];
  }
}