/**
 * Review-priority vocabulary shared by the dashboard.
 *
 * The weights and bands mirror the illustrative development values in the
 * project guide (section 3, "Scenario C"). They are NOT validated
 * probabilities. The backend's `priority` field is authoritative; the UI uses
 * these values only to explain why an event was raised.
 */

export const SIGNALS = {
  phone_in_restricted_zone: {
    label: "Phone visible in a restricted desk zone",
    short: "Phone in desk zone",
    weight: 20,
  },
  repeated_body_orientation: {
    label: "Repeated upper-body orientation toward a neighboring desk",
    short: "Repeated body turn",
    weight: 25,
  },
  hand_enters_neighbor_zone: {
    label: "Hand movement into a neighboring desk zone",
    short: "Hand into neighbor zone",
    weight: 30,
  },
  behavior_repeats: {
    label: "Behavior repeated within the time window",
    short: "Repeated behavior",
    weight: 15,
  },
  second_camera_supports: {
    label: "Similar activity visible from the second camera",
    short: "Second camera supports",
    weight: 10,
  },
};

// Names used in the guide's example payloads, mapped to the canonical keys.
const SIGNAL_ALIASES = {
  phone_detected_in_restricted_zone: "phone_in_restricted_zone",
  repeated_body_turn: "repeated_body_orientation",
  hand_crossing_seat_boundary: "hand_enters_neighbor_zone",
  second_camera_supports_event: "second_camera_supports",
};

/** Score bands, highest first. A score below 30 does not produce an event. */
export const PRIORITY_BANDS = [
  { priority: "high", min: 75, max: 100, label: "High priority" },
  { priority: "medium", min: 50, max: 74, label: "Medium priority" },
  { priority: "low", min: 30, max: 49, label: "Low priority" },
  { priority: null, min: 0, max: 29, label: "No event" },
];

export const PRIORITIES = {
  high: { label: "High", rank: 3, glyph: "▲" },
  medium: { label: "Medium", rank: 2, glyph: "◆" },
  low: { label: "Low", rank: 1, glyph: "●" },
};

export const PRIORITY_ORDER = ["high", "medium", "low"];

export const REVIEW_STATUSES = {
  needs_review: "Needs review",
  reviewed: "Reviewed",
  dismissed: "Dismissed",
};

export const EVENT_TYPES = {
  phone_in_restricted_zone: "Phone in restricted zone",
  repeated_neighbor_interaction: "Repeated neighbor interaction",
  combined_signals: "Combined signals",
};

export function humanize(key) {
  if (!key) return "";
  const text = String(key).replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function eventTypeLabel(type) {
  return EVENT_TYPES[type] ?? humanize(type);
}

/**
 * Accepts either a bare signal name (as in the guide's example event) or an
 * object such as `{ type, camera_ids, occurrences, confidence }`.
 */
export function normalizeSignal(signal) {
  const raw = typeof signal === "string" ? { type: signal } : { ...signal };
  const type = SIGNAL_ALIASES[raw.type] ?? raw.type;
  const known = SIGNALS[type];
  return {
    ...raw,
    type,
    label: raw.label ?? known?.label ?? humanize(type),
    short: known?.short ?? humanize(type),
    weight: raw.weight ?? known?.weight ?? null,
  };
}

/** Sum of the weights of distinct signals, capped at 100. */
export function scoreFromSignals(signals = []) {
  const seen = new Map();
  for (const signal of signals.map(normalizeSignal)) {
    if (!seen.has(signal.type)) seen.set(signal.type, signal.weight ?? 0);
  }
  const total = [...seen.values()].reduce((sum, weight) => sum + weight, 0);
  return Math.min(100, total);
}

export function priorityFromScore(score) {
  return PRIORITY_BANDS.find((band) => score >= band.min)?.priority ?? null;
}

export function priorityRank(priority) {
  return PRIORITIES[priority]?.rank ?? 0;
}
