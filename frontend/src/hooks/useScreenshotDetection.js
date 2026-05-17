import { useEffect, useRef } from "react";
import { getSocket } from "../socket.js";

const useScreenshotDetection = ({ selectedUser, onBlank }) => {
  const hiddenAtRef = useRef(null);

  useEffect(() => {
    if (!selectedUser?._id) return;

    const triggerBlank = () => {
      if (onBlank) onBlank();
      const socket = getSocket();
      if (socket) {
        socket.emit("screenshotTaken", { to: String(selectedUser._id) });
      }
    };

    // Method 1: keyup catches PrintScreen in most browsers
    // (keydown is intercepted by the OS before the browser sees it)
    const handleKeyUp = (e) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        triggerBlank();
      }
    };

    // Method 2: keydown for modifier combos that the browser CAN catch
    const handleKeyDown = (e) => {
      const isMacScreenshot =
        e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key);
      const isCtrlShiftS =
        (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s";

      if (isMacScreenshot || isCtrlShiftS) {
        triggerBlank();
      }
    };

   
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
      } else {
        if (
          hiddenAtRef.current !== null &&
          Date.now() - hiddenAtRef.current < 2000
        ) {
          triggerBlank();
        }
        hiddenAtRef.current = null;
      }
    };

    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedUser?._id]);
};

export default useScreenshotDetection;