import { Server } from "socket.io";
import { User } from "../models/userModel.js";

const userSocketMap = {}; // userId -> socketId
let _io = null;

export const getReceiverSocketId = (receiverId) => {
  return userSocketMap[String(receiverId)];
};

export const emitToUser = (userId, event, data) => {
  if (_io && userId) {
    _io.to(String(userId)).emit(event, data);
  }
};

export const initSocket = (httpServer) => {
  _io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://chat-app-neon-nine-41.vercel.app",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // ✅ EVERYTHING MUST BE INSIDE HERE
  _io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId
      ? String(socket.handshake.query.userId)
      : "";

    if (userId && userId !== "undefined") {
      userSocketMap[userId] = socket.id;
      socket.join(userId);

      User.findByIdAndUpdate(userId, { isOnline: true }).catch(console.error);

      _io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }

    socket.on("typing", ({ to, from }) => {
      const receiverSocketId = userSocketMap[String(to)];
      if (receiverSocketId) {
        _io.to(receiverSocketId).emit("typing", { from });
      }
    });

    socket.on("stopTyping", ({ to, from }) => {
      const receiverSocketId = userSocketMap[String(to)];
      if (receiverSocketId) {
        _io.to(receiverSocketId).emit("stopTyping", { from });
      }
    });

    socket.on("screenshotTaken", ({ to }) => {
      const receiverSocketId = userSocketMap[String(to)];
      if (receiverSocketId) {
        _io.to(receiverSocketId).emit("screenshotAlert", { from: userId });
      }
    });

    socket.on("privacyUpdated", ({ userId, privacy }) => {
      socket.broadcast.emit("userPrivacyUpdated", {
        userId,
        privacy,
      });
    });

    socket.on("profileUpdated", ({ userId, fullName, bio, profilePhoto }) => {
      socket.broadcast.emit("userProfileUpdated", {
        userId,
        fullName,
        bio,
        profilePhoto,
      });
    });

    socket.on("messageRead", ({ messageId, senderId }) => {
      const sid = getReceiverSocketId(senderId);
      if (sid) _io.to(sid).emit("messageRead", { messageId });
    });

    socket.on("messageEdited", ({ messageId, newMessage, receiverId }) => {
      const sid = getReceiverSocketId(receiverId);
      if (sid) _io.to(sid).emit("messageEdited", { messageId, newMessage });
    });

    socket.on(
      "messageDeleted",
      ({ messageId, receiverId, deleteForEveryone }) => {
        const sid = getReceiverSocketId(receiverId);
        if (sid)
          _io.to(sid).emit("messageDeleted", {
            messageId,
            deleteForEveryone,
          });
      }
    );

    socket.on(
      "reactionAdded",
      ({ messageId, receiverId, emoji, reactorId, reactions }) => {
        const sid = getReceiverSocketId(receiverId);
        if (sid) {
          _io.to(sid).emit("reactionAdded", {
            messageId,
            emoji,
            reactorId,
            ...(reactions ? { reactions } : {}),
          });
        }
      }
    );

    socket.on("disconnect", async () => {
      if (userId && userSocketMap[userId] === socket.id) {
        delete userSocketMap[userId];

        try {
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });

          socket.broadcast.emit("userLastSeenUpdated", {
            userId,
            lastSeen: new Date(),
          });
        } catch (err) {
          console.error(err);
        }
      }

      _io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });

  return _io;
};