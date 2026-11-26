import { explainEvent, EVIDENCE_PADDING_SECONDS, seatIdsForLayout } from "../../lib/events.js";
import { priorityFromScore, scoreFromSignals } from "../../lib/scoring.js";

const CAMERA_IDS = ["camera_1", "camera_2"];
const iso = (ms) => new Date(ms).toISOString();

export const seatIds = seatIdsForLayout;

const VISIBILITY_NOTES = {
  clear: (seat) => `Seat ${seat} is clearly visible.`,
  partial: (seat) => `Seat ${seat} is partly occluded from this angle.`,
  not_visible: (seat) => `Seat ${seat} is not visible from this camera at this time.`,
};

function eventTypeFor(signals) {
  const types = new Set(signals.map((signal) => signal.type));
  const hasPhone = types.has("phone_in_restricted_zone");
  const neighbour = types.has("repeated_body_orientation") || types.has("hand_enters_neighbor_zone");
  if (hasPhone && neighbour) return "combined_signals";
  if (hasPhone) return "phone_in_restricted_zone";
  return "repeated_neighbor_interaction";
}

/**
 * Builds an event in the shape the dashboard expects from the backend
 * (see "Event" in frontend/README.md).
 */
export function buildMockEvent({
  id,
  examId,
  seat,
  start,
  duration,
  cameras,
  signals,
  visibility = {},
  status = "needs_review",
  review = null,
}) {
  const end = start + duration * 1000;
  const score = scoreFromSignals(signals);
  const padding = EVIDENCE_PADDING_SECONDS * 1000;

  const event = {
    id,
    exam_id: examId,
    event_type: eventTypeFor(signals),
    seat_id: seat,
    camera_ids: cameras,
    priority: priorityFromScore(score),
    score,
    signals,
    start_time: iso(start),
    end_time: iso(end),
    duration_seconds: duration,
    review_status: status,
    review,
    review_history: review ? [review] : [],
    evidence: cameras.map((cameraId) => ({
      camera_id: cameraId,
      clip_url: null,
      snapshot_url: null,
      clip_start: iso(start - padding),
      clip_end: iso(end + padding),
    })),
    visibility: CAMERA_IDS.map((cameraId) => {
      const state = visibility[cameraId] ?? (cameras.includes(cameraId) ? "clear" : "not_visible");
      return { camera_id: cameraId, seat_visibility: state, note: VISIBILITY_NOTES[state](seat) };
    }),
    explanation: null,
  };
  event.explanation = explainEvent(event);
  return event;
}

const SIGNAL_TEMPLATES = [
  [
    { type: "repeated_body_orientation", camera: "camera_1", occurrences: 3 },
    { type: "hand_enters_neighbor_zone", camera: "camera_1", occurrences: 2 },
  ],
  [
    { type: "phone_in_restricted_zone", camera: "camera_2", occurrences: 4 },
    { type: "behavior_repeats", camera: "camera_2", occurrences: 2 },
    { type: "second_camera_supports", camera: "camera_1" },
  ],
  [
    { type: "repeated_body_orientation", camera: "camera_1", occurrences: 4 },
    { type: "behavior_repeats", camera: "camera_1", occurrences: 3 },
  ],
  [
    { type: "hand_enters_neighbor_zone", camera: "camera_2", occurrences: 3 },
    { type: "repeated_body_orientation", camera: "camera_1", occurrences: 3 },
    { type: "second_camera_supports", camera: "camera_2" },
  ],
  [
    { type: "phone_in_restricted_zone", camera: "camera_2", occurrences: 5 },
    { type: "repeated_body_orientation", camera: "camera_1", occurrences: 3 },
    { type: "hand_enters_neighbor_zone", camera: "camera_1", occurrences: 2 },
    { type: "second_camera_supports", camera: "camera_2" },
  ],
];

/** A plausible new event for the simulated live feed. */
export function randomLiveEvent({ id, examId, seats, now = Date.now(), random = Math.random }) {
  const template = SIGNAL_TEMPLATES[Math.floor(random() * SIGNAL_TEMPLATES.length)];
  const seat = seats[Math.floor(random() * seats.length)];
  const duration = Math.round((5 + random() * 7) * 10) / 10;
  const signals = template.map(({ type, camera, occurrences }) => ({
    type,
    camera_ids: [camera],
    ...(occurrences ? { occurrences } : {}),
    ...(type === "behavior_repeats" || type === "second_camera_supports"
      ? {}
      : { confidence: Math.round((0.65 + random() * 0.27) * 100) / 100 }),
  }));
  const cameras = [...new Set(signals.flatMap((signal) => signal.camera_ids))].sort();
  return buildMockEvent({
    id,
    examId,
    seat,
    // The event is reported shortly after its behavior window closes.
    start: now - duration * 1000 - 2500,
    duration,
    cameras,
    signals,
  });
}
