const { getTime } = global.utils;

module.exports = {
  config: {
    name: "autoTime",
    version: "1.0",
    author: "NTKhang",
    category: "events"
  },

  onStart: async ({ threadsData, message, event, api, getLang }) => {
    const { threadID } = event;
    const threadData = await threadsData.get(threadID);

    // If auto time is not enabled, don't proceed
    if (!threadData.data.autoTimeEnabled) {
      return;
    }

    // Get the current time in Kathmandu (Nepal Time, UTC +5:45)
    const currentDate = new Date();
    const kathmanduTime = new Date(currentDate.toLocaleString("en-US", { timeZone: "Asia/Kathmandu" }));
    const currentHour = kathmanduTime.getHours();
    const currentMinute = kathmanduTime.getMinutes();

    // Format hour to 12-hour AM/PM format
    const hourIn12HrFormat = currentHour % 12 || 12; // Converts 0 (midnight) to 12
    const ampm = currentHour >= 12 ? "PM" : "AM";

    const routineMessages = [
      { hour: 7, message: `It's 7 AM in Kathmandu, time for breakfast!` },
      { hour: 8, message: `It's 8 AM, a good time for a morning walk!` },
      { hour: 9, message: `It's 9 AM, let's dive into work or studies!` },
      { hour: 10, message: `It's 10 AM, perfect for a short break!` },
      { hour: 11, message: `It's 11 AM, maybe a good time for a snack?` },
      { hour: 12, message: `It's 12 PM! Time for lunch.` },
      { hour: 13, message: `It's 1 PM, time for lunch!` },
      { hour: 14, message: `It's 2 PM, how about a little break?` },
      { hour: 15, message: `It's 3 PM, perfect time for some tea or coffee.` },
      { hour: 16, message: `It's 4 PM, don't forget to stretch!` },
      { hour: 17, message: `It's 5 PM, time to wind down a bit.` },
      { hour: 18, message: `It's 6 PM, time for dinner!` },
      { hour: 19, message: `It's 7 PM, a great time to relax after dinner.` },
      { hour: 20, message: `It's 8 PM, start getting ready for bed.` },
      { hour: 21, message: `It's 9 PM, time to relax and unwind for the night.` },
      { hour: 22, message: `It's 10 PM, let's start wrapping up for the day.` },
      { hour: 23, message: `It's 11 PM, it's late, time to prepare for bed.` },
      { hour: 0, message: `It's midnight (12 AM), time to rest and recharge for tomorrow.` },
    ];

    // Find the message that corresponds to the current hour
    const nextRoutine = routineMessages.find(msg => msg.hour === currentHour);

    if (nextRoutine) {
      // Send the message
      message.send(nextRoutine.message);

      // Set a timeout to send the next message in 1 hour
      setTimeout(() => {
        this.onStart({ threadsData, message, event, api, getLang });
      }, 3600000); // 1 hour = 3600000 ms
    } else {
      // If no routine is found for the current hour, check again after 1 hour
      setTimeout(() => {
        this.onStart({ threadsData, message, event, api, getLang });
      }, 3600000); // Check again in 1 hour
    }
  }
};