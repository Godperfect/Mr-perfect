if (!global.client.busyList) global.client.busyList = {}; // Initialize the busy list if it doesn't exist

module.exports = {
	config: {
		name: "busy",
		version: "1.6",
		author: "NTKhang",
		countDown: 5,
		role: 0,
		description: {
			en: "turn on do not disturb mode, when you are tagged bot will notify"
		},
		category: "box chat",
		guide: {
			en: "   {pn} [empty | <time> <reason>]: turn on do not disturb mode"
				+ "\n   {pn} off: turn off do not disturb mode"
		}
	},

	langs: {
		en: {
			turnedOff: "✅ | Do not disturb mode has been turned off",
			turnedOn: "✅ | Do not disturb mode has been turned on",
			turnedOnWithReason: "✅ | Do not disturb mode has been turned on with reason: %1",
			turnedOnWithoutReason: "✅ | Do not disturb mode has been turned on",
			alreadyOn: "User %1 is currently busy",
			alreadyOnWithReason: "User %1 is currently busy with reason: %2",
			timeUp: "Hey %1, your do not disturb time is up! You are now free!",
			busyStatus: "Do Not Disturb Mode is active:\nUID: %1\nFrom: %2\nUpto: %3\nReason: %4",
			remainingTime: "You have %1 hours, %2 minutes, and %3 seconds left on Do Not Disturb. Reason: %4"
		}
	},

	onStart: async function ({ args, message, event, getLang, usersData }) {
		const { senderID } = event;

		// Check if the user is turning off the busy mode
		if (args[0] == "off") {
			const { data } = await usersData.get(senderID);
			delete data.busy; // Remove the busy status
			clearTimeout(global.client.busyList[senderID]); // Clear the timer
			await usersData.set(senderID, data, "data");
			return message.reply(getLang("turnedOff"));
		}

		// Parse the time duration and reason from the arguments
		let hours = 0, minutes = 0, seconds = 0, reason = '';

		// Regular expression to extract hours, minutes, and seconds from the message
		const timeRegex = /(\d+)\s*(hour|minute|second)/gi;
		let match;
		while ((match = timeRegex.exec(args.join(" "))) !== null) {
			const value = parseInt(match[1], 10);
			const unit = match[2].toLowerCase();
			if (unit === 'hour') hours = value;
			if (unit === 'minute') minutes = value;
			if (unit === 'second') seconds = value;
		}

		// Get the reason (the rest of the message after the time)
		reason = args.join(" ").replace(timeRegex, "").trim();

		// Calculate the total duration in milliseconds
		const busyDuration = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;

		// Store the time when the user starts the busy mode
		const startTime = Date.now();
		await usersData.set(senderID, startTime, "data.busyStartTime");
		await usersData.set(senderID, reason, "data.busy");

		// Set a timer to notify the user when the "Do Not Disturb" time is up
		global.client.busyList[senderID] = setTimeout(() => {
			message.reply(getLang("timeUp", `@${event.senderName}`)); // Notify the user when the time is up
		}, busyDuration);

		// Calculate the time "upto" (end time)
		const uptoTime = new Date(startTime + busyDuration);
		const uptoTimeString = uptoTime.toLocaleString();

		// Notify the user about their Do Not Disturb status
		return message.reply(
			reason ?
				getLang("turnedOnWithReason", reason) :
				getLang("turnedOnWithoutReason") +
				`\n${getLang("remainingTime", hours, minutes, seconds, reason)}`
		);
	},

	onChat: async ({ event, message, getLang }) => {
		const { mentions } = event;

		// If no one is tagged, do nothing
		if (!mentions || Object.keys(mentions).length == 0) return;

		const arrayMentions = Object.keys(mentions);

		// Loop through all the mentioned users
		for (const userID of arrayMentions) {
			const reasonBusy = global.db.allUserData.find(item => item.userID == userID)?.data.busy || false;
			if (reasonBusy !== false) {
				// Get the start and end times for the busy status
				const startTime = global.db.allUserData.find(item => item.userID == userID)?.data.busyStartTime || 0;
				const endTime = startTime + (reasonBusy ? 1 * 60 * 60 * 1000 : 0); // Assuming 1 hour duration if not specified
				const endTimeString = new Date(endTime).toLocaleString();

				// Notify with the Do Not Disturb status
				return message.reply(
					getLang("busyStatus", userID, new Date(startTime).toLocaleString(), endTimeString, reasonBusy)
				);
			}
		}
	}
};