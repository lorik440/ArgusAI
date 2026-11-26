import { ApiError, getToken } from "../client.js";
import { readSession, removeSession, writeSession } from "../../lib/storage.js";
import { countByStatus, seatIdsForLayout } from "../../lib/events.js";
import { randomLiveEvent } from "./factory.js";
import { createSeed } from "./seed.js";

/**
 * In-browser stand-in for the backend. It serves the same shapes the real API
 * is expected to return and simulates the live WebSocket feed, so the
 * dashboard can be developed and demonstrated before the backend exists.
 * State lives in sessionStorage so reviews survive a page reload.
 */

const STORAGE_KEY = "argus.mock-db.v1";
const REVIEW_STATUSES = ["needs_review", "reviewed", "dismissed"];

const clone = (value) => (value === undefined ? value : structuredClone(value));
const delay = (min = 120, max = 320) =>
  new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));

function examStatus(exam, now = Date.now()) {
  const start = Date.parse(exam.starts_at);
  const end = Date.parse(exam.ends_at);
  if (now < start) return "scheduled";
  if (now > end) return "completed";
  return "live";
}

function loadDb() {
  const stored = readSession(STORAGE_KEY);
  if (stored) {
    try {
      const db = JSON.parse(stored);
      // Reseed once the demo's live exam has finished so there is always one live.
      const stillLive = db.exams?.some((exam) => examStatus(exam) === "live");
      if (db.version === 1 && stillLive) return db;
    } catch {
      // fall through to a fresh seed
    }
  }
  return createSeed(Date.now());
}

let db = loadDb();
const save = () => writeSession(STORAGE_KEY, JSON.stringify(db));
save();

/** Clears demo state (used by "Reset demo data" on the dashboard). */
export function resetMockData() {
  removeSession(STORAGE_KEY);
  db = createSeed(Date.now());
  save();
}

function findExam(examId) {
  const exam = db.exams.find((item) => item.id === examId);
  if (!exam) throw new ApiError("Exam not found.", 404);
  return exam;
}

function decorateExam(exam) {
  const cameras = db.cameras[exam.id] ?? [];
  return {
    ...exam,
    status: examStatus(exam),
    event_counts: countByStatus(db.events.filter((event) => event.exam_id === exam.id)),
    cameras_online: cameras.filter((camera) => camera.status === "online").length,
    camera_count: cameras.length,
  };
}

// --- Auth -------------------------------------------------------------------

function roleFor(username) {
  const name = username.toLowerCase();
  if (name.startsWith("admin")) return "admin";
  if (name.startsWith("mentor") || name.startsWith("viewer")) return "viewer";
  return "supervisor";
}

function tokenFor(user) {
  return `mock.${encodeURIComponent(JSON.stringify(user))}`;
}

function userFromToken(token) {
  if (!token?.startsWith("mock.")) return null;
  try {
    return JSON.parse(decodeURIComponent(token.slice(5)));
  } catch {
    return null;
  }
}

function currentUser() {
  const user = userFromToken(getToken());
  if (!user) throw new ApiError("Your session has expired. Sign in again.", 401);
  return user;
}

// --- Realtime simulation -----------------------------------------------------

const channels = new Map();

function broadcast(examId, message) {
  const channel = channels.get(examId);
  if (!channel) return;
  for (const subscriber of channel.subscribers) subscriber.onMessage?.(clone(message));
}

function startSimulation(examId) {
  const timers = [];
  const schedule = (fn, ms) => timers.push(setTimeout(fn, ms));
  const every = (fn, ms) => timers.push(setInterval(fn, ms));

  const emitEvent = () => {
    const exam = db.exams.find((item) => item.id === examId);
    if (!exam || examStatus(exam) !== "live") return;
    const coverage = db.coverage[examId] ?? [];
    const seats = coverage.filter((seat) => seat.state !== "not_covered").map((seat) => seat.seat_id);
    const event = randomLiveEvent({
      id: `evt-${db.nextEventNumber++}`,
      examId,
      seats: seats.length ? seats : seatIdsForLayout(exam.seat_layout),
    });
    db.events.push(event);
    save();
    broadcast(examId, { type: "event.created", data: event });
  };

  // First simulated event arrives quickly so the live feed is visible in a demo.
  schedule(emitEvent, 18_000);
  const loop = () => schedule(() => {
    emitEvent();
    loop();
  }, 40_000 + Math.random() * 30_000);
  schedule(loop, 18_000);

  // Analysis frame rate drifts a little, as it would on real hardware.
  every(() => {
    for (const camera of db.cameras[examId] ?? []) {
      if (camera.status !== "online") continue;
      const base = camera.id === "camera_1" ? 4.2 : 3.8;
      camera.analyzed_fps = Math.round((base + (Math.random() - 0.5) * 0.8) * 10) / 10;
      broadcast(examId, { type: "camera.status", data: { id: camera.id, status: camera.status, analyzed_fps: camera.analyzed_fps } });
    }
  }, 6_000);

  // Camera 2 occasionally drops off WiFi and reconnects.
  every(() => {
    const camera = (db.cameras[examId] ?? []).find((item) => item.id === "camera_2");
    if (!camera) return;
    camera.status = "reconnecting";
    camera.analyzed_fps = null;
    broadcast(examId, { type: "camera.status", data: { id: camera.id, status: "reconnecting", analyzed_fps: null } });
    schedule(() => {
      camera.status = "online";
      camera.analyzed_fps = 3.8;
      save();
      broadcast(examId, { type: "camera.status", data: { id: camera.id, status: "online", analyzed_fps: 3.8 } });
    }, 7_000);
  }, 150_000);

  // Tracking certainty for an edge seat changes from time to time.
  every(() => {
    const seat = (db.coverage[examId] ?? []).find((item) => item.seat_id === "C4");
    if (!seat) return;
    const partial = seat.state !== "partial";
    seat.state = partial ? "partial" : "visible";
    seat.cameras = { camera_1: partial ? "partial" : "visible", camera_2: "visible" };
    seat.note = partial ? "Edge of Camera 1's view" : null;
    save();
    broadcast(examId, { type: "coverage.updated", data: seat });
  }, 45_000);

  return () => timers.forEach((timer) => {
    clearTimeout(timer);
    clearInterval(timer);
  });
}

function connectRealtime(examId, subscriber) {
  let channel = channels.get(examId);
  if (!channel) {
    channel = { subscribers: new Set(), stop: null };
    channels.set(examId, channel);
  }
  channel.subscribers.add(subscriber);
  if (!channel.stop) channel.stop = startSimulation(examId);

  subscriber.onStatus?.("connecting");
  const openTimer = setTimeout(() => subscriber.onStatus?.("open"), 250);

  return () => {
    clearTimeout(openTimer);
    channel.subscribers.delete(subscriber);
    if (channel.subscribers.size === 0) {
      channel.stop?.();
      channels.delete(examId);
    }
    subscriber.onStatus?.("closed");
  };
}

// --- Public API (same surface as httpApi) ------------------------------------

export const mockApi = {
  mode: "mock",

  async login(username, password) {
    await delay();
    const name = (username ?? "").trim();
    if (!name || !password) throw new ApiError("Enter a username and password.", 400);
    const display = name.charAt(0).toUpperCase() + name.slice(1);
    const user = { id: `user-${name.toLowerCase()}`, username: name, name: display, role: roleFor(name) };
    return { access_token: tokenFor(user), token_type: "bearer", user };
  },

  async me() {
    await delay(60, 140);
    return currentUser();
  },

  async listExams() {
    await delay();
    currentUser();
    return clone(db.exams.map(decorateExam));
  },

  async getExam(examId) {
    await delay();
    currentUser();
    return clone(decorateExam(findExam(examId)));
  },

  async listCameras(examId) {
    await delay();
    findExam(examId);
    return clone(db.cameras[examId] ?? []);
  },

  async getCoverage(examId) {
    await delay();
    findExam(examId);
    return clone(db.coverage[examId] ?? []);
  },

  async listEvents(examId) {
    await delay();
    findExam(examId);
    return clone(db.events.filter((event) => event.exam_id === examId));
  },

  async getEvent(eventId) {
    await delay();
    currentUser();
    const event = db.events.find((item) => item.id === eventId);
    if (!event) throw new ApiError("Event not found.", 404);
    return clone(event);
  },

  async reviewEvent(eventId, { status, note }) {
    await delay(200, 420);
    const user = currentUser();
    if (user.role === "viewer") throw new ApiError("Your role can view events but not review them.", 403);
    if (!REVIEW_STATUSES.includes(status)) throw new ApiError("Unknown review status.", 422);
    const event = db.events.find((item) => item.id === eventId);
    if (!event) throw new ApiError("Event not found.", 404);

    const entry = {
      status,
      reviewer: user.name,
      reviewed_at: new Date().toISOString(),
      note: note?.trim() || null,
    };
    event.review_status = status;
    event.review = status === "needs_review" ? null : entry;
    event.review_history = [...(event.review_history ?? []), entry];
    save();
    broadcast(event.exam_id, { type: "event.updated", data: event });
    return clone(event);
  },

  connectRealtime,
};
