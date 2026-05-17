import express from "express";
import {
  register,
  login,
  logout,
  getOtherUsers,
  searchUsers,
  updateProfile,
  updatePrivacy,
  blockUser,
  pinChat,
} from "../controllers/userController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", isAuthenticated, logout);
router.get("/search", isAuthenticated, searchUsers);
router.get("/", isAuthenticated, getOtherUsers);
router.put("/profile", isAuthenticated, upload.single("profilePhoto"), updateProfile);
router.put("/privacy", isAuthenticated, updatePrivacy);
router.put("/block/:targetId", isAuthenticated, blockUser);
router.put("/pin/:targetId", isAuthenticated, pinChat);

export default router;
