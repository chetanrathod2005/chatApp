import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: {
    authUser: null,
    otherUsers: [],
    selectedUser: null,
    onlineUsers: [],
    loading: false,
  },
  reducers: {
    setAuthUser: (state, action) => {
      state.authUser = action.payload;
    },
    setOtherUsers: (state, action) => {
      state.otherUsers = Array.isArray(action.payload) ? action.payload : [];
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
   
    removeDeletedMessagePreview: (state, action) => {
      const userId = action.payload;

      state.otherUsers = state.otherUsers.filter(
        (user) => String(user._id) !== String(userId),
      );

      if (
        state.selectedUser &&
        String(state.selectedUser._id) === String(userId)
      ) {
        state.selectedUser = null;
      }
    },
    logoutUser: (state) => {
      state.authUser = null;
      state.otherUsers = [];
      state.selectedUser = null;
      state.onlineUsers = [];
    },
    updateUserInList: (state, action) => {
      const updated = action.payload;
      const idx = state.otherUsers.findIndex((u) => u._id === updated._id);
      if (idx !== -1)
        state.otherUsers[idx] = { ...state.otherUsers[idx], ...updated };
    },
    updateUserLastSeenEverywhere: (state, action) => {
      const { userId, lastSeen } = action.payload;

      if (
        state.selectedUser &&
        String(state.selectedUser._id) === String(userId)
      ) {
        state.selectedUser.lastSeen = lastSeen;
        state.selectedUser.isOnline = false;
      }

      state.otherUsers = state.otherUsers.map((user) =>
        String(user._id) === String(userId)
          ? {
              ...user,
              lastSeen,
              isOnline: false,
            }
          : user,
      );
    },
    updateUserPrivacyEverywhere: (state, action) => {
      const { userId, privacy } = action.payload;

      const user = state.otherUsers.find(
        (u) => String(u._id) === String(userId),
      );

      if (user) {
        user.privacy = privacy;
      }

      if (
        state.selectedUser &&
        String(state.selectedUser._id) === String(userId)
      ) {
        state.selectedUser.privacy = privacy;
      }
    },
    updateUserProfileEverywhere: (state, action) => {
      const { userId, fullName, bio, profilePhoto } = action.payload;

      const user = state.otherUsers.find(
        (u) => String(u._id) === String(userId),
      );

      if (user) {
        if (fullName !== undefined) user.fullName = fullName;
        if (bio !== undefined) user.bio = bio;
        if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
      }

      if (
        state.selectedUser &&
        String(state.selectedUser._id) === String(userId)
      ) {
        if (fullName !== undefined) state.selectedUser.fullName = fullName;
        if (bio !== undefined) state.selectedUser.bio = bio;
        if (profilePhoto !== undefined)
          state.selectedUser.profilePhoto = profilePhoto;
      }
    },
    updateUnreadCount: (state, action) => {
      const { userId, count } = action.payload;
      const user = state.otherUsers.find((u) => u._id === userId);
      if (user) user.unreadCount = count;
    },
    incrementUnread: (state, action) => {
      const { userId } = action.payload;
      const user = state.otherUsers.find((u) => u._id === userId);
      if (user) user.unreadCount = (user.unreadCount || 0) + 1;
    },
  updateLastMessage: (state, action) => {
      const { userId, lastMessage } = action.payload;
      const user = state.otherUsers.find((u) => u._id === userId);
      if (user) {
        user.lastMessage = lastMessage;
      } else {
        // If user not in list yet, add a placeholder so they appear
        state.otherUsers.push({ _id: userId, lastMessage, unreadCount: 0, isPinned: false });
      }
      state.otherUsers.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const ta = new Date(a.lastMessage?.createdAt || 0).getTime();
        const tb = new Date(b.lastMessage?.createdAt || 0).getTime();
        return tb - ta;
      });
    },
   
   pinUnpinUser: (state, action) => {
      const { userId, pinned } = action.payload;
      const user = state.otherUsers.find((u) => u._id === userId);
      if (user) user.isPinned = pinned;
      state.otherUsers.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const ta = new Date(a.lastMessage?.createdAt || 0).getTime();
        const tb = new Date(b.lastMessage?.createdAt || 0).getTime();
        return tb - ta;
      });
    },
    updateAuthUser: (state, action) => {
      state.authUser = { ...state.authUser, ...action.payload };
    },
  },
});

export const {
  setAuthUser,
  setOtherUsers,
  setSelectedUser,
  setOnlineUsers,
  setLoading,
  logoutUser,
  updateUserInList,
  updateUserLastSeenEverywhere,
  updateUserPrivacyEverywhere,
  updateUserProfileEverywhere,
  updateUnreadCount,
  incrementUnread,
  updateLastMessage,
  removeDeletedMessagePreview,
  pinUnpinUser,
  updateAuthUser,
} = userSlice.actions;

export default userSlice.reducer;
