import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../axios.js";
import {
  setMessages,
  deleteMessageInStore,
  editMessageInStore,
  updateReactions,
  togglePinMessage,
  updatePinnedMessage,
} from "../redux/messageSlice.js";
import {
  removeDeletedMessagePreview,
  setSelectedUser,
  updateAuthUser,
} from "../redux/userSlice.js"; 
import SendInput from "./SendInput.jsx";
import MessageBubble from "./MessageBubble.jsx";
import toast from "react-hot-toast";
import { FiMoreVertical, FiTrash2, FiAlignLeft } from "react-icons/fi";
import { BsShieldLock, BsTrash } from "react-icons/bs";
import { getSocket, connectSocket } from "../socket.js";
import { API_ORIGIN, profileImageSrc } from "../constant.js";
import useScreenshotDetection from "../hooks/useScreenshotDetection.js";
const BASE_URL = API_ORIGIN;
export const formatLastSeen = (date) => {
  if (!date) return "";

  const lastSeenDate = new Date(date);

  if (Number.isNaN(lastSeenDate.getTime())) return "";

  const now = new Date();

  const isToday = lastSeenDate.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isYesterday = lastSeenDate.toDateString() === yesterday.toDateString();

  const time = lastSeenDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `today at ${time}`;
  }

  if (isYesterday) {
    return `yesterday at ${time}`;
  }

  const dateText = lastSeenDate.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year:
      lastSeenDate.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });

  return `${dateText} at ${time}`;
};

const MessageContainer = () => {
  const dispatch = useDispatch();
  const bottomRef = useRef(null);
  const { authUser, selectedUser, onlineUsers } = useSelector((s) => s.user);
  const { messagesByUser } = useSelector((s) => s.message);
  const messages = messagesByUser?.[selectedUser?._id] || [];
  const [loading, setLoading] = useState(false);
  const [editingMsg, setEditingMsg] = useState(null);
  const [editText, setEditText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBlank, setShowBlank] = useState(false);
  // const [showSummary, setShowSummary] = useState(false);
  // const [summary, setSummary] = useState(null);

    // ---------- Pin ----------
const handlePinMessage = async (msg) => {
  try {
    const res = await api.post(`/message/pin/${msg._id}`, {}, {
      withCredentials: true,
    });

    dispatch(
      togglePinMessage({
        messageId: msg._id,
        chatUserId: selectedUser._id,
        userId: authUser._id,
      })
    );

    toast.success(res.data.message);
  } catch (err) {
    toast.error("Pin failed");
    console.error(err);
  }
};

  const typingTimerRef = useRef(null);
  useScreenshotDetection({
    selectedUser,
    onBlank: () => {
      setShowBlank(true);
      setTimeout(() => setShowBlank(false), 2000);
    },
  });

  const headerMenuRef = useRef(null);
  const headerMenuButtonRef = useRef(null);

  const isOnline = onlineUsers?.some(
    (id) => String(id) === String(selectedUser?._id),
  );
  const canSeeOnlineStatus = selectedUser?.privacy?.onlineStatus !== "nobody";
  const canSeeLastSeen = selectedUser?.privacy?.lastSeen !== "nobody";

  useEffect(() => {
    if (!selectedUser?._id) return;
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/message/${selectedUser._id}`, {
          withCredentials: true,
        });
        dispatch(
          setMessages({ userId: selectedUser._id, messages: res.data || [] }),
        );
      } catch (err) {
        console.error("Failed to fetch messages", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [selectedUser?._id]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // MARK SEEN AS SOON AS USER OPEN CHAT
  useEffect(() => {
    if (!selectedUser?._id || !authUser?._id || !messages.length) return;

    const hasUnseenIncomingMessage = messages.some((msg) => {
      const senderId =
        typeof msg.senderId === "object" ? msg.senderId._id : msg.senderId;
      const receiverId =
        typeof msg.receiverId === "object"
          ? msg.receiverId._id
          : msg.receiverId;

      return (
        String(senderId) === String(selectedUser._id) &&
        String(receiverId) === String(authUser._id) &&
        !msg.seen
      );
    });

    if (!hasUnseenIncomingMessage) return;

    api
      .put(`/message/seen/${selectedUser._id}`, {}, { withCredentials: true })
      .catch((error) => {
        console.error("Failed to mark messages seen:", error);
      });
  }, [selectedUser?._id, authUser?._id, messages.length]);

  // Typing indicator via socket
  useEffect(() => {
    if (!selectedUser?._id) return;

    const socket = getSocket();

    if (!socket) {
      // console.log("typing listener not attached: socket missing");
      return;
    }

    // console.log("typing listener attached for selected:", selectedUser._id);

    const handleTyping = (payload) => {
      console.log("received typing", payload, "selected:", selectedUser._id);

      const typingUserId =
        typeof payload === "string"
          ? payload
          : payload?.from || payload?.senderId || payload?.userId;

      if (String(typingUserId) === String(selectedUser._id)) {
        setIsTyping(true);

        clearTimeout(typingTimerRef.current);

        typingTimerRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }
    };

    const handleStopTyping = (payload) => {
      console.log(
        "received stopTyping",
        payload,
        "selected:",
        selectedUser._id,
      );

      const typingUserId =
        typeof payload === "string"
          ? payload
          : payload?.from || payload?.senderId || payload?.userId;

      if (String(typingUserId) === String(selectedUser._id)) {
        setIsTyping(false);
        clearTimeout(typingTimerRef.current);
      }
    };

    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      clearTimeout(typingTimerRef.current);
    };
  }, [selectedUser?._id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        headerMenuRef.current &&
        !headerMenuRef.current.contains(e.target) &&
        headerMenuButtonRef.current &&
        !headerMenuButtonRef.current.contains(e.target)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleBlockSelectedUser = async () => {
    if (!selectedUser) return;

    if (!window.confirm(`Block ${selectedUser.fullName}?`)) return;

    try {
      const res = await api.put(
        `/user/block/${selectedUser._id}`,
        {},
        { withCredentials: true },
      );

      dispatch(updateAuthUser(res.data)); // safer

      toast.success(`${selectedUser.fullName} blocked`);
      setShowMenu(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to block");
    }
  };

  const handleDeleteForMe = async (messageId) => {
    try {
      const remainingMessages = messages.filter(
        (m) => String(m._id) !== String(messageId),
      );
      const previousMessage = remainingMessages.length
        ? remainingMessages[remainingMessages.length - 1]
        : null;

      await api.delete(`/message/delete/${messageId}`, {
        data: { deleteForEveryone: false },
        withCredentials: true,
      });

      dispatch(
        deleteMessageInStore({
          messageId,
          deleteType: "forMe",
          chatUserId: selectedUser._id,
        }),
      );

      dispatch(
        removeDeletedMessagePreview({
          userId: selectedUser._id,
          messageId,
          previousMessage,
        }),
      );
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleDeleteForEveryone = async (messageId) => {
    if (!window.confirm("Delete this message for everyone?")) return;

    try {
      const remainingMessages = messages.filter(
        (m) => String(m._id) !== String(messageId),
      );
      const previousMessage = remainingMessages.length
        ? remainingMessages[remainingMessages.length - 1]
        : null;

      await api.delete(`/message/delete/${messageId}`, {
        data: { deleteForEveryone: true },
        withCredentials: true,
      });

      dispatch(
        deleteMessageInStore({
          messageId,
          deleteType: "forEveryone",
          chatUserId: selectedUser._id,
        }),
      );

      dispatch(
        removeDeletedMessagePreview({
          userId: selectedUser._id,
          messageId,
          previousMessage,
        }),
      );
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleEdit = (msg) => {
    setEditingMsg(msg);
    setEditText(msg.message);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editText.trim() || editText === editingMsg.message) {
      setEditingMsg(null);
      return;
    }
    try {
      const res = await api.put(
        `/message/edit/${editingMsg._id}`,
        { message: editText },
        { withCredentials: true },
      );
      dispatch(
        editMessageInStore({
          messageId: editingMsg._id,
          newMessage: editText,
          editedAt: res.data.updatedAt,
          chatUserId: selectedUser._id,
        }),
      );
      setEditingMsg(null);
    } catch {
      toast.error("Failed to edit");
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      const res = await api.post(
        `/message/react/${messageId}`,
        { emoji },
        { withCredentials: true },
      );
      dispatch(
        updateReactions({
          messageId,
          reactions: res.data,
          chatUserId: selectedUser._id,
        }),
      );
    } catch {
      toast.error("Failed to react");
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedUser?._id) return;

    const confirmDelete = window.confirm("Delete this chat?");
    if (!confirmDelete) return;

    try {
      await api.delete(`/message/chat/${selectedUser._id}`, {
        withCredentials: true,
      });

      const updatedMessages = (res.data || []).map((msg) => ({
  ...msg,
  isPinned: msg.pinnedBy?.includes(authUser._id),
}));

dispatch(
  setMessages({
    userId: selectedUser._id,
    messages: updatedMessages,
  }),
);
      dispatch(setSelectedUser(null));
      dispatch(removeDeletedMessagePreview(selectedUser._id));
      setShowMenu(false);

      toast.success("Chat deleted");
    } catch (error) {
      console.error("delete chat:", error);
      toast.error("Failed to delete chat");
    }
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f7f7f8]">
        <h2 className="text-[#111827] text-xl font-light mb-2">
          Messaging App
        </h2>
        <p className="text-[#6b7280] text-sm text-center max-w-xs">
          Select a conversation to start messaging
        </p>
        <div className="flex items-center gap-2 mt-6 text-[#6b7280] text-xs">
          <BsShieldLock size={13} />
          <span>End-to-end encrypted</span>
        </div>
      </div>
    );
  }
  const firstUnreadIndex = messages.findIndex(
    (m) => !m.seen && String(m.senderId) !== String(authUser?._id),
  );
  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();

    const isToday = date.toDateString() === today.toDateString();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isToday) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f4f4f5] h-full overflow-hidden relative">
      {showBlank && <div className="absolute inset-0 bg-black z-[9999]" />}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#d4d4d8] shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-[#f3f4f6] ring-1 ring-[#d4d4d8]">
              <img
                src={profileImageSrc(selectedUser.profilePhoto)}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            {isOnline && canSeeOnlineStatus && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-black rounded-full border-2 border-white" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-[#111111]  font-jetbrains font-semibold text-base leading-tight truncate">
              {selectedUser.fullName}
            </h3>

            <p className="text-[#52525b] font-jetbrains text-sm leading-tight mt-0.5 min-h-[18px]">
              {isTyping ? (
                <span className="text-black font-jetbrains font-medium">
                  typing...
                </span>
              ) : isOnline && canSeeOnlineStatus ? (
                "online"
              ) : selectedUser.lastSeen && canSeeLastSeen ? (
                `last seen ${formatLastSeen(selectedUser.lastSeen)}`
              ) : (
                ""
              )}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            ref={headerMenuButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((v) => !v);
            }}
            className="p-2.5 rounded-full hover:bg-[#f4f4f5] text-[#27272a] transition"
          >
            <FiMoreVertical size={20} />
          </button>

          {showMenu && (
            <div
              ref={headerMenuRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-11 z-50 bg-white border border-[#d4d4d8] rounded-2xl shadow-2xl py-2 w-48 overflow-hidden"
            >
              <button
                onClick={handleDeleteChat}
                className="flex font-jetbrains items-center gap-3 w-full px-4 py-3 text-[15px] font-medium  hover:bg-[#f3f4f6] transition"
              >
                <FiTrash2 size={16} /> Clear chat
              </button>

              <button
                onClick={handleBlockSelectedUser}
                className="flex font-jetbrains items-center gap-3 w-full px-4 py-3 text-[15px] font-medium text-red-600 hover:bg-red-50 transition"
              >
                <FiTrash2 size={16} /> Block
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex justify-center py-2.5 bg-[#f4f4f5]">
        <span className="text-[13px] text-[#52525b] font-jetbrains  bg-white border border-[#e4e4e7] shadow-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <BsShieldLock size={12} /> Messages are end-to-end encrypted
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1 bg-[#f4f4f5] min-h-0">
        {loading ? (
          <div className="flex justify-center mt-10 text-[#52525b] text-base">
            Loading...
          </div>
        ) : messages.length ? (
          messages.map((msg, index) => {
            const senderId =
              typeof msg.senderId === "object"
                ? msg.senderId._id
                : msg.senderId;

            const isMe = String(senderId) === String(authUser?._id);

            const showDate =
              index === 0 ||
              new Date(messages[index - 1].createdAt).toDateString() !==
                new Date(msg.createdAt).toDateString();

            return (
              <React.Fragment key={msg._id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="bg-white text-[#27272a] text-xs font-medium px-3.5 py-1.5 rounded-full border border-[#e4e4e7] shadow-sm">
                      {formatDateLabel(msg.createdAt)}
                    </span>
                  </div>
                )}
                {index === firstUnreadIndex && firstUnreadIndex !== -1 && (
                  <div className="flex justify-center my-4">
                    <span className="bg-black text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md">
                      Unread Messages
                    </span>
                  </div>
                )}
              
             
                  <MessageBubble
                    msg={msg}
                    isMe={isMe}
                    authUser={authUser}
                    isPinned={msg.pinnedBy?.includes(authUser?._id)}
                    baseUrl={BASE_URL}
                    onEdit={handleEdit}
                    onDeleteForMe={handleDeleteForMe}
                    onPin={handlePinMessage}
                    onDeleteForEveryone={handleDeleteForEveryone}
                    onReact={handleReact}
                  />
              </React.Fragment>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center mt-16 text-center">
            <div className="w-14 h-14 rounded-full bg-white border border-[#e4e4e7] shadow-sm flex items-center justify-center mb-3">
              <BsShieldLock size={22} className="text-[#18181b]" />
            </div>
            <p className="text-[#18181b] font-jetbrains  text-base font-semibold">
              No messages yet
            </p>
            <p className="text-[#71717a]  font-jetbrains text-sm mt-1">
              Start the conversation with a simple hello.
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {editingMsg && (
        <div className="flex-shrink-0 px-5 py-3 bg-white border-t border-[#d4d4d8]">
          <p className="text-xs text-[#52525b] font-semibold mb-2">
            Edit message
          </p>

          <form onSubmit={handleEditSubmit} className="flex gap-2">
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#f4f4f5] border border-[#d4d4d8] text-[#111111] text-base focus:outline-none focus:ring-2 focus:ring-black"
            />

            <button
              type="submit"
              className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-semibold hover:bg-[#27272a] transition"
            >
              Save
            </button>

            <button
              type="button"
              onClick={() => setEditingMsg(null)}
              className="px-4 py-2.5 bg-white border border-[#d4d4d8] text-[#27272a] rounded-xl text-sm font-semibold hover:bg-[#f4f4f5] transition"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

   

      <div className="flex-shrink-0 border-t border-[#d4d4d8]">
        <SendInput />
      </div>
    </div>
  );
};
export default MessageContainer;
