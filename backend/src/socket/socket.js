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
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  _io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId
  ? String(socket.handshake.query.userId)
  : "";

if (userId && userId !== "undefined") {
  userSocketMap[userId] = socket.id;

  socket.join(userId);

  User.findByIdAndUpdate(userId, {
    isOnline: true,
  }).catch((error) => {
    console.error("socket online update:", error);
  });

  _io.emit("getOnlineUsers", Object.keys(userSocketMap));
}

    // Typing indicators
    socket.on("typing", ({ to, from }) => {
      const senderId = from ? String(from) : userId;
      const receiverId = to ? String(to) : "";

      if (!senderId || !receiverId) return;

      const receiverSocketId = userSocketMap[receiverId];

      if (receiverSocketId) {
        _io.to(receiverSocketId).emit("typing", {
          from: senderId,
        });
      }
    });

    socket.on("stopTyping", ({ to, from }) => {
      const senderId = from ? String(from) : userId;
      const receiverId = to ? String(to) : "";

      if (!senderId || !receiverId) return;

      const receiverSocketId = userSocketMap[receiverId];

      if (receiverSocketId) {
        _io.to(receiverSocketId).emit("stopTyping", {
          from: senderId,
        });
      }
    });
        // Screenshot detection relay
    socket.on("screenshotTaken", ({ to }) => {
      if (!to) return;
      const receiverSocketId = userSocketMap[String(to)];
      if (receiverSocketId) {
        _io.to(receiverSocketId).emit("screenshotAlert", { from: userId });
      }
    });


    socket.on("privacyUpdated", ({ userId, privacy }) => {
      if (!userId || !privacy) return;

      socket.broadcast.emit("userPrivacyUpdated", {
        userId,
        privacy,
      });
    });
    // ProfileUpdate
    socket.on("profileUpdated", ({ userId, fullName, bio, profilePhoto }) => {
      if (!userId) return;

      socket.broadcast.emit("userProfileUpdated", {
        userId,
        fullName,
        bio,
        profilePhoto,
      });
    });

    // Message read receipt
    socket.on("messageRead", ({ messageId, senderId }) => {
      const sid = getReceiverSocketId(senderId);
      if (sid) _io.to(sid).emit("messageRead", { messageId });
    });

    // Message edited relay
    socket.on("messageEdited", ({ messageId, newMessage, receiverId }) => {
      const sid = getReceiverSocketId(receiverId);
      if (sid) _io.to(sid).emit("messageEdited", { messageId, newMessage });
    });

    // Message deleted relay
    socket.on(
      "messageDeleted",
      ({ messageId, receiverId, deleteForEveryone }) => {
        const sid = getReceiverSocketId(receiverId);
        if (sid)
          _io.to(sid).emit("messageDeleted", { messageId, deleteForEveryone });
      },
    );

    // Reaction relay
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
      },
    );

   socket.on("disconnect", async () => {
  if (userId && userSocketMap[userId] === socket.id) {
    delete userSocketMap[userId];

    const lastSeen = new Date();

    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen,
      });

      socket.broadcast.emit("userLastSeenUpdated", {
        userId,
        lastSeen,
      });
    } catch (error) {
      console.error("socket disconnect lastSeen update:", error);
    }
  }

  _io.emit("getOnlineUsers", Object.keys(userSocketMap));
});
  });

  return _io;
};
