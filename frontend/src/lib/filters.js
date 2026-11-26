import { eventSignals, sortByStartDesc } from "./events.js";
import { PRIORITIES, REVIEW_STATUSES, eventTypeLabel } from "./scoring.js";

export const EMPTY_FILTERS = Object.freeze({
  priority: [],
  status: "",
  seat: "",
  camera: "",
  from: "",
  to: "",
  q: "",
});

const SCALAR_KEYS = ["status", "seat", "camera", "from", "to", "q"];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Filters live in the URL so a filtered view can be shared or reloaded. */
export function filtersFromSearchParams(params) {
  const status = params.get("status") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  return {
    priority: [...new Set(params.getAll("priority"))].filter((value) => value in PRIORITIES),
    status: status in REVIEW_STATUSES ? status : "",
    seat: params.get("seat") ?? "",
    camera: params.get("camera") ?? "",
    from: TIME_PATTERN.test(from) ? from : "",
    to: TIME_PATTERN.test(to) ? to : "",
    q: params.get("q") ?? "",
  };
}

export function filtersToSearchParams(filters) {
  const params = new URLSearchParams();
  for (const priority of filters.priority ?? []) params.append("priority", priority);
  for (const key of SCALAR_KEYS) {
    if (filters[key]) params.set(key, filters[key]);
  }
  return params;
}

export function hasActiveFilters(filters) {
  return (filters.priority?.length ?? 0) > 0 || SCALAR_KEYS.some((key) => Boolean(filters[key]));
}

function minutesOfDay(ms) {
  const date = new Date(ms);
  return date.getHours() * 60 + date.getMinutes();
}

function parseClock(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function matchesFilters(event, filters) {
  if (filters.priority?.length && !filters.priority.includes(event.priority)) return false;
  if (filters.status && event.review_status !== filters.status) return false;
  if (filters.seat && event.seat_id !== filters.seat) return false;
  if (filters.camera && !(event.camera_ids ?? []).includes(filters.camera)) return false;

  // Time filters compare the local clock time of the event start, inclusive
  // of the whole "to" minute (10:42 includes 10:42:59).
  const start = Date.parse(event.start_time);
  if (filters.from && minutesOfDay(start) < parseClock(filters.from)) return false;
  if (filters.to && minutesOfDay(start) > parseClock(filters.to)) return false;

  const query = filters.q?.trim().toLowerCase();
  if (query) {
    const haystack = [
      event.id,
      event.seat_id,
      eventTypeLabel(event.event_type),
      event.explanation,
      ...eventSignals(event).flatMap((signal) => [signal.label, signal.short]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

export function filterEvents(events, filters) {
  return sortByStartDesc(events.filter((event) => matchesFilters(event, filters)));
}
