import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (userId) => {
  if (!userId) return null;
  if (socket?.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(import.meta.env.VITE_API_URL || "http://localhost:8000", {
    query: {
      userId: String(userId),
    },
    withCredentials: true,
  });

  socket.on("connect", () => {
    // console.log("socket connected", socket.id, "userId:", userId);
  });
  socket.on("connect_error", (err) => {
    console.log("socket connect error", err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
