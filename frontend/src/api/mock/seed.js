import { buildMockEvent, seatIds } from "./factory.js";

/**
 * Demo data for the dashboard while the backend API is being built.
 * Everything is staged: no real students, footage, or names. Students are
 * identified only by seat, as the project's privacy rules require.
 */

const MINUTE = 60_000;
const iso = (ms) => new Date(ms).toISOString();

export const DEMO_SUPERVISOR = "Prof. Demo Supervisor";

const SEAT_LAYOUT = { rows: ["A", "B", "C"], columns: 4 };

function camerasFor(examId, { live }) {
  return [
    {
      id: "camera_1",
      exam_id: examId,
      name: "Camera 1",
      description: "Classroom overview",
      role: "overview",
      placement: "Back-left corner, mounted high",
      status: live ? "online" : "offline",
      analyzed_fps: live ? 4.2 : null,
      stream_url: null,
      stream_type: null,
    },
    {
      id: "camera_2",
      exam_id: examId,
      name: "Camera 2",
      description: "Desk-level view",
      role: "desk",
      placement: "Front-right wall, angled toward desks",
      status: live ? "online" : "offline",
      analyzed_fps: live ? 3.8 : null,
      stream_url: null,
      stream_type: null,
    },
  ];
}

function liveCoverage() {
  const partial = { A4: "Partly hidden behind a pillar from Camera 2", C4: "Edge of Camera 1's view" };
  return seatIds(SEAT_LAYOUT).map((seat) => {
    if (seat === "A1") {
      return {
        seat_id: seat,
        state: "not_covered",
        cameras: { camera_1: "not_detected", camera_2: "not_detected" },
        note: "No one detected at this seat",
      };
    }
    if (partial[seat]) {
      return {
        seat_id: seat,
        state: "partial",
        cameras: { camera_1: seat === "C4" ? "partial" : "visible", camera_2: seat === "A4" ? "partial" : "visible" },
        note: partial[seat],
      };
    }
    return { seat_id: seat, state: "visible", cameras: { camera_1: "visible", camera_2: "visible" }, note: null };
  });
}

function idleCoverage() {
  return seatIds(SEAT_LAYOUT).map((seat) => ({
    seat_id: seat,
    state: "not_covered",
    cameras: { camera_1: "not_detected", camera_2: "not_detected" },
    note: "Monitoring is not running for this exam",
  }));
}

function review(status, at, note) {
  return { status, reviewer: DEMO_SUPERVISOR, reviewed_at: iso(at), note };
}

export function createSeed(now = Date.now()) {
  const liveStart = now - 38 * MINUTE;
  const pastStart = new Date(now - 24 * 60 * MINUTE);
  pastStart.setHours(9, 0, 0, 0);
  const pastStartMs = pastStart.getTime();
  const upcomingStart = now + 3 * 60 * MINUTE;

  const exams = [
    {
      id: "exam-dsa-midterm",
      course: "Data Structures and Algorithms",
      title: "Midterm exam",
      room: "Classroom 204",
      starts_at: iso(liveStart),
      ends_at: iso(liveStart + 90 * MINUTE),
      supervisor: DEMO_SUPERVISOR,
      seat_layout: SEAT_LAYOUT,
      rules: { phones_prohibited: true },
    },
    {
      id: "exam-networks-final",
      course: "Computer Networks",
      title: "Final exam",
      room: "Classroom 105",
      starts_at: iso(upcomingStart),
      ends_at: iso(upcomingStart + 120 * MINUTE),
      supervisor: DEMO_SUPERVISOR,
      seat_layout: SEAT_LAYOUT,
      rules: { phones_prohibited: true },
    },
    {
      id: "exam-databases-midterm",
      course: "Database Systems",
      title: "Midterm exam",
      room: "Classroom 204",
      starts_at: iso(pastStartMs),
      ends_at: iso(pastStartMs + 90 * MINUTE),
      supervisor: DEMO_SUPERVISOR,
      seat_layout: SEAT_LAYOUT,
      rules: { phones_prohibited: true },
    },
  ];

  const live = exams[0].id;
  const past = exams[2].id;
  const at = (base, minutes, seconds = 0) => base + minutes * MINUTE + seconds * 1000;

  const events = [
    buildMockEvent({
      id: "evt-1001",
      examId: live,
      seat: "A2",
      start: at(liveStart, 7, 12),
      duration: 6.4,
      cameras: ["camera_2"],
      signals: [
        { type: "phone_in_restricted_zone", camera_ids: ["camera_2"], occurrences: 4, confidence: 0.71 },
        { type: "behavior_repeats", camera_ids: ["camera_2"], occurrences: 2 },
      ],
      visibility: { camera_1: "partial" },
      status: "dismissed",
      review: review("dismissed", at(liveStart, 10), "Object was a calculator, which this exam allows."),
    }),
    buildMockEvent({
      id: "evt-1002",
      examId: live,
      seat: "B4",
      start: at(liveStart, 12, 40),
      duration: 8.3,
      cameras: ["camera_1", "camera_2"],
      signals: [
        { type: "repeated_body_orientation", camera_ids: ["camera_1"], occurrences: 3, confidence: 0.84 },
        { type: "hand_enters_neighbor_zone", camera_ids: ["camera_1", "camera_2"], occurrences: 2, confidence: 0.77 },
        { type: "second_camera_supports", camera_ids: ["camera_2"] },
      ],
      visibility: { camera_2: "partial" },
      status: "reviewed",
      review: review("reviewed", at(liveStart, 15), "Borrowed an eraser from B3. Spoke to both students."),
    }),
    buildMockEvent({
      id: "evt-1003",
      examId: live,
      seat: "C1",
      start: at(liveStart, 19, 5),
      duration: 9.1,
      cameras: ["camera_1"],
      signals: [
        { type: "repeated_body_orientation", camera_ids: ["camera_1"], occurrences: 4, confidence: 0.8 },
        { type: "behavior_repeats", camera_ids: ["camera_1"], occurrences: 3 },
      ],
      visibility: { camera_2: "not_visible" },
    }),
    buildMockEvent({
      id: "evt-1004",
      examId: live,
      seat: "B4",
      start: at(liveStart, 26, 18),
      duration: 11,
      cameras: ["camera_1", "camera_2"],
      signals: [
        { type: "phone_in_restricted_zone", camera_ids: ["camera_2"], occurrences: 5, confidence: 0.87 },
        { type: "repeated_body_orientation", camera_ids: ["camera_1"], occurrences: 3, confidence: 0.82 },
        { type: "hand_enters_neighbor_zone", camera_ids: ["camera_1"], occurrences: 2, confidence: 0.74 },
        { type: "second_camera_supports", camera_ids: ["camera_2"] },
      ],
    }),
    buildMockEvent({
      id: "evt-1005",
      examId: live,
      seat: "A3",
      start: at(liveStart, 30, 44),
      duration: 7.2,
      cameras: ["camera_1", "camera_2"],
      signals: [
        { type: "hand_enters_neighbor_zone", camera_ids: ["camera_2"], occurrences: 3, confidence: 0.79 },
        { type: "behavior_repeats", camera_ids: ["camera_2"], occurrences: 3 },
        { type: "second_camera_supports", camera_ids: ["camera_1"] },
      ],
    }),
    buildMockEvent({
      id: "evt-1006",
      examId: live,
      seat: "C3",
      start: at(liveStart, 34, 2),
      duration: 5.8,
      cameras: ["camera_1", "camera_2"],
      signals: [
        { type: "phone_in_restricted_zone", camera_ids: ["camera_1"], occurrences: 3, confidence: 0.66 },
        { type: "behavior_repeats", camera_ids: ["camera_1"], occurrences: 2 },
        { type: "second_camera_supports", camera_ids: ["camera_2"] },
      ],
      visibility: { camera_2: "partial" },
    }),
    buildMockEvent({
      id: "evt-1007",
      examId: live,
      seat: "B2",
      start: at(liveStart, 36, 27),
      duration: 6.9,
      cameras: ["camera_1"],
      signals: [
        { type: "repeated_body_orientation", camera_ids: ["camera_1"], occurrences: 3, confidence: 0.81 },
        { type: "hand_enters_neighbor_zone", camera_ids: ["camera_1"], occurrences: 2, confidence: 0.72 },
      ],
      visibility: { camera_2: "partial" },
    }),

    buildMockEvent({
      id: "evt-0901",
      examId: past,
      seat: "B1",
      start: at(pastStartMs, 14, 30),
      duration: 7.5,
      cameras: ["camera_1", "camera_2"],
      signals: [
        { type: "repeated_body_orientation", camera_ids: ["camera_1"], occurrences: 3, confidence: 0.78 },
        { type: "hand_enters_neighbor_zone", camera_ids: ["camera_2"], occurrences: 2, confidence: 0.7 },
      ],
      status: "dismissed",
      review: review("dismissed", at(pastStartMs, 17), "Stretching. No interaction with the neighboring desk."),
    }),
    buildMockEvent({
      id: "evt-0902",
      examId: past,
      seat: "C2",
      start: at(pastStartMs, 33, 10),
      duration: 10.2,
      cameras: ["camera_1", "camera_2"],
      signals: [
        { type: "phone_in_restricted_zone", camera_ids: ["camera_2"], occurrences: 6, confidence: 0.9 },
        { type: "behavior_repeats", camera_ids: ["camera_2"], occurrences: 3 },
        { type: "second_camera_supports", camera_ids: ["camera_1"] },
      ],
      status: "reviewed",
      review: review("reviewed", at(pastStartMs, 36), "Phone on desk. Collected by the supervisor and returned after the exam."),
    }),
    buildMockEvent({
      id: "evt-0903",
      examId: past,
      seat: "A4",
      start: at(pastStartMs, 51, 48),
      duration: 6.1,
      cameras: ["camera_1"],
      signals: [
        { type: "repeated_body_orientation", camera_ids: ["camera_1"], occurrences: 4, confidence: 0.74 },
        { type: "behavior_repeats", camera_ids: ["camera_1"], occurrences: 2 },
      ],
      visibility: { camera_2: "partial" },
      status: "dismissed",
      review: review("dismissed", at(pastStartMs, 55), "Looking at the wall clock."),
    }),
    buildMockEvent({
      id: "evt-0904",
      examId: past,
      seat: "B3",
      start: at(pastStartMs, 72, 3),
      duration: 9.4,
      cameras: ["camera_1", "camera_2"],
      signals: [
        { type: "repeated_body_orientation", camera_ids: ["camera_1"], occurrences: 4, confidence: 0.83 },
        { type: "hand_enters_neighbor_zone", camera_ids: ["camera_1", "camera_2"], occurrences: 3, confidence: 0.76 },
        { type: "behavior_repeats", camera_ids: ["camera_1"], occurrences: 3 },
        { type: "second_camera_supports", camera_ids: ["camera_2"] },
      ],
    }),
  ];

  return {
    version: 1,
    seededAt: now,
    exams,
    cameras: {
      [live]: camerasFor(live, { live: true }),
      [exams[1].id]: camerasFor(exams[1].id, { live: false }),
      [past]: camerasFor(past, { live: false }),
    },
    coverage: {
      [live]: liveCoverage(),
      [exams[1].id]: idleCoverage(),
      [past]: idleCoverage(),
    },
    events,
    nextEventNumber: 1008,
  };
}
