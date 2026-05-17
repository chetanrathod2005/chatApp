import React, { useState, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { ImAttachment } from "react-icons/im";
import { FiX, FiImage, FiFile, FiVideo } from "react-icons/fi";
import api from "../axios.js";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { addMessage } from "../redux/messageSlice.js";
import { getSocket } from "../socket.js";
import { updateLastMessage } from "../redux/userSlice.js";

const SendInput = () => {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const fileRef = useRef(null);
  const dispatch = useDispatch();
  const { selectedUser, authUser } = useSelector((s) => s.user);
  const typingTimeout = useRef(null);

  const handleTyping = (e) => {
    setMessage(e.target.value);

    const socket = getSocket();

    if (!socket || !selectedUser?._id || !authUser?._id) return;
    console.log("sending typing", {
      to: String(selectedUser._id),
      from: String(authUser._id),
    });

    socket.emit("typing", {
      to: String(selectedUser._id),
      from: String(authUser._id),
    });

    clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      socket.emit("stopTyping", {
        to: String(selectedUser._id),
        from: String(authUser._id),
      });
    }, 1500);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      setFilePreview({
        type: "image",
        url: URL.createObjectURL(f),
        name: f.name,
      });
    } else if (f.type.startsWith("video/")) {
      setFilePreview({ type: "video", name: f.name });
    } else {
      setFilePreview({ type: "document", name: f.name });
    }
    setShowAttach(false);
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const sendMessageHandler = async (e) => {
    e.preventDefault();
    if (!selectedUser || (!message.trim() && !file)) return;
    setSending(true);

    try {
      const formData = new FormData();
      if (message.trim()) formData.append("message", message);
      if (file) formData.append("media", file);

      const res = await api.post(
        `/message/send/${selectedUser._id}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      dispatch(addMessage({ msg: res.data, chatUserId: selectedUser._id }));

      dispatch(updateLastMessage({ userId: selectedUser._id, lastMessage: res.data }))

      // Also relay via socket for sender's own conversation view
      const socket = getSocket();
      socket?.emit("stopTyping", {
        to: String(selectedUser._id),
        from: String(authUser._id),
      });

      setMessage("");
      removeFile();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessageHandler(e);
    }
  };




return (
  <form
    onSubmit={sendMessageHandler}
    className="flex-shrink-0 font-jetbrains px-5 py-3.5 bg-white border-t border-[#d4d4d8]"
  >
    {filePreview && (
      <div className="mb-3 flex items-center gap-3 bg-[#f4f4f5] border border-[#d4d4d8] rounded-2xl px-4 py-3">
        {filePreview.type === "image" ? (
          <img
            src={filePreview.url}
            alt=""
            className="w-12 h-12 rounded-xl object-cover"
          />
        ) : filePreview.type === "video" ? (
          <FiVideo size={22} className="text-black" />
        ) : (
          <FiFile size={22} className="text-black" />
        )}

        <span className="text-[#27272a] text-sm font-medium flex-1 truncate">
          {filePreview.name}
        </span>

        <button
          type="button"
          onClick={removeFile}
          className="w-8 h-8 rounded-full bg-white border border-[#d4d4d8] text-[#27272a] hover:bg-red-50 hover:text-red-600 transition flex items-center justify-center"
        >
          <FiX size={17} />
        </button>
      </div>
    )}

    <div className="flex items-center gap-2.5">
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowAttach((v) => !v)}
          className="w-11 h-11 rounded-full bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#27272a] transition flex items-center justify-center"
        >
          <ImAttachment size={19} />
        </button>

        {showAttach && (
          <div className="absolute bottom-12 left-0 bg-white border border-[#d4d4d8] rounded-2xl shadow-2xl py-2 w-44 z-50 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                fileRef.current.accept = "image/*";
                fileRef.current.click();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-[15px] font-medium text-[#111111] hover:bg-[#f4f4f5] transition"
            >
              <FiImage size={16} className="text-black" /> Photo
            </button>

            <button
              type="button"
              onClick={() => {
                fileRef.current.accept = "video/*";
                fileRef.current.click();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-[15px] font-medium text-[#111111] hover:bg-[#f4f4f5] transition"
            >
              <FiVideo size={16} className="text-black" /> Video
            </button>

            <button
              type="button"
              onClick={() => {
                fileRef.current.accept = ".pdf,.doc,.docx,.txt,.zip,.rar";
                fileRef.current.click();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-[15px] font-medium text-[#111111] hover:bg-[#f4f4f5] transition"
            >
              <FiFile size={16} className="text-black" /> Document
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      <input
        type="text"
        value={message}
        onChange={handleTyping}
        onKeyDown={handleKeyDown}
        placeholder="Type a message"
        className="flex-1 px-5 py-3 rounded-full bg-[#f4f4f5] border border-[#d4d4d8] text-[#111111] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-base shadow-sm"
      />

      <button
        type="submit"
        disabled={sending || (!message.trim() && !file)}
        className={`w-11 h-11 rounded-full transition flex items-center justify-center shadow-sm ${
          sending || (!message.trim() && !file)
            ? "bg-[#d4d4d8] text-white cursor-not-allowed"
            : "bg-black text-white hover:bg-[#27272a]"
        }`}
      >
        <IoSend size={19} />
      </button>
    </div>
  </form>
);
};

export default SendInput;