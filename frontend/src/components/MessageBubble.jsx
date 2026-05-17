import React, { useEffect, useState, useRef } from "react";
import {
  BsCheck2,
  BsCheck2All,
  BsPencil,
  BsTrash,
 BsPinAngle,
 BsPinAngleFill,
} from "react-icons/bs";
import {
  FiChevronDown,
  FiX,
  FiGlobe,
  FiCopy,
} from "react-icons/fi";
import ReactionPicker from "./ReactionPicker.jsx";
import toast from "react-hot-toast";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const MediaContent = ({ msg, baseUrl }) => {
  if (!msg.mediaUrl) return null;
  const url = msg.mediaUrl.startsWith("http")
    ? msg.mediaUrl
    : `${baseUrl}${msg.mediaUrl}`;

  if (msg.mediaType === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img
          src={url}
          alt="media"
          className="rounded-lg max-w-[240px] max-h-[200px] object-cover mb-1 cursor-pointer hover:opacity-90 transition"
        />
      </a>
    );
  }
  if (msg.mediaType === "audio") {
    return (
      <audio src={url} controls className="rounded-lg max-w-[240px] mb-1" />
    );
  }
  if (msg.mediaType === "video") {
    return (
      <video
        src={url}
        controls
        className="rounded-lg max-w-[240px] max-h-[200px] mb-1"
      />
    );
  }
  if (msg.mediaType === "file" || msg.mediaType === "document") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        download
        className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2 mb-1 text-sm hover:bg-black/30 transition"
      >
        <span className="text-xl">📄</span>
        <span className="truncate max-w-[160px]">
          {msg.mediaName || "Document"}
        </span>
      </a>
    );
  }
  return null;
};

const MessageBubble = ({
  msg,
  isMe,
  isPinned,
  onEdit,
  authUser,
  onDeleteForMe,
  onDeleteForEveryone,
  onReact,
  onPin,
  baseUrl,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuDirection, setMenuDirection] = useState("down");
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const [showTranslateOptions, setShowTranslateOptions] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);
  const [translateLang, setTranslateLang] = useState(null);

  const [summarizing, setSummarizing] = useState(false);
  const [messageSummary, setMessageSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);

  const LANGUAGES = [
    { code: "en", label: "English" },
    { code: "gu", label: "Gujarati" },
    { code: "hi", label: "Hindi" },
  ];

  const translateMessage = async (targetLang) => {
    if (!msg.message?.trim()) return;

    // Tapping the same language again dismisses the translation
    if (translateLang === targetLang) {
      setTranslatedText(null);
      setTranslateLang(null);
      return;
    }

    try {
      setTranslating(true);
      setShowMenu(false);
      setShowTranslateOptions(false);
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(msg.message)}`,
      );
      const data = await res.json();
      const translated = data?.[0]?.[0]?.[0];
      if (translated) {
        setTranslatedText(translated);
        setTranslateLang(targetLang);
      }
    } catch {
      // silently fail
    } finally {
      setTranslating(false);
    }
  };
  const summarizeMessage = () => {
  if (!msg.message?.trim()) return;

  if (messageSummary) {
    setMessageSummary(null);
    return;
  }

  try {
    setSummarizing(true);
    setShowMenu(false);

    const text = msg.message;

    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    // If already short → return as is
    if (sentences.length === 1 && text.length < 120) {
      setMessageSummary(text);
      return;
    }

    // Stopwords
    const stopWords = new Set([
      "the","is","in","and","to","of","a","that","it","on","for","with",
      "as","was","were","be","by","are","this","i","you","he","she","they",
      "we","an","or","from","at","his","her","their","our"
    ]);

    // Word frequency
    const freq = {};
    text
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .forEach((w) => {
        if (w.length > 3 && !stopWords.has(w)) {
          freq[w] = (freq[w] || 0) + 1;
        }
      });

    // Score sentences
    const scored = sentences.map((s) => {
      const words = s.toLowerCase().split(/\s+/);
      let score = 0;

      words.forEach((w) => {
        if (freq[w]) score += freq[w];
      });

      return { sentence: s.trim(), score };
    });

    // Pick best sentence
    const best = scored.sort((a, b) => b.score - a.score)[0];

    setMessageSummary(best?.sentence || text);
  } catch (err) {
    console.error(err);
    setMessageSummary("Could not summarize");
  } finally {
    setSummarizing(false);
  }
};
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        (!buttonRef.current || !buttonRef.current.contains(e.target))
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const [showReactions, setShowReactions] = useState(false);
  const holdTimer = useRef(null);

  const handlePointerDown = () => {
    holdTimer.current = setTimeout(() => {
      setShowReactions(true);
    }, 500);
  };
  const handlePointerUp = () => clearTimeout(holdTimer.current);

  if (msg.isDeletedForEveryone || msg.deletedForEveryone) {
    return (
      <div
        className={`flex ${isMe ? "justify-end" : "justify-start"} mb-4 px-1`}
      >
        <div className="px-3  font-jetbrains py-2 rounded-xl text-xs text-[#8696a0] italic border border-[#2a3942] bg-transparent">
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isMe ? "justify-end" : "justify-start"} mb-3 px-1`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="relative max-w-[72%] group">
        {showReactions && (
          <ReactionPicker
            onSelect={(emoji) => onReact(msg._id, emoji)}
            onClose={() => setShowReactions(false)}
          />
        )}

    <div
  className={`px-4 py-2.5 font-jetbrains rounded-2xl text-[15px]
  leading-relaxed relative shadow-sm border
  ${
    msg.isPinned
      ? "ring-2 ring-yellow-400"
      : ""
  }
  ${
    isMe
      ? "bg-white text-[#111111] rounded-br-md border-[#d4d4d8]"
      : "bg-black text-white rounded-bl-md border-black"
  }`}
>
{isPinned && (
  <div className="flex items-center gap-1 text-yellow-500 text-xs mb-1">
    <BsPinAngleFill size={12} />
    <span>Pinned</span>
  </div>
)}
          <MediaContent msg={msg} baseUrl={baseUrl} />

   

          {/* {msg.message && (
            <p className="break-words font-jetbrains whitespace-pre-wrap pr-20 pb-5">
              {msg.message}
            </p>
          )} */}
          {msg.message && (
            <p className="break-words font-jetbrains whitespace-pre-wrap pr-20 pb-5">
              {msg.message}
            </p>
          )}
          
          {/* Translated text panel */}
          {translating && (
            <div
              className={`mt-1 mb-1 px-2 py-1.5 rounded-xl text-xs font-jetbrains italic ${
                isMe
                  ? "bg-[#f4f4f5] text-[#71717a]"
                  : "bg-white/10 text-[#d4d4d8]"
              }`}
            >
              Translating...
            </div>
          )}

          {translatedText && !translating && (
            <div
              className={`mt-1 mb-1 rounded-xl text-[13px] font-jetbrains ${
                isMe
                  ? "bg-[#f4f4f5] border border-[#e4e4e7]"
                  : "bg-white/10 border border-white/20"
              }`}
            >
              <div
                className={`flex items-center justify-between px-2.5 pt-1.5 pb-0.5 ${
                  isMe ? "text-[#71717a]" : "text-[#d4d4d8]"
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1">
                  <FiGlobe size={10} />
                  {LANGUAGES.find((l) => l.code === translateLang)?.label}
                </span>
                <button
                  onClick={() => {
                    setTranslatedText(null);
                    setTranslateLang(null);
                  }}
                  className="hover:opacity-70 transition"
                >
                  <FiX size={12} />
                </button>
              </div>
              <p
                className={`px-2.5 pb-2 break-words whitespace-pre-wrap leading-relaxed ${
                  isMe ? "text-[#111111]" : "text-white"
                }`}
              >
                {translatedText}
              </p>
            </div>
          )}

          {(msg.isEdited || msg.edited) && (
            <div
              className={`text-xs font-jetbrains  italic mt-1 pr-20 pb-4 ${
                isMe ? "text-[#71717a]" : "text-[#d4d4d8]"
              }`}
            >
              edited
            </div>
          )}

          <span
            className={`absolute bottom-1.5 right-2.5 flex items-center gap-1 text-[11px] whitespace-nowrap ${
              isMe ? "text-[#71717a]" : "text-[#d4d4d8]"
            }`}
          >
            {formatTime(msg.createdAt)}
            {isMe &&
              (msg.seen ? (
                // <BsCheck2All size={15} className="text-black" />
                <BsCheck2All size={15} className="text-blue-500" />
              ) : msg.delivered ? (
                <BsCheck2All size={15} className="text-[#71717a]" />
              ) : (
                <BsCheck2 size={15} className="text-[#71717a]" />
              ))}
          </span>

          {Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 pt-1 pr-16">
              {Object.entries(
                msg.reactions.reduce((acc, r) => {
                  if (!r?.emoji) return acc;
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {}),
              ).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(msg._id, emoji)}
                  className={`rounded-full font-jetbrains px-2 py-0.5 text-xs flex items-center gap-0.5 transition border ${
                    isMe
                      ? "bg-[#f4f4f5] border-[#d4d4d8] hover:bg-[#e4e4e7] text-[#111111]"
                      : "bg-white text-black border-white hover:bg-[#f4f4f5]"
                  }`}
                >
                  {emoji} {count > 1 && <span>{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className={`absolute ${isMe ? "left-0" : "right-0"} top-0 opacity-0 group-hover:opacity-100 transition z-10`}
        >
          <button
            ref={buttonRef}
            onClick={(e) => {
              e.stopPropagation();
              if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                const menuHeight = 260; // approximate popup height
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
                  setMenuDirection("up");
                } else {
                  setMenuDirection("down");
                }
              }
              setShowMenu((v) => !v);
              setShowReactions(false);
            }}
            className="absolute top-1 right-1 z-50 w-7 h-7 rounded-full bg-white text-[#111111] shadow-md border border-[#e4e4e7] flex items-center justify-center hover:bg-[#f4f4f5] transition opacity-0 group-hover:opacity-100"
          >
            <FiChevronDown size={18} />
          </button>

          {showMenu && (
            <div
              ref={menuRef}
              className={`absolute ${menuDirection === "up" ? "bottom-9" : "top-9"} right-0 bg-white border border-[#d4d4d8] rounded-2xl shadow-2xl py-2 z-50 w-52 overflow-hidden`}
              onClick={() => setShowMenu(false)}
            >
              <button
                onClick={() => setShowReactions(true)}
                className="flex items-center font-jetbrains gap-3 w-full text-[#111111] hover:bg-[#f4f4f5] px-4 py-3 text-[15px] font-medium transition"
              >
                😊 React
              </button>

              {msg.message?.trim() && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(msg.message);
                    toast.success("Copied to clipboard");
                  }}
                  className="flex items-center font-jetbrains gap-3 w-full text-[#111111] hover:bg-[#f4f4f5] px-4 py-3 text-[15px] font-medium transition"
                >
                  <FiCopy size={13} /> Copy
                </button>
              )}

                    <button
            onClick={() => onPin && onPin(msg)}
            className="flex items-center font-jetbrains gap-3 w-full text-[#111111] hover:bg-[#f4f4f5] px-4 py-3 text-[15px] font-medium transition"
          >
            <BsPinAngle size={13} />
            {isPinned ? "Unpin message" : "Pin message"}
          </button>

              {/* <button
                onClick={() => onSelect && onSelect(msg)}
                className="flex items-center font-jetbrains gap-3 w-full text-[#111111] hover:bg-[#f4f4f5] px-4 py-3 text-[15px] font-medium transition"
              >
                <FiCheckSquare size={13} /> Select
              </button> */}

              {/* Translate option — only for text messages */}
              {msg.message?.trim() && (
                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTranslateOptions((v) => !v);
                    }}
                    className="flex items-center font-jetbrains gap-3 w-full text-[#111111] hover:bg-[#f4f4f5] px-4 py-3 text-[15px] font-medium transition"
                  >
                    <FiGlobe size={13} />
                    Translate
                  </button>

                  {showTranslateOptions && (
                    <div className="flex gap-1 px-4 pb-2">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={(e) => {
                            e.stopPropagation();
                            translateMessage(lang.code);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[12px] font-jetbrains font-semibold transition border ${
                            translateLang === lang.code
                              ? "bg-black text-white border-black"
                              : "bg-[#f4f4f5] text-[#111111] border-[#d4d4d8] hover:bg-[#e4e4e7]"
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Summarize option — only for text messages */}
              {msg.message?.trim() && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    summarizeMessage();
                  }}
                  className="flex items-center font-jetbrains gap-3 w-full text-[#111111] hover:bg-[#f4f4f5] px-4 py-3 text-[15px] font-medium transition"
                >
                  ✦ {messageSummary ? "Hide summary" : "Summarize"}
                </button>
              )}

              {isMe && !msg.mediaUrl && (
                <button
                  onClick={() => onEdit(msg)}
                  className="flex items-center font-jetbrains gap-3 w-full text-[#111111] px-4 py-3 text-[15px] font-medium hover:bg-[#f4f4f5] transition"
                >
                  <BsPencil size={13} /> Edit message
                </button>
              )}

              <button
                onClick={() => onDeleteForMe(msg._id)}
                className="flex items-center font-jetbrains gap-3 w-full text-[#111111] px-4 py-3 text-[15px] font-medium hover:bg-[#f4f4f5] transition"
              >
                <BsTrash size={13} /> Delete for me
              </button>

              {isMe && (
                <button
                  onClick={() => onDeleteForEveryone(msg._id)}
                  className="flex items-center font-jetbrains gap-3 w-full px-4 py-3 text-[15px] font-medium text-red-600 hover:bg-red-50 transition"
                >
                  <BsTrash size={13} /> Delete for everyone
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Summary popup modal */}
      {(summarizing || messageSummary || summaryError) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => {
            setMessageSummary(null);
            setSummaryError(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-[#d4d4d8] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4e4e7]">
              <span className="font-jetbrains font-semibold text-[#111111] text-base">
                ✦ Message Summary
              </span>
              <button
                onClick={() => {
                  setMessageSummary(null);
                  setSummaryError(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-[#f4f4f5] flex items-center justify-center text-[#71717a] transition"
              >
                <FiX size={16} />
              </button>
            </div>
            {/* Body */}
            <div className="px-5 py-4">
              {summarizing && (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin flex-shrink-0" />
                  <p className="font-jetbrains text-sm text-[#71717a]">
                    Summarizing...
                  </p>
                </div>
              )}
              {messageSummary && !summarizing && (
                <>
                  <p className="font-jetbrains text-[11px] uppercase tracking-widest text-[#71717a] font-semibold mb-3">
                    Original
                  </p>
                  <p className="font-jetbrains text-sm text-[#71717a] leading-relaxed mb-4 line-clamp-3">
                    {msg.message}
                  </p>
                  <p className="font-jetbrains text-[11px] uppercase tracking-widest text-[#111111] font-semibold mb-3">
                    Summary
                  </p>
                  <p className="font-jetbrains text-sm text-[#111111] leading-relaxed">
                    {messageSummary}
                  </p>
                </>
              )}
              {summaryError && !summarizing && (
                <p className="font-jetbrains text-sm text-red-500">
                  {summaryError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
