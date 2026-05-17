import express from "express";
import {
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  reactToMessage,
  getConversations,
  deleteChatForMe,
  markMessagesSeen,
  pinMessage
} from "../controllers/messageController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/conversations", isAuthenticated, getConversations);
router.delete("/chat/:id", isAuthenticated, deleteChatForMe);
router.put("/seen/:id", isAuthenticated, markMessagesSeen);
router.get("/:id", isAuthenticated, getMessages);
router.post("/send/:id", isAuthenticated, upload.single("media"), sendMessage);
router.put("/edit/:messageId", isAuthenticated, editMessage);
router.delete("/delete/:messageId", isAuthenticated, deleteMessage);
router.post("/pin/:messageId", isAuthenticated, pinMessage);

router.post("/react/:messageId", isAuthenticated, reactToMessage);
 
export default router;
