import { useEffect, useRef, useState } from "react";

/**
 * Requests a screen wake lock to prevent the device from sleeping.
 * Automatically re-applies the wake lock if it is released or if the
 * tab becomes visible again.
 * @returns {{error: Error|null}} An object containing any wake lock error.
 */
const useWakeLock = () => {
  const wakeLockRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    const requestWakeLock = async () => {
      try {
        if (!isActive) return;
        if (!("wakeLock" in navigator)) {
          throw new Error("Wake Lock API not supported");
        }

        // Only request when the page is visible; browsers throw otherwise
        if (document.visibilityState !== "visible") return;

        // Avoid duplicate requests if we already hold a sentinel
        if (wakeLockRef.current) return;

        const sentinel = await navigator.wakeLock.request("screen");
        wakeLockRef.current = sentinel;

        sentinel.addEventListener("release", () => {
          wakeLockRef.current = null;
          // Try to reacquire only if still active and visible
          if (isActive && document.visibilityState === "visible") {
            requestWakeLock();
          }
        });
      } catch (err) {
        setError(err);
        // Common case: NotAllowedError when page is hidden — ignore noise
        if (!(err && err.name === "NotAllowedError")) {
          console.error("Wake Lock error:", err);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!isActive) return;
      if (document.visibilityState === "visible") requestWakeLock();
      else if (wakeLockRef.current) {
        // If the page becomes hidden, release any existing lock
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    // Only request on mount if visible
    if (document.visibilityState === "visible") requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);

  return { error };
};

export default useWakeLock;
