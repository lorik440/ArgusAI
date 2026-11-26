import { PRIORITIES, REVIEW_STATUSES } from "../lib/scoring.js";

/** Review priority: color plus a shape glyph plus a text label, never color alone. */
export function PriorityBadge({ priority, size }) {
  const info = PRIORITIES[priority];
  if (!info) return null;
  return (
    <span className={`priority-badge p-${priority}${size === "lg" ? " priority-badge--lg" : ""}`} title="Review priority">
      <span className="priority-glyph" aria-hidden="true">
        {info.glyph}
      </span>
      {info.label}
      <span className="visually-hidden"> review priority</span>
    </span>
  );
}

const STATUS_GLYPH = { needs_review: "●", reviewed: "✓", dismissed: "✕" };

export function StatusBadge({ status }) {
  const label = REVIEW_STATUSES[status] ?? status;
  return (
    <span className={`status-badge s-${status}`}>
      <span aria-hidden="true">{STATUS_GLYPH[status] ?? "•"}</span>
      {label}
    </span>
  );
}

const EXAM_STATUS = {
  live: "Live",
  scheduled: "Scheduled",
  completed: "Completed",
};

export function ExamStatusBadge({ status }) {
  return (
    <span className={`exam-status exam-status--${status}`}>
      <span className="exam-status-dot" aria-hidden="true" />
      {EXAM_STATUS[status] ?? status}
    </span>
  );
}

const CONNECTION = {
  idle: { label: "Live updates off", tone: "off" },
  connecting: { label: "Connecting…", tone: "wait" },
  open: { label: "Live updates on", tone: "on" },
  reconnecting: { label: "Reconnecting…", tone: "wait" },
  closed: { label: "Disconnected", tone: "off" },
};

export function ConnectionBadge({ status }) {
  const info = CONNECTION[status] ?? CONNECTION.idle;
  return (
    <span className={`connection connection--${info.tone}`} role="status">
      <span className="connection-dot" aria-hidden="true" />
      {info.label}
    </span>
  );
}
