import { API_BASE_URL, getToken, request } from "./client.js";

/**
 * Real backend implementation. The endpoint list and payload shapes are
 * documented in frontend/README.md ("Backend API the dashboard expects") so the
 * backend team can implement the same contract the mock serves.
 */

const enc = encodeURIComponent;

function websocketUrl(path) {
  const url = new URL(`${API_BASE_URL.replace(/\/$/, "")}${path}`, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url;
}

/**
 * Opens the live-update socket for an exam and reconnects with backoff.
 * Browsers cannot set headers on a WebSocket, so the token goes in the query.
 * Returns a function that closes the connection.
 */
function connectRealtime(examId, { onMessage, onStatus }) {
  let socket = null;
  let closed = false;
  let attempt = 0;
  let retryTimer = null;

  const open = () => {
    onStatus?.(attempt === 0 ? "connecting" : "reconnecting");
    const url = websocketUrl(`/ws/exams/${enc(examId)}`);
    const token = getToken();
    if (token) url.searchParams.set("token", token);

    socket = new WebSocket(url);
    socket.onopen = () => {
      attempt = 0;
      onStatus?.("open");
    };
    socket.onmessage = (message) => {
      try {
        onMessage?.(JSON.parse(message.data));
      } catch {
        // Ignore malformed frames rather than breaking the dashboard.
      }
    };
    socket.onclose = () => {
      if (closed) return;
      attempt += 1;
      onStatus?.("reconnecting");
      const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5));
      retryTimer = window.setTimeout(open, delay);
    };
  };

  open();

  return () => {
    closed = true;
    window.clearTimeout(retryTimer);
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close();
    onStatus?.("closed");
  };
}

export const httpApi = {
  mode: "backend",

  login: (username, password) =>
    request("/auth/login", { method: "POST", body: { username, password } }),
  me: () => request("/auth/me"),

  listExams: () => request("/exams"),
  getExam: (examId) => request(`/exams/${enc(examId)}`),
  listCameras: (examId) => request(`/exams/${enc(examId)}/cameras`),
  getCoverage: (examId) => request(`/exams/${enc(examId)}/coverage`),

  listEvents: (examId) => request("/events", { query: { exam_id: examId } }),
  getEvent: (eventId) => request(`/events/${enc(eventId)}`),
  reviewEvent: (eventId, { status, note }) =>
    request(`/events/${enc(eventId)}/review`, { method: "POST", body: { status, note } }),

  connectRealtime,
};
