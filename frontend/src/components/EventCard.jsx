import { Link } from "react-router-dom";
import { eventSignals } from "../lib/events.js";
import { cameraShortLabel, formatDuration, formatRelative, formatTime } from "../lib/format.js";
import { eventTypeLabel } from "../lib/scoring.js";
import { PriorityBadge, StatusBadge } from "./Badges.jsx";

export default function EventCard({ event, examId, isNew, now }) {
  const signals = eventSignals(event);
  return (
    <Link
      to={`/exams/${examId}/events/${event.id}`}
      className={`event-card p-${event.priority} s-${event.review_status}${isNew ? " is-new" : ""}`}
    >
      <div className="event-card-time">
        <time dateTime={event.start_time}>{formatTime(event.start_time)}</time>
        <span>{formatRelative(event.start_time, now)}</span>
      </div>
      <div className="event-card-main">
        <div className="event-card-title">
          <span className="event-card-seat">Seat {event.seat_id}</span>
          <PriorityBadge priority={event.priority} />
          {isNew && <span className="new-badge">New</span>}
        </div>
        <div className="event-card-meta">
          {eventTypeLabel(event.event_type)} · {formatDuration(event.duration_seconds)} ·{" "}
          {(event.camera_ids ?? []).map(cameraShortLabel).join(" + ")}
        </div>
        <ul className="signal-chips" aria-label="Observed signals">
          {signals.map((signal) => (
            <li key={signal.type}>{signal.short}</li>
          ))}
        </ul>
      </div>
      <div className="event-card-status">
        <StatusBadge status={event.review_status} />
      </div>
    </Link>
  );
}
