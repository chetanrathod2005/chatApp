import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedUser } from "../redux/userSlice.js";
import { profileImageSrc } from "../constant.js";

const OtherUser = ({ user }) => {
  const dispatch = useDispatch();
  const { selectedUser, onlineUsers } = useSelector(store => store.user);

  const isSelected = selectedUser?._id === user._id;
  const isOnline = onlineUsers?.some((id) => String(id) === String(user._id));

  return (
    <div
      onClick={() => dispatch(setSelectedUser(user))}
      className={`flex items-center  font-jetbrains gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all
        ${isSelected
          ? "bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-400/30"
          : "hover:bg-white/10"
        }`}
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-[#2a3942] ring-2 ring-purple-400/30">
          <img
            src={profileImageSrc(user.profilePhoto)}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        {/* Online dot */}
        <span
          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-black
            ${isOnline ? "bg-green-400" : "bg-gray-500"}`}
        />
      </div>

      {/* Name */}
      <div className="flex-1">
        <p className="text-white font-medium truncate">
          {user.fullName}
        </p>
        <p className={`text-xs ${isOnline ? "text-green-400" : "text-gray-400"}`}>
          {isOnline ? "Online" : "Offline"}
        </p>
      </div>
    </div>
  );
};

export default OtherUser;
