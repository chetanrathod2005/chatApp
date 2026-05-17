import { Message } from "../models/messageModel.js";
import { Conversation } from "../models/conversationModel.js";
import { User } from "../models/userModel.js";
import { emitToUser } from "../socket/socket.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Send Message ─────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;
    const { message, encryptedContent } = req.body;

    // Check if sender is blocked by receiver
    const receiver = await User.findById(receiverId).select("blockedUsers");
    if (receiver?.blockedUsers?.map((id) => id.toString()).includes(senderId)) {
      return res.status(403).json({ message: "You are blocked by this user" });
    }

    let mediaUrl = "";
    let mediaType = "";
    let mediaName = "";

    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
      const ext = path.extname(req.file.originalname).toLowerCase();
      mediaName = req.file.originalname;
      if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext))
        mediaType = "image";
      else if ([".mp4", ".webm", ".ogg"].includes(ext)) mediaType = "video";
      else if ([".mp3", ".wav"].includes(ext)) mediaType = "audio";
      else mediaType = "file";
    }

    let parsedEncrypted = { senderCipher: "", receiverCipher: "", iv: "" };
    if (encryptedContent) {
      try {
        parsedEncrypted =
          typeof encryptedContent === "string"
            ? JSON.parse(encryptedContent)
            : encryptedContent;
      } catch (_) {}
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      message: message || "",
      mediaUrl,
      mediaType,
      mediaName,
      encryptedContent: parsedEncrypted,
      delivered: true,
    });

    // Upsert conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        messages: [newMessage._id],
        unreadCount: { [receiverId]: 1 },
        lastMessage: newMessage._id,
      });
    } else {
      conversation.messages.push(newMessage._id);
      conversation.lastMessage = newMessage._id;
      const currentUnread = conversation.unreadCount.get(receiverId) || 0;
      conversation.unreadCount.set(receiverId, currentUnread + 1);
      await conversation.save();
    }

    // Emit new message to receiver in real-time
    emitToUser(receiverId, "newMessage", newMessage);

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error("sendMessage:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Get Messages ─────────────────────────────────────────────────────────────
export const getMessages = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    }).populate("messages");

    if (!conversation) return res.status(200).json([]);

    // Reset unread count for current user
    conversation.unreadCount.set(senderId, 0);
    await conversation.save();

    const seenMessages = conversation.messages.filter((msg) => {
      const msgSenderId =
        typeof msg.senderId === "object"
          ? msg.senderId.toString()
          : msg.senderId.toString();
      const msgReceiverId =
        typeof msg.receiverId === "object"
          ? msg.receiverId.toString()
          : msg.receiverId.toString();

      return (
        msgSenderId === receiverId.toString() &&
        msgReceiverId === senderId.toString() &&
        !msg.seen
      );
    });

    const seenMessageIds = seenMessages.map((msg) => msg._id);
const currentUser = await User.findById(senderId);
const canSendReadReceipts =
  currentUser?.privacy?.readReceipts !== false;
  if (seenMessageIds.length > 0 && canSendReadReceipts) {
      await Message.updateMany(
        { _id: { $in: seenMessageIds } },
        {
          $set: {
            seen: true,
            delivered: true,
            seenAt: new Date(),
          },
        },
      );

      emitToUser(receiverId, "messagesSeen", {
        seenBy: senderId,
        messageIds: seenMessageIds,
      });
    }

    // await Message.updateMany(
    //   {
    //     _id: { $in: conversation.messages },
    //     senderId: receiverId,
    //     receiverId: senderId,
    //     seen: false,
    //   },
    //   {
    //     $set: {
    //       seen: true,
    //       seenAt: new Date(),
    //       delivered: true,
    //     },
    //   },
    // );

    // emitToUser(receiverId, "messagesSeen", {
    //   seenBy: senderId,
    // });

    // Filter messages deleted for this user
    const messages = conversation.messages.filter(
  (msg) =>
    !msg.deletedFor?.some((id) => id.toString() === String(senderId)) &&
    !msg.isDeletedForEveryone,
);

return res.status(200).json(
  messages.map(msg => ({
    ...msg.toObject(),
    pinnedBy: msg.pinnedBy || []
  }))
);
  } catch (error) {
    console.error("getMessages:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const markMessagesSeen = async (req, res) => {
  try {
    const currentUserId = req.id;
    const otherUserId = req.params.id;

    const unseenMessages = await Message.find({
      senderId: otherUserId,
      receiverId: currentUserId,
      seen: false,
    }).select("_id");

    const messageIds = unseenMessages.map((msg) => msg._id);

    if (messageIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: messageIds } },
        {
          $set: {
            seen: true,
            delivered: true,
            seenAt: new Date(),
          },
        }
      );

      emitToUser(otherUserId, "messagesSeen", {
        seenBy: currentUserId,
        messageIds,
      });
    }

    return res.status(200).json({
      success: true,
      messageIds,
    });
  } catch (error) {
    console.error("markMessagesSeen:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ─── Edit Message ─────────────────────────────────────────────────────────────
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const userId = req.id;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });
    if (msg.senderId.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    msg.message = message;
    msg.isEdited = true;
    await msg.save();

    // Notify receiver
    emitToUser(msg.receiverId.toString(), "messageEdited", {
      messageId,
      newMessage: message,
      editedAt: msg.updatedAt,
    });

    return res.status(200).json(msg);
  } catch (error) {
    console.error("editMessage:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Delete Message ───────────────────────────────────────────────────────────
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;
    const userId = req.id;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    if (deleteForEveryone && msg.senderId.toString() === userId) {
      msg.isDeletedForEveryone = true;
      msg.message = "";
      msg.mediaUrl = "";
    } else {
      if (!msg.deletedFor.map((id) => id.toString()).includes(userId)) {
        msg.deletedFor.push(userId);
      }
    }
    await msg.save();

    if (deleteForEveryone) {
      emitToUser(msg.receiverId.toString(), "messageDeleted", {
        messageId,
        deleteForEveryone: true,
      });
    }

    return res
      .status(200)
      .json({ success: true, deleteForEveryone: !!deleteForEveryone });
  } catch (error) {
    console.error("deleteMessage:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── React to Message ─────────────────────────────────────────────────────────
export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.id;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const existingIdx = msg.reactions.findIndex(
      (r) => r.userId.toString() === userId,
    );

    if (existingIdx !== -1) {
      if (msg.reactions[existingIdx].emoji === emoji) {
        msg.reactions.splice(existingIdx, 1);
      } else {
        msg.reactions[existingIdx].emoji = emoji;
      }
    } else {
      msg.reactions.push({ userId, emoji });
    }

    await msg.save();

    // Notify the other party
    const otherId =
      msg.senderId.toString() === userId
        ? msg.receiverId.toString()
        : msg.senderId.toString();
    emitToUser(otherId, "reactionAdded", {
      messageId,
      emoji,
      reactorId: userId,
      reactions: msg.reactions,
    });

    return res.status(200).json(msg.reactions);
  } catch (error) {
    console.error("reactToMessage:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Get Conversations (sidebar: last message + unread count) ─────────────────
export const getConversations = async (req, res) => {
  try {
    const userId = req.id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "-password")
      .populate({
        path: "lastMessage",
        select:
          "message mediaType mediaUrl createdAt senderId isDeletedForEveryone deletedFor",
      })
      .sort({ updatedAt: -1 });

    const result = conversations
      .filter((conv) => {
        const lastMessage = conv.lastMessage;

        if (!lastMessage) return false;

        const deletedForMe = lastMessage.deletedFor?.some(
          (id) => id.toString() === userId,
        );

        return !deletedForMe && !lastMessage.isDeletedForEveryone;
      })
      .map((conv) => {
        const other = conv.participants.find(
          (p) => p._id.toString() !== userId,
        );

        return {
          user: other,
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount.get(userId) || 0,
        };
      });

    return res.status(200).json(result);
  } catch (error) {
    console.error("getConversations:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const deleteChatForMe = async (req, res) => {
  try {
    const userId = req.id;
    const otherUserId = req.params.id;

    await Message.updateMany(
      {
        $or: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      {
        $addToSet: {
          deletedFor: userId,
        },
      },
    );

  const conversation = await Conversation.findOne({
      participants: { $all: [userId, otherUserId] },
    });

    if (conversation?.unreadCount) {
      conversation.unreadCount.set(userId, 0);
      await conversation.save();
    }

    return res.status(200).json({ message: "Chat deleted" });
  } catch (error) {
    console.error("deleteChatForMe:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    const userId = req.id;

    const alreadyPinned = message.pinnedBy.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyPinned) {
      message.pinnedBy = message.pinnedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      message.pinnedBy.push(userId);
    }

    await message.save();

    return res.status(200).json({
      success: true,
      isPinned: !alreadyPinned,
      message: alreadyPinned
        ? "Message unpinned"
        : "Message pinned",
      pinnedBy: message.pinnedBy,
    });

  } catch (error) {
    console.log("pinMessage error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};