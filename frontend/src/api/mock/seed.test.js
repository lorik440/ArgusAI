import { describe, expect, it } from "vitest";
import { priorityFromScore, scoreFromSignals } from "../../lib/scoring.js";
import { randomLiveEvent } from "./factory.js";
import { createSeed } from "./seed.js";

describe("demo seed", () => {
  const seed = createSeed(Date.UTC(2026, 10, 11, 10, 0, 0));

  it("has one live, one upcoming and one completed exam", () => {
    const now = seed.seededAt;
    const states = seed.exams.map((exam) =>
      now < Date.parse(exam.starts_at) ? "scheduled" : now > Date.parse(exam.ends_at) ? "completed" : "live",
    );
    expect(states.sort()).toEqual(["completed", "live", "scheduled"]);
  });

  it("only contains events whose priority matches their signals", () => {
    for (const event of seed.events) {
      expect(event.priority).toBe(priorityFromScore(scoreFromSignals(event.signals)));
      expect(event.priority).not.toBeNull();
      expect(event.visibility).toHaveLength(2);
    }
  });

  it("generates valid live events", () => {
    let calls = 0;
    const random = () => ((calls += 1) * 0.37) % 1;
    for (let i = 0; i < 10; i += 1) {
      const event = randomLiveEvent({ id: `x${i}`, examId: "exam", seats: ["B2", "B3"], random });
      expect(["low", "medium", "high"]).toContain(event.priority);
      expect(["B2", "B3"]).toContain(event.seat_id);
      expect(Date.parse(event.end_time)).toBeGreaterThan(Date.parse(event.start_time));
    }
  });
});
