const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "accept",
    aliases: ["acp"],
    version: "1.1",
    author: "Mr-perfect",
    countDown: 8,
    role: 2,
    shortDescription: "accept users",
    longDescription: "accept users and store request data",
    category: "Utility",
    nonPrefix: true,
  },

  onStart: async function ({ event, api, commandName }) {
    return;
  },

  onChat: async function ({ event, api, commandName }) {
    if (event.body.toLowerCase() === "fbrequests" ||
        event.body.toLowerCase() === "acp" || 
        event.body.toLowerCase() === "accept") {

      const form = {
        av: api.getCurrentUserID(),
        fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
        fb_api_caller_class: "RelayModern",
        doc_id: "4499164963466303",
        variables: JSON.stringify({ input: { scale: 3 } }),
      };

      const listRequest = JSON.parse(
        await api.httpPost("https://www.facebook.com/api/graphql/", form)
      ).data.viewer.friending_possibilities.edges;

      let msg = "";
      const friendRequests = [];

      for (const user of listRequest) {
        const requestDate = moment(user.time * 1000).tz("Asia/Kathmandu");
        const userInfo = {
          name: user.node.name,
          profileLink: user.node.url.replace("www.facebook", "fb"),
          date: requestDate.format("DD/MM/YYYY"),
          time: requestDate.format("hh:mm:ss A"),
        };

        const existingIndex = friendRequests.findIndex(req => req.profileLink === userInfo.profileLink);

        if (existingIndex !== -1) {
          friendRequests[existingIndex] = userInfo;
        } else {
          friendRequests.push(userInfo);
        }

        msg += `------------------\nName: ${user.node.name}\n`
          + `Profile: ${user.node.url.replace("www.facebook", "fb")}\n`
          + `Date: ${requestDate.format("DD/MM/YYYY")}\n`
          + `Time: ${requestDate.format("hh:mm:ss A")}\n`;
      }

      const requestFilePath = path.join(__dirname, 'json-files/friend_requests.json');
      fs.writeFileSync(requestFilePath, JSON.stringify(friendRequests, null, 2));

      api.sendMessage(
        `${msg}\nReply to this message with content: <add | del> <comparison | or "all"> to take action`,
        event.threadID,
        (e, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            listRequest,
            author: event.senderID,
            unsendTimeout: setTimeout(() => {
              api.unsendMessage(info.messageID);
            }, this.config.countDown * 20000),
          });
        },
        event.messageID
      );
    }
  },

  onReply: async function ({ message, Reply, event, api, commandName }) {
    const { author, listRequest, messageID } = Reply;
    if (author !== event.senderID) return;
    const args = event.body.replace(/ +/g, " ").toLowerCase().split(" ");

    clearTimeout(Reply.unsendTimeout);

    const form = {
      av: api.getCurrentUserID(),
      fb_api_caller_class: "RelayModern",
      variables: {
        input: {
          source: "friends_tab",
          actor_id: api.getCurrentUserID(),
          client_mutation_id: Math.round(Math.random() * 19).toString(),
        },
        scale: 3,
        refresh_num: 0,
      },
    };

    let action = args[0];
    let targetIDs = args.slice(1);

    if (action !== "add" && action !== "del") {
      api.sendMessage("Invalid action. Please use 'add' or 'del'.", event.threadID);
      return api.unsendMessage(messageID);
    }

    if (action === "add") {
      form.fb_api_req_friendly_name = "FriendingCometFriendRequestConfirmMutation";
      form.doc_id = "3147613905362928";
    } else if (action === "del") {
      form.fb_api_req_friendly_name = "FriendingCometFriendRequestDeleteMutation";
      form.doc_id = "4108254489275063";
    }

    if (targetIDs[0] === "all") {
      targetIDs = [];
      const lengthList = listRequest.length;
      for (let i = 1; i <= lengthList; i++) targetIDs.push(i);
    }

    if (targetIDs.length === 0) {
      api.sendMessage("Please specify the target users (e.g., 'add 1' or 'del 2').", event.threadID);
      return api.unsendMessage(messageID);
    }

    const newTargetIDs = [];
    const promiseFriends = [];
    const success = [];
    const failed = [];

    for (const stt of targetIDs) {
      const u = listRequest[parseInt(stt) - 1];
      if (!u) {
        failed.push(`Can't find stt ${stt} in the list`);
        continue;
      }
      form.variables.input.friend_requester_id = u.node.id;
      form.variables = JSON.stringify(form.variables);
      newTargetIDs.push(u);
      promiseFriends.push(api.httpPost("https://www.facebook.com/api/graphql/", form));
      form.variables = JSON.parse(form.variables);
    }

    const lengthTarget = newTargetIDs.length;
    for (let i = 0; i < lengthTarget; i++) {
      try {
        const friendRequest = await promiseFriends[i];
        if (JSON.parse(friendRequest).errors) {
          failed.push(newTargetIDs[i].node.name);
        } else {
          success.push(newTargetIDs[i].node.name);

          const approvedByName = await api.getUserInfo(event.senderID);
          const approvedByUser = approvedByName[event.senderID];
          const approvedByUID = approvedByUser ? approvedByUser.id : "Unknown UID";

          const adminID = "61569230323940";
          const userInfo = newTargetIDs[i].node;
          const timeAccepted = moment().tz("Asia/kathmandu").format("DD/MM/YYYY hh:mm:ss A");

          api.sendMessage(
            `Friend request accepted:\n- Name: ${userInfo.name}\n- Uid: ${userInfo.id}\n- Time: ${timeAccepted}\n- By: ${approvedByUser.name}\n- Thread ID: ${event.threadID}`,
            adminID
          );

          api.sendMessage(
            `Hey ${userInfo.name},\n\nYour friend request has been approved by:\n` +
            `Name: ${approvedByUser.name}\n` +
            `UID: ${approvedByUID}\n` +
            `Time: ${timeAccepted}`,
            userInfo.id
          );
        }
      } catch (e) {
        failed.push(newTargetIDs[i].node.name);
      }
    }

    if (success.length > 0) {
      api.sendMessage(
        `» The ${
          action === "add" ? "friend request" : "friend request deletion"
        } has been processed for ${success.length} people:\n\n${success.join(
          "\n"
        )}${
          failed.length > 0
            ? `\n» The following ${failed.length} people encountered errors: ${failed.join(
                "\n"
              )}`
            : ""
        }`,
        event.threadID,
        event.messageID
      );
    } else {
      api.unsendMessage(messageID);
      return api.sendMessage(
        "Invalid response. Please provide a valid response.",
        event.threadID
      );
    }

    api.unsendMessage(messageID);
  },
};