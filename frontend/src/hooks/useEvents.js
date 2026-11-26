import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/index.js";
import { upsertEvent } from "../lib/events.js";
import { useAsync } from "./useAsync.js";
import { useWebSocket } from "./useWebSocket.js";

const NO_EVENTS = [];

/**
 * Loads an exam's review events and keeps them current from the live feed.
 * Messages that are not about events are passed to `onOtherMessage`.
 */
export function useEvents(examId, { live = false, onOtherMessage } = {}) {
  const { data, loading, error, reload, setData } = useAsync(() => api.listEvents(examId), [examId]);
  const [newIds, setNewIds] = useState(() => new Set());
  const [latest, setLatest] = useState(null);
  const otherRef = useRef(onOtherMessage);
  otherRef.current = onOtherMessage;

  const connection = useWebSocket(
    examId,
    (message) => {
      if (message.type === "event.created" || message.type === "event.updated") {
        setData((list) => upsertEvent(list ?? [], message.data));
        if (message.type === "event.created") {
          setNewIds((previous) => new Set(previous).add(message.data.id));
          setLatest(message.data);
        }
        return;
      }
      otherRef.current?.(message);
    },
    { enabled: live },
  );

  // Catch up on anything missed while the connection was down.
  const previousConnection = useRef(connection);
  useEffect(() => {
    if (previousConnection.current === "reconnecting" && connection === "open") reload();
    previousConnection.current = connection;
  }, [connection, reload]);

  useEffect(() => {
    setNewIds(new Set());
    setLatest(null);
  }, [examId]);

  const replaceEvent = useCallback((event) => setData((list) => upsertEvent(list ?? [], event)), [setData]);

  return {
    events: data ?? NO_EVENTS,
    loading,
    error,
    reload,
    replaceEvent,
    connection,
    newIds,
    latest,
  };
}
