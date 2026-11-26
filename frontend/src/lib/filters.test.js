import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, filterEvents, filtersFromSearchParams, filtersToSearchParams, hasActiveFilters } from "./filters.js";

// Local-time dates so the clock filters behave the same in any timezone.
const at = (h, m, s = 0) => new Date(2026, 10, 11, h, m, s).toISOString();

const events = [
  {
    id: "e1",
    seat_id: "B4",
    priority: "high",
    review_status: "needs_review",
    camera_ids: ["camera_1", "camera_2"],
    start_time: at(10, 42, 18),
    event_type: "combined_signals",
    signals: ["phone_in_restricted_zone"],
  },
  {
    id: "e2",
    seat_id: "A2",
    priority: "low",
    review_status: "dismissed",
    camera_ids: ["camera_2"],
    start_time: at(10, 5),
    event_type: "phone_in_restricted_zone",
    signals: ["phone_in_restricted_zone"],
  },
  {
    id: "e3",
    seat_id: "C1",
    priority: "medium",
    review_status: "needs_review",
    camera_ids: ["camera_1"],
    start_time: at(10, 30),
    event_type: "repeated_neighbor_interaction",
    signals: ["repeated_body_orientation"],
  },
];

const ids = (list) => list.map((event) => event.id);

describe("filterEvents", () => {
  it("returns everything newest first with no filters", () => {
    expect(ids(filterEvents(events, EMPTY_FILTERS))).toEqual(["e1", "e3", "e2"]);
  });

  it("filters by priority, status, seat and camera together", () => {
    expect(ids(filterEvents(events, { ...EMPTY_FILTERS, priority: ["high", "medium"] }))).toEqual(["e1", "e3"]);
    expect(ids(filterEvents(events, { ...EMPTY_FILTERS, status: "dismissed" }))).toEqual(["e2"]);
    expect(ids(filterEvents(events, { ...EMPTY_FILTERS, seat: "C1" }))).toEqual(["e3"]);
    expect(ids(filterEvents(events, { ...EMPTY_FILTERS, camera: "camera_2" }))).toEqual(["e1", "e2"]);
  });

  it("treats the 'to' time as inclusive of that whole minute", () => {
    expect(ids(filterEvents(events, { ...EMPTY_FILTERS, from: "10:30", to: "10:42" }))).toEqual(["e1", "e3"]);
    expect(ids(filterEvents(events, { ...EMPTY_FILTERS, to: "10:41" }))).toEqual(["e3", "e2"]);
  });

  it("searches seat and signal labels", () => {
    expect(ids(filterEvents(events, { ...EMPTY_FILTERS, q: "body turn" }))).toEqual(["e3"]);
    expect(ids(filterEvents(events, { ...EMPTY_FILTERS, q: "b4" }))).toEqual(["e1"]);
  });
});

describe("URL round trip", () => {
  it("survives serialisation and drops invalid values", () => {
    const filters = { ...EMPTY_FILTERS, priority: ["high"], seat: "B4", from: "10:00" };
    expect(filtersFromSearchParams(filtersToSearchParams(filters))).toEqual(filters);

    const junk = new URLSearchParams("priority=urgent&status=guilty&from=25:99");
    expect(filtersFromSearchParams(junk)).toEqual(EMPTY_FILTERS);
    expect(hasActiveFilters(filtersFromSearchParams(junk))).toBe(false);
  });
});
