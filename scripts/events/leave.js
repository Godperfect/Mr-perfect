const { getTime, drive } = global.utils;

module.exports = {
  config: {
    name: "leave",
    version: "1.4",
    author: "NTKhang",
    category: "events"
  },

  langs: {
    vi: {
      session1: "sáng",
      session2: "trưa",
      session3: "chiều",
      session4: "tối",
      leaveType1: "tự rời",
      leaveType2: "bị kick",
      defaultLeaveMessage: "{userName} đã {type} khỏi nhóm"
    },
    en: {
      session1: "morning",
      session2: "noon",
      session3: "afternoon",
      session4: "evening",
      leaveType1: "left",
      leaveType2: "was kicked from",
      defaultLeaveMessage: "{userName} {type} the group"
    }
  },

  onStart: async ({ threadsData, message, event, api, usersData, getLang }) => {
    if (event.logMessageType !== "log:unsubscribe") return;

    try {
      const { threadID } = event;
      const threadData = await threadsData.get(threadID);
      if (!threadData.settings.sendLeaveMessage) return;

      const { leftParticipantFbId } = event.logMessageData;
      if (leftParticipantFbId === api.getCurrentUserID()) return;

      const hours = getTime("HH");
      const threadName = threadData.threadName;
      const userName = await usersData.getName(leftParticipantFbId);

      // Get custom or default leave message
      let { leaveMessage = getLang("defaultLeaveMessage") } = threadData.data;

      // Formulate the message
      let form = {
        mentions: leaveMessage.includes("{userNameTag}") ? [{
          tag: userName,
          id: leftParticipantFbId
        }] : null,
        body: leaveMessage
          .replace(/\{userName\}|\{userNameTag\}/g, userName)
          .replace(/\{type\}/g, leftParticipantFbId === event.author ? getLang("leaveType1") : getLang("leaveType2"))
          .replace(/\{threadName\}|\{boxName\}/g, threadName)
          .replace(/\{time\}/g, hours)
          .replace(/\{session\}/g, getSession(hours))
      };

      // Attachments (if any)
      if (threadData.data.leaveAttachment) {
        const attachments = await loadAttachments(threadData.data.leaveAttachment);
        if (attachments.length > 0) form.attachment = attachments;
      }

      // Send the message
      message.send(form);
    } catch (err) {
      console.error("Error in leave event:", err);
    }
  }
};

// Helper function to determine the session of the day based on hours
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