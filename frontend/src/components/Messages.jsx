import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

const Messages = () => {
  const { messages } = useSelector(store => store.message);
  const { authUser, selectedUser } = useSelector(store => store.user);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!selectedUser) {
    return (
      <div className="flex-1 font-jetbrains flex items-center justify-center text-gray-400">
        Select a user to start chatting 💬
      </div>
    );
  }

  return (
    <div className="flex-1  font-jetbrains overflow-y-auto px-6 py-4 space-y-3">
      {messages.length > 0 ? (
        messages.map(msg => {
         const isMe =
       String(msg.senderId._id) === String(authUser._id);


          return (
            <div
              key={msg._id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm
                  ${
                    isMe
                      ? "bg-purple-600 text-white rounded-br-none"
                      : "bg-white/10 text-white rounded-bl-none"
                  }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-center text-gray-400 mt-10">
          No messages yet 👋
        </p>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default Messages;
