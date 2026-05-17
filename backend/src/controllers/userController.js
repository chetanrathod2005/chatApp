import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import { Conversation } from "../models/conversationModel.js";

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { fullName, userName, password, confirmPassword, gender } = req.body;

    if (!fullName || !userName || !password || !confirmPassword || !gender) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const exists = await User.findOne({ userName });
    if (exists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({ fullName, userName, password: hashed, gender });

    return res
      .status(201)
      .json({ message: "Account created successfully", success: true });
  } catch (error) {
    console.error("register:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { userName, password } = req.body;

    if (!userName || !password) {
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }

    const user = await User.findOne({ userName });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Incorrect username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Incorrect username or password" });
    }

    user.isOnline = true;
    if (req.body.publicKey) user.publicKey = req.body.publicKey;
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET_KEY || "secret",
      { expiresIn: "7d" },
    );

    const cookieOptions = {
      httpOnly: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    };

    return res.status(200).cookie("jwt", token, cookieOptions).json({
      _id: user._id,
      fullName: user.fullName,
      userName: user.userName,
      profilePhoto: user.profilePhoto,
      bio: user.bio,
      gender: user.gender,
      publicKey: user.publicKey,
      privacy: user.privacy,
      blockedUsers: user.blockedUsers,
      pinnedChats: user.pinnedChats,
      lastSeen: user.lastSeen,
    });
  } catch (error) {
    console.error("login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.id);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }
    return res
      .status(200)
      .clearCookie("jwt", {
        httpOnly: true,
        path: "/",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
      })
      .json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("logout:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Get all other users (for sidebar) ───────────────────────────────────────
export const getOtherUsers = async (req, res) => {
  try {
    const userId = req.id;

    const currentUser = await User.findById(userId).select("blockedUsers pinnedChats");
    const blocked = currentUser?.blockedUsers?.map((id) => String(id)) || [];

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "-password")
      .populate("messages");

    const users = conversations
      .map((conversation) => {
        const visibleMessages = conversation.messages.filter((msg) => {
          return (
            !msg.deletedFor?.some((id) => String(id) === String(userId)) &&
            !msg.isDeletedForEveryone
          );
        });

        if (visibleMessages.length === 0) return null;

        const otherUser = conversation.participants.find(
          (participant) => String(participant._id) !== String(userId)
        );

        if (!otherUser) return null;

        if (blocked.includes(String(otherUser._id))) return null;

        const lastMessage = visibleMessages[visibleMessages.length - 1];

        return {
          ...otherUser.toObject(),
          lastMessage,
          unreadCount: conversation.unreadCount?.get(userId) || 0,
        };
      })
      .filter(Boolean);

    return res.status(200).json(users);
  } catch (error) {
    console.error("getOtherUsers:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ───  searchUsers (for sidebar) ───────────────────────────────────────
export const searchUsers = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || !username.trim()) {
      return res.status(200).json([]);
    }

    const currentUser = await User.findById(req.id).select("blockedUsers");
    const blocked = currentUser?.blockedUsers || [];

    const users = await User.find({
      _id: { $ne: req.id, $nin: blocked },
      userName: { $regex: username.trim(), $options: "i" },
    })
      .select("-password")
      .limit(10);

    return res.status(200).json(users);
  } catch (error) {
    console.error("searchUsers:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Update profile (name, bio, photo, publicKey) ────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const { fullName, bio, publicKey, removePhoto } = req.body;
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (bio !== undefined) updateData.bio = bio;
    if (publicKey !== undefined) updateData.publicKey = publicKey;
    if (removePhoto === "true" || removePhoto === true) {
      updateData.profilePhoto = "";
    } else if (req.file) {
      updateData.profilePhoto = `/uploads/${req.file.filename}`;
    }
    
    const user = await User.findByIdAndUpdate(req.id, updateData, {
      new: true,
    }).select("-password");

    return res.status(200).json(user);
  } catch (error) {
    console.error("updateProfile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Update privacy settings ──────────────────────────────────────────────────
export const updatePrivacy = async (req, res) => {
  try {
    const { lastSeen, profilePhoto, about, onlineStatus, readReceipts } =
      req.body;

    const privacyUpdate = {};
    if (lastSeen) privacyUpdate["privacy.lastSeen"] = lastSeen;
    if (profilePhoto) privacyUpdate["privacy.profilePhoto"] = profilePhoto;
    if (about) privacyUpdate["privacy.about"] = about;
    if (onlineStatus) privacyUpdate["privacy.onlineStatus"] = onlineStatus;
    if (readReceipts !== undefined)
      privacyUpdate["privacy.readReceipts"] = readReceipts;

    const user = await User.findByIdAndUpdate(
      req.id,
      { $set: privacyUpdate },
      {
        new: true,
      },
    ).select("-password");

    return res.status(200).json(user);
  } catch (error) {
    console.error("updatePrivacy:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Block / Unblock user (toggle) ───────────────────────────────────────────
export const blockUser = async (req, res) => {
  try {

    const { targetId } = req.params;

    const user = await User.findById(req.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isBlocked = user.blockedUsers
      .map((id) => id.toString())
      .includes(targetId);

    if (isBlocked) {

      user.blockedUsers = user.blockedUsers.filter(
        (id) => id.toString() !== targetId
      );

    } else {

      user.blockedUsers.push(targetId);

    }

    await user.save();

    // IMPORTANT
    await user.populate(
      "blockedUsers",
      "fullName profilePhoto email"
    );

    return res.status(200).json({
      message: isBlocked
        ? "User unblocked"
        : "User blocked",

      blockedUsers: user.blockedUsers,
    });

  } catch (error) {

    console.error("blockUser:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ─── Pin / Unpin chat (toggle, max 3) ────────────────────────────────────────
export const pinChat = async (req, res) => {
  try {
    const { targetId } = req.params;
    const user = await User.findById(req.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPinned = user.pinnedChats.some((id) => id.toString() === targetId);
    if (isPinned) {
      user.pinnedChats = user.pinnedChats.filter(
        (id) => id.toString() !== targetId,
      );
    } else {
      if (user.pinnedChats.length >= 3) {
        return res
          .status(400)
          .json({ message: "You can only pin up to 3 chats" });
      }
      user.pinnedChats.push(targetId);
    }
    await user.save();

    return res.status(200).json({
      message: isPinned ? "Chat unpinned" : "Chat pinned",
      pinnedChats: user.pinnedChats,
    });
  } catch (error) {
    console.error("pinChat:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
