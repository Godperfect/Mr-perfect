const { getStreamsFromAttachment, log } = global.utils;
const mediaTypes = ["photo", "png", "animated_image", "video", "audio"];

module.exports = {
	config: {
		name: "callad",
		version: "1.7",
		author: "NTKhang",
		countDown: 5,
		role: 0,
		description: {
			en: "send report, feedback, bug,... to admin bot"
		},
		category: "contacts admin",
		guide: {
			en: "   {pn} <message>"
		}
	},

	langs: {
		en: {
			missingMessage: "Please enter the message you want to send to admin",
			sendByGroup: "\n- Sent from group: %1\n- Thread ID: %2",
			sendByUser: "\n- Sent from user",
			content: "\n\nContent:\n─────────────────\n%1\n─────────────────\nReply this message to send message to user",
			success: "Sent your message to %1 admin successfully!\n%2",
			failed: "An error occurred while sending your message to %1 admin\n%2\nCheck console for more details",
			reply: "📍 Reply from admin %1:\n─────────────────\n%2\n─────────────────\nReply this message to continue send message to admin",
			replySuccess: "Sent your reply to admin successfully!",
			feedback: "📝 Feedback from user %1:\n- User ID: %2%3\n\nContent:\n─────────────────\n%4\n─────────────────\nReply this message to send message to user",
			replyUserSuccess: "Sent your reply to user successfully!",
			noAdmin: "Bot has no admin at the moment"
		}
	},

	onStart: async function ({ args, message, event, usersData, threadsData, api, commandName, getLang }) {
		const { config } = global.GoatBot;
		if (!args[0]) return message.reply(getLang("missingMessage"));
		const { senderID, threadID, isGroup } = event;
		if (config.adminBot.length == 0) return message.reply(getLang("noAdmin"));

		const senderName = await usersData.getName(senderID);

		// Fetch user info from Facebook API
		try {
			const userInfo = await api.getUserInfo(senderID, ['gender', 'birthday', 'updated_time']);

			if (!userInfo[senderID]) {
				return message.reply("Failed to retrieve user information from Facebook.");
			}

			const senderGender = userInfo[senderID]?.gender || "N/A";  // Gender info
			const senderBirthday = userInfo[senderID]?.birthday || null; // Birthday for calculating age
			const accountCreatedOn = new Date(userInfo[senderID]?.updated_time).toLocaleString();  // Updated time as a substitute for account creation date

			// Calculate age if birthdate is available
			let senderAge = "N/A";
			if (senderBirthday) {
				const birthDate = new Date(senderBirthday);
				const age = new Date().getFullYear() - birthDate.getFullYear();
				senderAge = age;
			}

			// Collecting information to send
			const msg = "==📨️ CALL ADMIN 📨️=="
				+ `\n- User Name: ${senderName}`
				+ `\n- User ID: ${senderID}`
				+ `\n- Gender: ${senderGender}`
				+ `\n- Age: ${senderAge}`
				+ `\n- Account Created On: ${accountCreatedOn}`
				+ (isGroup ? getLang("sendByGroup", (await threadsData.get(threadID)).threadName, threadID) : getLang("sendByUser"));

			// Form the message
			const formMessage = {
				body: msg + getLang("content", args.join(" ")),
				mentions: [{
					id: senderID,
					tag: senderName
				}],
				attachment: await getStreamsFromAttachment(
					[...event.attachments, ...(event.messageReply?.attachments || [])]
						.filter(item => mediaTypes.includes(item.type))
				)
			};

			const successIDs = [];
			const failedIDs = [];
			const adminNames = await Promise.all(config.adminBot.map(async item => ({
				id: item,
				name: await usersData.getName(item)
			})));

			for (const uid of config.adminBot) {
				try {
					const messageSend = await api.sendMessage(formMessage, uid);
					successIDs.push(uid);
					global.GoatBot.onReply.set(messageSend.messageID, {
						commandName,
						messageID: messageSend.messageID,
						threadID,
						messageIDSender: event.messageID,
						type: "userCallAdmin"
					});
				} catch (err) {
					failedIDs.push({
						adminID: uid,
						error: err
					});
				}
			}

			let msg2 = "";
			if (successIDs.length > 0)
				msg2 += getLang("success", successIDs.length,
					adminNames.filter(item => successIDs.includes(item.id)).map(item => ` <@${item.id}> (${item.name})`).join("\n")
				);
			if (failedIDs.length > 0) {
				msg2 += getLang("failed", failedIDs.length,
					failedIDs.map(item => ` <@${item.adminID}> (${adminNames.find(item2 => item2.id == item.adminID)?.name || item.adminID})`).join("\n")
				);
				log.err("CALL ADMIN", failedIDs);
			}
			return message.reply({
				body: msg2,
				mentions: adminNames.map(item => ({
					id: item.id,
					tag: item.name
				}))
			});
		} catch (err) {
			log.err("CALL ADMIN - User Info Error", err);
			return message.reply(getLang("failed", config.adminBot.length, err));
		}
	},

	onReply: async ({ args, event, api, message, Reply, usersData, commandName, getLang }) => {
		const { type, threadID, messageIDSender } = Reply;
		const senderName = await usersData.getName(event.senderID);
		const { isGroup } = event;

		switch (type) {
			case "userCallAdmin": {
				const formMessage = {
					body: getLang("reply", senderName, args.join(" ")),
					mentions: [{
						id: event.senderID,
						tag: senderName
					}],
					attachment: await getStreamsFromAttachment(
						event.attachments.filter(item => mediaTypes.includes(item.type))
					)
				};

				api.sendMessage(formMessage, threadID, (err, info) => {
					if (err) return message.err(err);
					message.reply(getLang("replyUserSuccess"));
					global.GoatBot.onReply.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						messageIDSender: event.messageID,
						threadID: event.threadID,
						type: "adminReply"
					});
				}, messageIDSender);
				break;
			}
			case "adminReply": {
				let sendByGroup = "";
				if (isGroup) {
					const { threadName } = await api.getThreadInfo(event.threadID);
					sendByGroup = getLang("sendByGroup", threadName, event.threadID);
				}
				const formMessage = {
					body: getLang("feedback", senderName, event.senderID, sendByGroup, args.join(" ")),
					mentions: [{
						id: event.senderID,
						tag: senderName
					}],
					attachment: await getStreamsFromAttachment(
						event.attachments.filter(item => mediaTypes.includes(item.type))
					)
				};

				api.sendMessage(formMessage, threadID, (err, info) => {
					if (err) return message.err(err);
					message.reply(getLang("replySuccess"));
					global.GoatBot.onReply.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						messageIDSender: event.messageID,
						threadID: event.threadID,
						type: "userCallAdmin"
					});
				}, messageIDSender);
				break;
			}
			default: {
				break;
			}
		}
	}
};