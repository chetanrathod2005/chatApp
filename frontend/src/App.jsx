import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Chat from "./Pages/Chat.jsx";
import Login from "./Pages/Login.jsx";
import Signup from "./Pages/SignUp.jsx";
import ProtectedRoute from "./components/ProtectRoute.jsx";
import { connectSocket, getSocket } from "./socket.js";
import { useDispatch, useSelector } from "react-redux";
import {
  addMessage,
  editMessageInStore,
  deleteMessageInStore,
  updateReactions,
  markMessagesSeenInStore,
} from "./redux/messageSlice.js";

import {
  setOnlineUsers,
  incrementUnread,
  updateLastMessage,
  removeDeletedMessagePreview,
  updateUserPrivacyEverywhere,
  updateUserProfileEverywhere,
  updateUserLastSeenEverywhere
} from "./redux/userSlice.js";
import api from "./axios.js";
import { initializeEncryption } from "./crypto.js";

function App() {
  const dispatch = useDispatch();
  const { authUser, selectedUser } = useSelector((state) => state.user);

  // Initialize E2E encryption keys & sync public key to server
  useEffect(() => {
    if (!authUser?._id) return;
    const init = async () => {
      const { publicKeyJwk } = await initializeEncryption();
      if (!authUser.publicKey) {
        await api.put("/user/profile", {
          publicKey: JSON.stringify(publicKeyJwk),
        });
      }
    };
    init();
  }, [authUser?._id]);

  // Connect socket when user logs in
  useEffect(() => {
    if (!authUser?._id) return;
    connectSocket(authUser._id);
  }, [authUser?._id]);

  // Socket event listeners
  useEffect(() => {
    if (!authUser?._id) return;
    const socket = getSocket();
    if (!socket) return;

    const handleMessage = (message) => {
      const senderId =
        typeof message.senderId === "object"
          ? message.senderId._id
          : message.senderId;
      const sid = String(senderId);
      const openId = selectedUser?._id != null ? String(selectedUser._id) : "";

      if (openId && openId === sid) {
        dispatch(addMessage({ msg: message, chatUserId: sid }));
      } else {
        dispatch(incrementUnread({ userId: sid }));
      }

      dispatch(updateLastMessage({ userId: sid, lastMessage: message }));
    };

    const handleOnlineUsers = (users) => {
      dispatch(setOnlineUsers(users));
    };
    const handleUserLastSeenUpdated = ({ userId, lastSeen }) => {
  dispatch(updateUserLastSeenEverywhere({ userId, lastSeen }));
};

    const handleMessageEdited = ({ messageId, newMessage, editedAt }) => {
      const chatUserId = selectedUser?._id;
      if (chatUserId) {
        dispatch(
          editMessageInStore({
            messageId,
            newMessage,
            editedAt: editedAt || new Date().toISOString(),
            chatUserId,
          }),
        );
      }
    };

    const handleMessageDeleted = ({ messageId, deleteForEveryone }) => {
      const chatUserId = selectedUser?._id;

      if (chatUserId) {
        dispatch(
          deleteMessageInStore({
            messageId,
            deleteType: deleteForEveryone ? "forEveryone" : "forMe",
            chatUserId,
          }),
        );

        dispatch(
          removeDeletedMessagePreview({
            userId: chatUserId,
            messageId,
            previousMessage: null,
          }),
        );
      }
    };

    const handleReactionAdded = (payload) => {
      const chatUserId = selectedUser?._id;
      if (
        !chatUserId ||
        !payload?.messageId ||
        !Array.isArray(payload.reactions)
      )
        return;
      dispatch(
        updateReactions({
          messageId: payload.messageId,
          reactions: payload.reactions,
          chatUserId,
        }),
      );
    };
    const handleMessagesSeen = ({ seenBy, messageIds }) => {
      if (!seenBy) return;

      dispatch(
        markMessagesSeenInStore({
          chatUserId: seenBy,
          messageIds: messageIds || [],
        }),
      );
    };
    const handleUserPrivacyUpdated = ({ userId, privacy }) => {
      if (!userId || !privacy) return;

      dispatch(
        updateUserPrivacyEverywhere({
          userId,
          privacy,
        }),
      );
    };
        const handleScreenshotAlert = ({ from }) => {
      if (String(from) === String(selectedUser?._id)) {
        toast.error(`⚠️ ${selectedUser?.fullName || "Someone"} took a screenshot!`, {
          duration: 4000,
          style: { background: "#1a1a1a", color: "#fff", fontWeight: "600" },
        });
      }
    };

    const handleUserProfileUpdated = ({ userId, fullName, bio, profilePhoto }) => {
  if (!userId) return;

  dispatch(
    updateUserProfileEverywhere({
      userId,
      fullName,
      bio,
      profilePhoto,
    })
  );
};

    socket.on("newMessage", handleMessage);
    socket.on("getOnlineUsers", handleOnlineUsers);
       socket.on("screenshotAlert", handleScreenshotAlert);
    socket.on("userLastSeenUpdated", handleUserLastSeenUpdated);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("reactionAdded", handleReactionAdded);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("userPrivacyUpdated", handleUserPrivacyUpdated);
    socket.on("userProfileUpdated", handleUserProfileUpdated);

    return () => {
      socket.off("newMessage", handleMessage);
      socket.off("getOnlineUsers", handleOnlineUsers);
       socket.off("screenshotAlert", handleScreenshotAlert);
      socket.off("userLastSeenUpdated", handleUserLastSeenUpdated);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("reactionAdded", handleReactionAdded);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("userPrivacyUpdated", handleUserPrivacyUpdated);
      socket.off("userProfileUpdated", handleUserProfileUpdated);
    };
  }, [authUser?._id, selectedUser?._id, dispatch]);

  return (
    <div className="h-screen bg-gradient-to-b from-[#f7f7f8] to-[#eef1f4] text-[#111827] antialiased">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}


export default App;
