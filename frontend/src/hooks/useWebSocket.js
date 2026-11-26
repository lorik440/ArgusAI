import { useEffect, useRef, useState } from "react";
import { api } from "../api/index.js";

/**
 * Subscribes to live updates for one exam.
 *
 * The transport comes from the API layer: a real WebSocket against the
 * backend, or the simulated feed in demo mode. Returns the connection status:
 * "idle" | "connecting" | "open" | "reconnecting" | "closed".
 */
export function useWebSocket(examId, onMessage, { enabled = true } = {}) {
  const [status, setStatus] = useState("idle");
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!examId || !enabled) {
      setStatus("idle");
      return undefined;
    }
    return api.connectRealtime(examId, {
      onMessage: (message) => handlerRef.current?.(message),
      onStatus: setStatus,
    });
  }, [examId, enabled]);

  return status;
}
