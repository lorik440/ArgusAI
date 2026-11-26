import { describe, expect, it } from "vitest";
import { evidenceWindow, explainEvent, openEventsBySeat, reviewNeighbours, upsertEvent } from "./events.js";

const base = Date.UTC(2026, 10, 11, 9, 42, 18);
const iso = (ms) => new Date(ms).toISOString();

describe("evidenceWindow", () => {
  it("pads the event by about 5 seconds when clips give no bounds", () => {
    const win = evidenceWindow({ start_time: iso(base), duration_seconds: 8 });
    expect(win.start).toBe(base - 5000);
    expect(win.end).toBe(base + 13_000);
    expect(win.duration).toBe(18);
  });

  it("spans every camera's clip so both stay on one timeline", () => {
    const win = evidenceWindow({
      start_time: iso(base),
      end_time: iso(base + 8000),
      evidence: [
        { camera_id: "camera_1", clip_start: iso(base - 5000), clip_end: iso(base + 13_000) },
        { camera_id: "camera_2", clip_start: iso(base - 3000), clip_end: iso(base + 15_000) },
      ],
    });
    expect(win.start).toBe(base - 5000);
    expect(win.end).toBe(base + 15_000);
    expect(win.clips[1].startMs - win.start).toBe(2000);
  });
});

describe("explainEvent", () => {
  it("prefers the backend explanation", () => {
    expect(explainEvent({ explanation: "From backend." })).toBe("From backend.");
  });

  it("describes several signals in plain language", () => {
    const text = explainEvent({
      start_time: iso(base),
      duration_seconds: 11,
      signals: ["phone_in_restricted_zone", "repeated_body_orientation"],
      evidence: [{ camera_id: "camera_1" }],
    });
    expect(text).toBe(
      "Several potentially relevant behaviors occurred within 11 s. The clip is available for supervisor review.",
    );
  });
});

describe("event list helpers", () => {
  const events = [
    { id: "a", seat_id: "B4", priority: "low", review_status: "needs_review", start_time: iso(base) },
    { id: "b", seat_id: "B4", priority: "high", review_status: "needs_review", start_time: iso(base + 60_000) },
    { id: "c", seat_id: "A1", priority: "medium", review_status: "reviewed", start_time: iso(base + 120_000) },
  ];

  it("upserts by id", () => {
    expect(upsertEvent(events, { id: "b", review_status: "reviewed" })[1].review_status).toBe("reviewed");
    expect(upsertEvent(events, { id: "d" })[0].id).toBe("d");
  });

  it("summarises open events per seat with the highest priority", () => {
    const bySeat = openEventsBySeat(events);
    expect(bySeat.get("B4")).toEqual({ count: 2, priority: "high" });
    expect(bySeat.has("A1")).toBe(false);
  });

  it("finds the next event needing review, wrapping around", () => {
    const fromLast = reviewNeighbours(events, "c");
    expect(fromLast.previous.id).toBe("b");
    expect(fromLast.next).toBeNull();
    expect(fromLast.nextOpen.id).toBe("a");
    expect(reviewNeighbours(events, "a").nextOpen.id).toBe("b");
  });
});
