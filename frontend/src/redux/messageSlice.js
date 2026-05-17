import { createSlice } from "@reduxjs/toolkit";

const messageSlice = createSlice({
  name: "message",
  initialState: {
    messagesByUser: {},
  },
  reducers: {
 setMessages: (state, action) => {
  const { userId, messages } = action.payload || {};
  if (!userId) return;

  state.messagesByUser[userId] = messages.map(msg => ({
    ...msg,
    pinnedBy: msg.pinnedBy || []
  }));
},

    // payload: { msg, chatUserId }
    // chatUserId = the OTHER person's ID (selectedUser._id when sending, senderId when receiving)
    addMessage: (state, action) => {
      const { msg, chatUserId } = action.payload || {};
      if (!msg || !chatUserId) return;
      if (!state.messagesByUser[chatUserId])
        state.messagesByUser[chatUserId] = [];
      const exists = state.messagesByUser[chatUserId].some(
        (m) => m._id === msg._id,
      );
      if (!exists) state.messagesByUser[chatUserId].push(msg);
    },

    editMessageInStore: (state, action) => {
      const { messageId, newMessage, editedAt, chatUserId } = action.payload;
      const msgs = state.messagesByUser[chatUserId];
      if (!msgs) return;
      const idx = msgs.findIndex((m) => m._id === messageId);
      if (idx !== -1) {
        msgs[idx].message = newMessage;
        msgs[idx].isEdited = true;
        msgs[idx].edited = true;
        msgs[idx].editedAt = editedAt;
      }
    },

    deleteMessageInStore: (state, action) => {
      const { messageId, deleteType, chatUserId } = action.payload;
      const msgs = state.messagesByUser[chatUserId];
      if (!msgs) return;
      const idx = msgs.findIndex((m) => m._id === messageId);
      if (idx !== -1) {
        if (deleteType === "forEveryone") {
          msgs[idx].deletedForEveryone = true;
          msgs[idx].message = "";
        } else {
          msgs.splice(idx, 1);
        }
      }
    },

    updateReactions: (state, action) => {
      const { messageId, reactions, chatUserId } = action.payload;
      const msgs = state.messagesByUser[chatUserId];
      if (!msgs) return;
      const idx = msgs.findIndex((m) => m._id === messageId);
      if (idx !== -1) msgs[idx].reactions = reactions;
    },
togglePinMessage: (state, action) => {
  const { messageId, chatUserId, userId } = action.payload;

  const msgs = state.messagesByUser[chatUserId];
  if (!msgs) return;

  const msg = msgs.find((m) => m._id === messageId);
  if (!msg) return;

  if (!msg.pinnedBy) msg.pinnedBy = [];

  const exists = msg.pinnedBy.includes(userId);

  if (exists) {
    msg.pinnedBy = msg.pinnedBy.filter((id) => id !== userId);
  } else {
    msg.pinnedBy.push(userId);
  }
},
updatePinnedMessage: (state, action) => {
  const { messageId, pinnedBy, chatUserId } = action.payload;

  const msgs = state.messagesByUser[chatUserId];

  if (!msgs) return;

  const msg = msgs.find((m) => m._id === messageId);

  if (msg) {
    msg.pinnedBy = pinnedBy;
  }
},
    markMessagesSeenInStore: (state, action) => {
      const { chatUserId, messageIds } = action.payload;
      const msgs = state.messagesByUser[chatUserId];

      if (!msgs) return;

      msgs.forEach((m) => {
        if (
          !messageIds ||
          messageIds.length === 0 ||
          messageIds.some((id) => String(id) === String(m._id))
        ) {
          m.seen = true;
          m.delivered = true;
        }
      });
    },

    clearMessages: (state) => {
      state.messagesByUser = {};
    },
  },
});

export const {
  setMessages,
  addMessage,
  editMessageInStore,
  deleteMessageInStore,
  updateReactions,
  markMessagesSeenInStore,
  clearMessages,
  togglePinMessage,
  updatePinnedMessage,
} = messageSlice.actions;

export default messageSlice.reducer;
