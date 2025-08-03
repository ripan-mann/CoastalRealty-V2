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
        if (!("wakeLock" in navigator)) {
          throw new Error("Wake Lock API not supported");
        }

        wakeLockRef.current = await navigator.wakeLock.request("screen");

        wakeLockRef.current.addEventListener("release", () => {
          if (isActive) {
            requestWakeLock();
          }
        });
      } catch (err) {
        setError(err);
        console.error("Wake Lock error:", err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    requestWakeLock();
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
