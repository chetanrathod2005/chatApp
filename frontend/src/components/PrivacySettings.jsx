import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../axios.js";
import toast from "react-hot-toast";
import { getSocket } from "../socket.js";
import { updateAuthUser } from "../redux/userSlice.js";

const OPTIONS_3 = ["everyone",  "nobody"];
const OPTIONS_2 = ["everyone", "nobody"];

const PrivacyRow = ({ label, description, value, options, onChange }) => (
  <div className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-200">
    <p className="text-gray-800 font-medium text-sm mb-0.5">{label}</p>
    {description && <p className="text-gray-500 text-xs mb-3">{description}</p>}
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
            value === opt
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  </div>
);

const PrivacySettings = () => {
  const dispatch = useDispatch();
  const { authUser } = useSelector((s) => s.user);
  const [privacy, setPrivacy] = useState({
    lastSeen: authUser?.privacy?.lastSeen || "everyone",
    profilePhoto: authUser?.privacy?.profilePhoto || "everyone",
    about: authUser?.privacy?.about || "everyone",
    readReceipts: authUser?.privacy?.readReceipts ?? true,
    onlineStatus: authUser?.privacy?.onlineStatus || "everyone",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (key, value) => {
    setPrivacy((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put("/user/privacy", privacy, {
        withCredentials: true,
      });
      dispatch(updateAuthUser(res.data));
      const socket = getSocket();

      socket?.emit("privacyUpdated", {
        userId: res.data._id,
        privacy: res.data.privacy,
      });
      toast.success("Privacy settings saved");
    } catch {
      toast.error("Failed to save privacy settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 text-[13px] font-jetbrains">
      <p className="text-[#6b7280] text-xs mb-4 leading-relaxed">
        Control who can see your personal information
      </p>

      <PrivacyRow
        label="Last Seen"
        description="Who can see when you were last online"
        value={privacy.lastSeen}
        options={OPTIONS_3}
        onChange={(v) => handleChange("lastSeen", v)}
      />

      <PrivacyRow
        label="Profile Photo"
        description="Who can see your profile picture"
        value={privacy.profilePhoto}
        options={OPTIONS_3}
        onChange={(v) => handleChange("profilePhoto", v)}
      />

      <PrivacyRow
        label="About"
        description="Who can see your about/bio"
        value={privacy.about}
        options={OPTIONS_3}
        onChange={(v) => handleChange("about", v)}
      />

      <PrivacyRow
        label="Online Status"
        description="Who can see when you are online"
        value={privacy.onlineStatus}
        options={OPTIONS_2}
        onChange={(v) => handleChange("onlineStatus", v)}
      />

      {/* Read Receipts toggle */}
      <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-800 font-medium text-sm">Read Receipts</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Show blue ticks when messages are read
            </p>
          </div>
          <button
            onClick={() => handleChange("readReceipts", !privacy.readReceipts)}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
              privacy.readReceipts ? "bg-black" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                privacy.readReceipts ? "left-6.5" : "left-0.5"
              }`}
              style={{
                left: privacy.readReceipts ? "calc(100% - 22px)" : "2px",
              }}
            />
          </button>
        </div>
        {!privacy.readReceipts && (
          <p className="text-gray-500 text-xs mt-2 italic">
            If you turn off read receipts, you won't be able to see read
            receipts from others.
          </p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-[black] hover:bg-[#4444] text-white font-semibold text-sm transition disabled:opacity-60 shadow-md"
      >
        {saving ? "Saving..." : "Save Privacy Settings"}
      </button>
    </div>
  );
};

export default PrivacySettings;
