import React, { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../axios.js";
import toast from "react-hot-toast";
import { updateAuthUser } from "../redux/userSlice.js";
import { FiX, FiCamera, FiEdit2, FiShield, FiSlash } from "react-icons/fi";
import PrivacySettings from "./PrivacySettings.jsx";
import { getSocket } from "../socket.js";
import { profileImageSrc } from "../constant.js";

const ProfileModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const { authUser, selectedUser } = useSelector((s) => s.user);
  const [tab, setTab] = useState("profile");
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(authUser?.fullName || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const [saving, setSaving] = useState(false);
  const photoRef = useRef(null);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put(
        "/user/profile",
        { fullName, bio },
        { withCredentials: true },
      );
      dispatch(updateAuthUser(res.data));
      const socket = getSocket();

      socket?.emit("profileUpdated", {
        userId: res.data._id,
        fullName: res.data.fullName,
        bio: res.data.bio,
        profilePhoto: res.data.profilePhoto,
      });
      toast.success("Profile updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("profilePhoto", file);
    try {
      const res = await api.put("/user/profile", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      dispatch(updateAuthUser(res.data));
      const socket = getSocket();

      socket?.emit("profileUpdated", {
        userId: res.data._id,
        fullName: res.data.fullName,
        bio: res.data.bio,
        profilePhoto: res.data.profilePhoto,
      });
      toast.success("Photo updated");
    } catch {
      toast.error("Failed to update photo");
    }
  };
  const handleRemovePhoto = async () => {
    if (!window.confirm("Remove your profile photo?")) return;

    try {
      const res = await api.put(
        "/user/profile",
        { removePhoto: true },
        { withCredentials: true },
      );

      dispatch(updateAuthUser(res.data));

      const socket = getSocket();

      socket?.emit("profileUpdated", {
        userId: res.data._id,
        fullName: res.data.fullName,
        bio: res.data.bio,
        profilePhoto: res.data.profilePhoto,
      });

      toast.success("Photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  };

  const handleUnblock = async (userId) => {
    try {
      const res = await api.put(
        `/user/block/${userId}`,
        {},
        { withCredentials: true },
      );
      dispatch(updateAuthUser({ blockedUsers: res.data.blockedUsers }));
      toast.success("User unblocked");
    } catch {
      toast.error("Failed to unblock");
    }
  };



  const profilePhotoUrl = profileImageSrc(authUser?.profilePhoto);

  return (
    <div className="fixed font-jetbrains inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm">
      <div className="h-full w-full max-w-md bg-[#f9fafb] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-4 bg-white border-b border-[#e5e7eb]">
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-[#111827] transition"
          >
            <FiX size={22} />
          </button>
          <h2 className="text-[#111827] font-semibold text-lg">Profile</h2>
        </div>

        {/* Tabs */}
        <div className="flex bg-white border-b bg-white border-b border-[#e5e7eb]">
          {["profile", "privacy", "blocked"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider transition ${
                tab === t
                  ? "text-black border-b-2 border-black"
                  : "text-[#6b7280] hover:text-[#111827]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "profile" && (
            <div className="p-6">
              {/* Photo */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full overflow-hidden bg-[#e5e7eb] border-black border-2 ">
                    <img
                      src={profilePhotoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => photoRef.current.click()}
                    className="absolute bottom-1 right-1 w-8 h-8 bg-black hover:bg-[#1f2937] rounded-full flex items-center justify-center  transition shadow"
                  >
                    <FiCamera size={14} className="text-white" />
                  </button>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  {authUser?.profilePhoto && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="mt-4 px-4 py-2 rounded-lg bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 transition"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-4">
                <div className="bg-white border-b border-[#e5e7eb] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#6b7280] text-xs uppercase tracking-wider">
                      Your name
                    </label>
                    {!editing && (
                      <button
                        onClick={() => setEditing(true)}
                        className="text-[#6b7280] hover:text-[#111827]"
                      >
                        <FiEdit2 size={14} />
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-transparent text-[#111827] border-b border-black focus:outline-none py-1"
                      autoFocus
                    />
                  ) : (
                    <p className="text-[#111827]">{authUser?.fullName}</p>
                  )}
                </div>

                <div className="bg-white border-b border-[#e5e7eb] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#6b7280] text-xs uppercase tracking-wider">
                      About
                    </label>
                    {!editing && (
                      <button
                        onClick={() => setEditing(true)}
                        className="text-[#6b7280] hover:text-[#111827]"
                      >
                        <FiEdit2 size={14} />
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={139}
                      rows={3}
                      className="w-full bg-transparent text-[#111827] border-b border-black focus:outline-none py-1 resize-none"
                      placeholder="Hey there!"
                    />
                  ) : (
                    <p className="text-[#111827]">
                      {authUser?.bio || "Hey there! I am using WhatsApp."}
                    </p>
                  )}
                </div>

                <div className="bg-white border-b border-[#e5e7eb] rounded-xl p-4">
                  <label className="text-[#6b7280] text-xs uppercase tracking-wider">
                    Username
                  </label>
                  <p className="text-[#111827] mt-1">@{authUser?.userName}</p>
                </div>

                {editing && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-black text-white font-medium text-sm hover:bg-[#3333]  transition disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setFullName(authUser?.fullName || "");
                        setBio(authUser?.bio || "");
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] font-medium text-sm  transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Block current chat user */}
                {/* {selectedUser && (
                  <button
                    onClick={handleBlockSelectedUser}
                    className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-white border-b bg-white border-[#e5e7eb] text-red-400 hover:bg-red-900/20 transition text-sm font-medium"
                  >
                    <FiSlash size={16} /> Block {selectedUser.fullName}
                  </button>
                )} */}
              </div>
            </div>
          )}

          {tab === "privacy" && <PrivacySettings />}

          {tab === "blocked" && (
            <div className="p-4">
              <p className="text-[#6b7280] text-xs mb-4">
                {authUser?.blockedUsers?.length || 0} blocked contacts
              </p>
              {!authUser?.blockedUsers?.length ? (
                <p className="text-center text-[#6b7280] text-sm mt-8">
                  No blocked contacts
                </p>
              ) : (
                <div className="space-y-2">
                 {authUser.blockedUsers.map((user, index) => {

  const userId =
    typeof user === "object"
      ? user._id
      : user;

  const userName =
    typeof user === "object"
      ? user.fullName
      : "Blocked User";

  const userPhoto =
    typeof user === "object"
      ? user.profilePhoto
      : "";

  const userNameTag =
    typeof user === "object"
      ? user.userName
      : "";

  return (
    <div
      key={userId || index}
      className="flex items-center justify-between bg-white border-b border-[#e5e7eb] rounded-xl p-3"
    >
      <div className="flex items-center gap-3">

        <img
          src={profileImageSrc(userPhoto)}
          alt=""
          className="w-10 h-10 rounded-full object-cover"
        />

        <div>
          <p className="text-[#111827] text-sm font-medium">
            {userName}
          </p>

          {userNameTag && (
            <p className="text-[#6b7280] text-xs">
              @{userNameTag}
            </p>
          )}
        </div>

      </div>

      <button
        onClick={() => handleUnblock(userId)}
        className="text-black hover:underline text-xs font-medium hover:text-[#06cf9c]"
      >
        Unblock
      </button>
    </div>
  );
})}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
