import React, { useEffect, useState, useRef } from "react";
import api from "../axios.js";
import { useDispatch, useSelector } from "react-redux";
import {
  setOtherUsers,
  setSelectedUser,
  logoutUser,
  updateUnreadCount,
  pinUnpinUser,
  updateAuthUser,
} from "../redux/userSlice.js";
import { clearMessages, setMessages } from "../redux/messageSlice.js";
import { disconnectSocket } from "../socket.js";
import toast from "react-hot-toast";
import {
  FiSearch,
  FiLogOut,
  FiUser,
  FiMoreVertical,
  FiChevronDown,
  FiTrash2,
} from "react-icons/fi";
import { BsPinAngleFill } from "react-icons/bs";
import {profileImageSrc,DEFAULT_PROFILE_PHOTO,} from "../constant";

const formatTime = (dateStr) => {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const diff = Math.floor((now - date) / 86400000);

  if (diff === 1) return "Yesterday";
  if (diff < 7) return date.toLocaleDateString([], { weekday: "short" });

  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
};

const getLastMessagePreview = (msg) => {
  if (!msg) return "";

  if (msg.isDeletedForEveryone || msg.deletedForEveryone) {
    return "🚫 This message was deleted";
  }

  if (msg.mediaType === "image") return "📷 Photo";
  if (msg.mediaType === "video") return "🎥 Video";
  if (msg.mediaType === "file") return `📄 ${msg.mediaName || "File"}`;
  if (msg.mediaType === "audio") return "🎵 Audio";
  if (msg.mediaType === "document") return `📄 ${msg.mediaName || "Document"}`;

  return msg.message || "";
};

const Sidebar = ({ onOpenProfile }) => {
  const dispatch = useDispatch();
  const { otherUsers, selectedUser, authUser, onlineUsers } = useSelector(
    (s) => s.user,
  );
  const { messagesByUser } = useSelector((s) => s.message);

  const [search, setSearch] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [searching, setSearching] = useState(false);
  const topMenuRef = useRef(null);
  const topMenuButtonRef = useRef(null);
  const isPinnedByMe = (userId) => {
    return authUser?.pinnedChats?.some((id) => String(id) === String(userId));
  };

  const fetchConversations = async () => {
    if (!authUser?._id) return;

    try {
      const res = await api.get("/message/conversations", {
        withCredentials: true,
      });
      const conversations = Array.isArray(res.data) ? res.data : [];

      const users = conversations
        .filter((c) => c.user)
        .map((c) => ({
          ...c.user,
          isPinned: isPinnedByMe(c.user._id),
          unreadCount: c.unreadCount || 0,
          lastMessage: c.lastMessage || null,
          isSearchResult: false,
        }));

      users.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        const ta = new Date(a.lastMessage?.createdAt || 0).getTime();
        const tb = new Date(b.lastMessage?.createdAt || 0).getTime();

        return tb - ta;
      });

      dispatch(setOtherUsers(users));
    } catch (error) {
      console.error("Failed to fetch conversations", error);
    }
  };

  const searchUsers = async (value) => {
    if (!authUser?._id) return;

    const query = value.trim();

    if (!query) {
      fetchConversations();
      return;
    }

    try {
      setSearching(true);

      const res = await api.get(
        `/user/search?username=${encodeURIComponent(query)}`,
        {
          withCredentials: true,
        },
      );

      const users = Array.isArray(res.data) ? res.data : [];

      const formattedUsers = users.map((user) => ({
        ...user,
        isPinned: isPinnedByMe(user._id),
        unreadCount: user.unreadCount || 0,
        lastMessage: user.lastMessage || null,
        isSearchResult: true,
      }));

      dispatch(setOtherUsers(formattedUsers));
    } catch (error) {
      console.error("Failed to search users", error);
      dispatch(setOtherUsers([]));
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [authUser?._id]);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        topMenuRef.current &&
        !topMenuRef.current.contains(e.target) &&
        topMenuButtonRef.current &&
        !topMenuButtonRef.current.contains(e.target)
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

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search, authUser?._id]);

  const handleLogout = async () => {
    try {
      await api.post("/user/logout", {}, { withCredentials: true });
      disconnectSocket();
      dispatch(logoutUser());
      dispatch(clearMessages());
    } catch {
      toast.error("Logout failed");
    }
  };

  const handlePinToggle = async (e, user) => {
    e.stopPropagation();

    try {
      const res = await api.put(
        `/user/pin/${user._id}`,
        {},
        { withCredentials: true },
      );

      if (res.data?.pinnedChats) {
        dispatch(updateAuthUser({ pinnedChats: res.data.pinnedChats }));
      }

      if (user.isPinned) {
        dispatch(pinUnpinUser({ userId: user._id, pinned: false }));
        toast.success("Chat unpinned");
      } else {
        const pinnedCount = otherUsers.filter((u) => u.isPinned).length;

        if (pinnedCount >= 3) {
          toast.error("You can only pin up to 3 chats");
          return;
        }

        dispatch(pinUnpinUser({ userId: user._id, pinned: true }));
        toast.success("Chat pinned");
      }

      if (search.trim()) {
        searchUsers(search);
      } 
    
    } catch {
      toast.error("Failed to pin chat");
    }
  };
  const handleDeleteChat = async (e, user) => {
    e.stopPropagation();

    if (!window.confirm(`Delete chat with ${user.fullName}?`)) return;

    try {
      await api.delete(`/message/chat/${user._id}`, { withCredentials: true });

      if (String(selectedUser?._id) === String(user._id)) {
        dispatch(setSelectedUser(null));
      }

      dispatch(setMessages({ userId: user._id, messages: [] }));

      dispatch(
        setOtherUsers(
          otherUsers.filter((u) => String(u._id) !== String(user._id)),
        ),
      );

      toast.success("Chat deleted");
    } catch (error) {
      console.error("Delete chat failed:", error);
      toast.error(error.response?.data?.message || "Failed to delete chat");
    }
  };

  const handleSelectUser = (user) => {
    dispatch(setSelectedUser(user));

    if (user.unreadCount > 0) {
      dispatch(updateUnreadCount({ userId: user._id, count: 0 }));
    }
  };

  const pinnedUsers = otherUsers?.filter((u) => u.isPinned) || [];
  const unpinnedUsers = otherUsers?.filter((u) => !u.isPinned) || [];

  return (
    <div className="flex flex-col h-full w-full sm:w-[320px] md:w-[380px] bg-[#f1f3f5]">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#1f1f1f]">
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 group"
        >
         

          <span className=" font-jetbrains px-3 py-1 text-black   text-xl sm:text-2xl md:text-3xl font-bold tracking-wide">
            Chats
          </span>
        </button>

        <div className="flex items-center gap-1 relative">
          <button
            ref={topMenuButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((v) => !v);
            }}
            className="p-2 rounded-full hover:bg-[#1f1f1f] text-gray-400 transition"
          >
            <FiMoreVertical size={18} />
          </button>

          {showMenu && (
            <div
              ref={topMenuRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-10 z-50 bg-white border border-[#1f1f1f] rounded-lg shadow-xl py-2 w-44"
            >
              <button
                onClick={() => {
                  onOpenProfile();
                  setShowMenu(false);
                }}
                className=" font-jetbrains  flex items-center gap-3 w-full px-4 py-2.5 text-[15px] font-medium hover:bg-[#f4f4f5] transition transition"
              >
                <FiUser size={15} /> Profile
              </button>

              <button
                onClick={() => {
                  handleLogout();
                  setShowMenu(false);
                }}
                className="font-jetbrains flex items-center gap-3 w-full px-4 py-2.5 text-[15px] text-red-600 font-medium hover:bg-red-50 transition"
              >
                <FiLogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-2 bg-[#f1f3f5]">
        <div className="flex items-center gap-3 bg-[#1a1a1a]  border border-[#2a2a2a] rounded-full px-4 py-2 shadow-sm">
          <FiSearch size={16} className="text-white" />

          <input
            type="text"
            placeholder="Search or start new chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="font-jetbrains flex-1 bg-transparent text-white placeholder-[#6b7280] text- focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {search.trim() && (
          <div className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-[#8696a0] font-semibold">
            {searching ? "Searching..." : "Search Results"}
          </div>
        )}

        {!search.trim() && pinnedUsers.length > 0 && (
          <>
            <div className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-[#8696a0] font-semibold">
              Pinned
            </div>

            {pinnedUsers.map((user) => (
              <UserRow
                key={user._id}
                user={user}
                isSelected={selectedUser?._id === user._id}
                onlineUsers={onlineUsers}
                messagesByUser={messagesByUser}
                onSelect={() => handleSelectUser(user)}
                onPin={(e) => handlePinToggle(e, user)}
                onDelete={(e) => handleDeleteChat(e, user)}
              />
            ))}

            <div className="h-px bg-[#1f1f1f] border border-[#2a2a2a] mx-4 my-1" />
          </>
        )}

        {unpinnedUsers.length > 0 ? (
          unpinnedUsers.map((user) => (
            <UserRow
              key={user._id}
              user={user}
              isSelected={selectedUser?._id === user._id}
              onlineUsers={onlineUsers}
              messagesByUser={messagesByUser}
              onSelect={() => handleSelectUser(user)}
              onPin={(e) => handlePinToggle(e, user)}
              onDelete={(e) => handleDeleteChat(e, user)}
            />
          ))
        ) : pinnedUsers.length === 0 ? (
          <p className="text-[#8696a0] text-sm text-center mt-10 px-6">
            {search.trim()
              ? searching
                ? "Searching users..."
                : "No user found with this username"
              : "No conversations yet. Search username to start chat."}
          </p>
        ) : null}
      </div>
    </div>
  );
};

const UserRow = ({
  user,
  isSelected,
  onlineUsers,
  messagesByUser,
  onSelect,
  onPin,
  onDelete,
}) => {
  const isOnline = onlineUsers?.some((id) => String(id) === String(user._id));
  const unread = user.unreadCount || 0;
  const lastMsg = user.lastMessage;

const storedMsgs = messagesByUser?.[user._id];
  const latestStored = storedMsgs?.length
    ? storedMsgs[storedMsgs.length - 1]
    : null;

  let displayMsg = lastMsg;
  if (latestStored) {
    const storedTime = new Date(latestStored.createdAt || 0).getTime();
    const lastMsgTime = new Date(lastMsg?.createdAt || 0).getTime();
    if (storedTime > lastMsgTime) displayMsg = latestStored;
  }
  const [showChatMenu, setShowChatMenu] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowChatMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);




return (
  <div
    onClick={onSelect}
    className={`relative font-jetbrains flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition-all group border-b border-[#1f1f1f] ${
      isSelected
        ? "background-color: #E5E7EB; border-l-8 border-black shadow-md font-semibold scale-[1.01]text-black shadow-[inset_4px_0_0_#ffffff]"
        : "bg-white hover:bg-gray-200 transition-all duration-150 text-white"
    }`}
  >
    <div className="relative flex-shrink-0">
      <div
        className={`w-12 h-12  rounded-full overflow-hidden ring-1 ${
          isSelected ? "ring-[#d4d4d8]" : "  ring-[#2f2f2f]"
        }`}
      >
      <img
  src={
    user?.privacy?.profilePhoto === "nobody"
      ? DEFAULT_PROFILE_PHOTO
      : profileImageSrc(user.profilePhoto)
  }
  alt=""
/>
      </div>

      {isOnline && user.privacy?.onlineStatus !== "nobody" && (
        <span
          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 ${
            isSelected ? "bg-black border-white" : "bg-white border-[#0f0f0f]"
          }`}
        />
      )}
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {user.isPinned && (
            <BsPinAngleFill
              size={13}
              className={isSelected ? "text-[#52525b]" : "text-[#a1a1aa]"}
            />
          )}

          <span
            className={`font-semibold font-jetbrains  text-[15px] truncate ${
              isSelected ? "text-black" : "text-black"
            }`}
          >
            {user.fullName}
          </span>
        </div>

        <span
          className={`text-xs flex-shrink-0 ${
            isSelected ? "text-[#52525b]" : "text-[#a1a1aa]"
          }`}
        >
          {formatTime(displayMsg?.createdAt)}
        </span>
      </div>

      <div className="flex justify-between items-center mt-1">
        <p
          className={`text-sm truncate flex-1 ${
            isSelected ? "text-[#52525b]" : "text-[#a1a1aa]"
          }`}
        >
          {displayMsg ? getLastMessagePreview(displayMsg) : `@${user.userName}`}
        </p>

        <div className="relative flex items-center gap-1.5 ml-2">
          {unread > 0 && (
            <span
              className={`text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 ${
                isSelected ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}

          <button
            ref={buttonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowChatMenu((v) => !v);
            }}
            className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition ${
              isSelected
                ? "hover:bg-[#e4e4e7] text-[#52525b]"
                : "hover:bg-[#27272a] text-[#a1a1aa]"
            }`}
          >
            <FiChevronDown size={17} />
          </button>
        </div>
      </div>
    </div>

    {showChatMenu && (
      <div
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-4 top-12 z-50 w-48 bg-white border border-[#d4d4d8] rounded-2xl shadow-2xl py-2 overflow-hidden"
      >
        <button
          type="button"
          onClick={(e) => {
            onPin(e);
            setShowChatMenu(false);
          }}
          className="w-full font-jetbrains  px-4 py-3 text-left text-[15px] font-medium text-[#111111] hover:bg-[#f4f4f5] transition flex items-center gap-3"
        >
          <BsPinAngleFill size={14} />
          <span>{user.isPinned ? "Unpin chat" : "Pin chat"}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            onDelete(e);
            setShowChatMenu(false);
          }}
          className="w-full font-jetbrains px-4 py-3 text-left text-[15px] font-medium text-red-600 hover:bg-red-50 transition flex items-center gap-3"
        >
          <FiTrash2 size={15} />
          <span>Delete chat</span>
        </button>
      </div>
    )}
  </div>
);
}
export default Sidebar
