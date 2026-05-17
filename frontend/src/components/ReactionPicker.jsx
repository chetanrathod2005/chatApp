import React from "react";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏"];

const ReactionPicker = ({ onSelect, onClose }) => {
  return (
    <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#233138] rounded-full shadow-2xl px-3 py-2 flex gap-1 border border-[#2a3942] animate-fade-in">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => { onSelect(emoji); onClose(); }}
          className="text-xl hover:scale-125 transition-transform duration-150 px-1"
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default ReactionPicker;
