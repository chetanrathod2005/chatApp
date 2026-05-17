import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    userName: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    profilePhoto: { type: String, default: "" },
    bio: { type: String, default: "" },

    // E2E encryption public key (JWK JSON string)
    publicKey: { type: String, default: "" },

    // Privacy settings
    privacy: {
      lastSeen: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
      profilePhoto: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
      about: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
      onlineStatus: { type: String, enum: ["everyone", "nobody"], default: "everyone" },
      readReceipts: { type: Boolean, default: true },
    },

    // Blocked users
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Pinned conversations (max 3)
    pinnedChats: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Online status
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
