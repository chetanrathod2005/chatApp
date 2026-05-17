import React, { useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import MessageContainer from "../components/MessageContainer.jsx";
import ProfileModal from "../components/ProfileModal.jsx";

const Chat = () => {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="h-screen w-full flex bg-[#0a0a0a] overflow-hidden">
      {/* Sidebar */}
      <div className="w-[30%] min-w-[300px] max-w-[400px] flex flex-col border-r border-border-[#1f1f1f] bg-[#111111]">
        <Sidebar onOpenProfile={() => setShowProfile(true)} />
      </div>

      {/* Chat Area */}
    <div className="flex-1 flex flex-col bg-[#0d0d0d]">
        <MessageContainer />
      </div>

      {/* Profile Modal */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
};

export default Chat;
