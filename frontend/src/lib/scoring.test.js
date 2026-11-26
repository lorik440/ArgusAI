import { describe, expect, it } from "vitest";
import { normalizeSignal, priorityFromScore, scoreFromSignals } from "./scoring.js";

describe("priorityFromScore", () => {
  it("uses the bands from the project guide", () => {
    expect(priorityFromScore(0)).toBeNull();
    expect(priorityFromScore(29)).toBeNull();
    expect(priorityFromScore(30)).toBe("low");
    expect(priorityFromScore(49)).toBe("low");
    expect(priorityFromScore(50)).toBe("medium");
    expect(priorityFromScore(74)).toBe("medium");
    expect(priorityFromScore(75)).toBe("high");
    expect(priorityFromScore(100)).toBe("high");
  });
});

describe("scoreFromSignals", () => {
  it("adds the guide's illustrative weights", () => {
    expect(
      scoreFromSignals([
        "phone_in_restricted_zone",
        "repeated_body_orientation",
        "hand_enters_neighbor_zone",
        "second_camera_supports",
      ]),
    ).toBe(85);
  });

  it("counts a signal type once even if several cameras report it", () => {
    expect(
      scoreFromSignals([
        { type: "repeated_body_orientation", camera_ids: ["camera_1"] },
        { type: "repeated_body_orientation", camera_ids: ["camera_2"] },
      ]),
    ).toBe(25);
  });

  it("caps at 100", () => {
    expect(scoreFromSignals([{ type: "a", weight: 80 }, { type: "b", weight: 80 }])).toBe(100);
  });
});

describe("normalizeSignal", () => {
  it("maps the guide's example signal names to canonical ones", () => {
    const signal = normalizeSignal("hand_crossing_seat_boundary");
    expect(signal.type).toBe("hand_enters_neighbor_zone");
    expect(signal.weight).toBe(30);
  });

  it("keeps unknown signals readable instead of failing", () => {
    const signal = normalizeSignal({ type: "looked_at_clock" });
    expect(signal.label).toBe("Looked at clock");
    expect(signal.weight).toBeNull();
  });
});
