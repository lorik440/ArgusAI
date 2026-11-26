import { formatDuration } from "./format.js";
import { normalizeSignal, priorityRank } from "./scoring.js";

/** Evidence clips cover roughly this many seconds before and after an event. */
export const EVIDENCE_PADDING_SECONDS = 5;

export function eventStartMs(event) {
  return Date.parse(event.start_time);
}

export function eventEndMs(event) {
  if (event.end_time) return Date.parse(event.end_time);
  return eventStartMs(event) + (event.duration_seconds ?? 0) * 1000;
}

export function eventSignals(event) {
  return (event.signals ?? []).map(normalizeSignal);
}

/**
 * Shared playback window for an event's evidence. Uses the clip bounds the
 * backend reports when present, otherwise pads the event interval.
 * Each camera keeps its own offset so clips that start at different moments
 * still line up on one wall-clock timeline.
 */
export function evidenceWindow(event) {
  const eventStart = eventStartMs(event);
  const eventEnd = eventEndMs(event);
  const padding = EVIDENCE_PADDING_SECONDS * 1000;
  const clips = (event.evidence ?? []).map((item) => ({
    ...item,
    startMs: item.clip_start ? Date.parse(item.clip_start) : eventStart - padding,
    endMs: item.clip_end ? Date.parse(item.clip_end) : eventEnd + padding,
  }));

  const start = clips.length ? Math.min(...clips.map((c) => c.startMs)) : eventStart - padding;
  const end = clips.length ? Math.max(...clips.map((c) => c.endMs)) : eventEnd + padding;

  return {
    start,
    end,
    duration: Math.max(0.1, (end - start) / 1000),
    eventStart,
    eventEnd,
    clips,
  };
}

/** Prefer the backend's explanation; otherwise describe the signals plainly. */
export function explainEvent(event) {
  if (event.explanation) return event.explanation;
  const signals = eventSignals(event);
  const window = formatDuration(event.duration_seconds ?? (eventEndMs(event) - eventStartMs(event)) / 1000);
  const lead =
    signals.length > 1
      ? `Several potentially relevant behaviors occurred within ${window}.`
      : `A potentially relevant behavior was observed over ${window}.`;
  const hasClip = (event.evidence ?? []).length > 0;
  return hasClip ? `${lead} The clip is available for supervisor review.` : lead;
}

/** Replace an event by id, or add it if it is new. */
export function upsertEvent(events, event) {
  const index = events.findIndex((item) => item.id === event.id);
  if (index === -1) return [event, ...events];
  const next = events.slice();
  next[index] = { ...events[index], ...event };
  return next;
}

export function sortByStartDesc(events) {
  return [...events].sort((a, b) => eventStartMs(b) - eventStartMs(a));
}

export function sortByStartAsc(events) {
  return [...events].sort((a, b) => eventStartMs(a) - eventStartMs(b));
}

export function countByStatus(events) {
  const counts = { needs_review: 0, reviewed: 0, dismissed: 0 };
  for (const event of events) {
    if (event.review_status in counts) counts[event.review_status] += 1;
  }
  return counts;
}

/** Highest priority among events still waiting for review, per seat. */
export function openEventsBySeat(events) {
  const bySeat = new Map();
  for (const event of events) {
    if (event.review_status !== "needs_review") continue;
    const entry = bySeat.get(event.seat_id) ?? { count: 0, priority: null };
    entry.count += 1;
    if (priorityRank(event.priority) > priorityRank(entry.priority)) entry.priority = event.priority;
    bySeat.set(event.seat_id, entry);
  }
  return bySeat;
}

/**
 * Neighbours for review navigation, in chronological order.
 * `nextOpen` is the next event still needing review, wrapping around.
 */
export function reviewNeighbours(events, eventId) {
  const ordered = sortByStartAsc(events);
  const index = ordered.findIndex((item) => item.id === eventId);
  if (index === -1) return { previous: null, next: null, nextOpen: null, position: 0, total: ordered.length };
  const rotated = [...ordered.slice(index + 1), ...ordered.slice(0, index)];
  return {
    previous: ordered[index - 1] ?? null,
    next: ordered[index + 1] ?? null,
    nextOpen: rotated.find((item) => item.review_status === "needs_review") ?? null,
    position: index + 1,
    total: ordered.length,
  };
}

export function seatIdsForLayout(layout) {
  const rows = layout?.rows ?? ["A", "B", "C"];
  const columns = layout?.columns ?? 4;
  return rows.flatMap((row) => Array.from({ length: columns }, (_, i) => `${row}${i + 1}`));
}
