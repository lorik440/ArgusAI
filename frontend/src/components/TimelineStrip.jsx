import { useState } from "react";
import { Link } from "react-router-dom";
import { eventSignals, eventStartMs } from "../lib/events.js";
import { formatShortTime, formatTime } from "../lib/format.js";
import { PRIORITIES, PRIORITY_ORDER, REVIEW_STATUSES } from "../lib/scoring.js";

const LANE_HEIGHT = 26;

export function PriorityShape({ priority }) {
  return (
    <svg className={`mark-shape p-${priority}`} width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
      {priority === "high" ? (
        <path d="M0,-5.6 L5.8,4.8 L-5.8,4.8 Z" />
      ) : priority === "medium" ? (
        <path d="M0,-5.8 L5.8,0 L0,5.8 L-5.8,0 Z" />
      ) : (
        <circle r="4.8" />
      )}
    </svg>
  );
}

function tickStepMinutes(spanMinutes) {
  if (spanMinutes <= 105) return 15;
  if (spanMinutes <= 210) return 30;
  return 60;
}

function buildTicks(start, end) {
  const step = tickStepMinutes((end - start) / 60_000);
  const first = new Date(start);
  first.setSeconds(0, 0);
  first.setMinutes(Math.ceil(first.getMinutes() / step) * step);
  const ticks = [];
  for (let t = first.getTime(); t <= end; t += step * 60_000) ticks.push(t);
  return ticks;
}

/**
 * Events across the exam's duration, one lane per priority. Lane position,
 * shape and color all encode priority; faded marks are already handled.
 * The event list below is the table view of the same data.
 */
export default function TimelineStrip({ examId, events, start, end, now }) {
  const [hoverId, setHoverId] = useState(null);
  const span = Math.max(1, end - start);
  const position = (ms) => Math.min(100, Math.max(0, ((ms - start) / span) * 100));
  const ticks = buildTicks(start, end);
  const hovered = events.find((event) => event.id === hoverId);
  const showNow = now >= start && now <= end;

  return (
    <div className="strip">
      <div className="strip-body">
        <div className="strip-labels" aria-hidden="true">
          {PRIORITY_ORDER.map((priority) => (
            <span key={priority} className="strip-label" style={{ height: LANE_HEIGHT }}>
              <PriorityShape priority={priority} />
              {PRIORITIES[priority].label}
            </span>
          ))}
        </div>
        <div className="strip-area" style={{ height: LANE_HEIGHT * PRIORITY_ORDER.length }}>
          {PRIORITY_ORDER.map((priority, index) => (
            <span
              key={priority}
              className="strip-lane-line"
              style={{ top: LANE_HEIGHT * index + LANE_HEIGHT / 2 }}
              aria-hidden="true"
            />
          ))}
          {ticks.map((tick) => (
            <span key={tick} className="strip-tick" style={{ left: `${position(tick)}%` }} aria-hidden="true" />
          ))}
          {showNow && (
            <span className="strip-now" style={{ left: `${position(now)}%` }} aria-hidden="true">
              <span className="strip-now-label">Now</span>
            </span>
          )}
          {events.map((event) => {
            const lane = Math.max(0, PRIORITY_ORDER.indexOf(event.priority));
            const handled = event.review_status !== "needs_review";
            return (
              <Link
                key={event.id}
                to={`/exams/${examId}/events/${event.id}`}
                className={`strip-mark${handled ? " is-handled" : ""}`}
                style={{ left: `${position(eventStartMs(event))}%`, top: LANE_HEIGHT * lane + LANE_HEIGHT / 2 }}
                aria-label={`${formatTime(event.start_time)}, seat ${event.seat_id}, ${PRIORITIES[event.priority]?.label ?? ""} priority, ${REVIEW_STATUSES[event.review_status] ?? event.review_status}`}
                onMouseEnter={() => setHoverId(event.id)}
                onMouseLeave={() => setHoverId((id) => (id === event.id ? null : id))}
                onFocus={() => setHoverId(event.id)}
                onBlur={() => setHoverId((id) => (id === event.id ? null : id))}
              >
                <PriorityShape priority={event.priority} />
              </Link>
            );
          })}
          {hovered && (
            <div
              className={`strip-tooltip${position(eventStartMs(hovered)) > 60 ? " is-right" : ""}`}
              style={{
                left: `${position(eventStartMs(hovered))}%`,
                top: LANE_HEIGHT * Math.max(0, PRIORITY_ORDER.indexOf(hovered.priority)),
              }}
              role="tooltip"
            >
              <strong>
                {formatTime(hovered.start_time)} · Seat {hovered.seat_id}
              </strong>
              <span>
                {PRIORITIES[hovered.priority]?.label} priority · {REVIEW_STATUSES[hovered.review_status]}
              </span>
              <span className="strip-tooltip-signals">
                {eventSignals(hovered)
                  .map((signal) => signal.short)
                  .join(" · ")}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="strip-axis" aria-hidden="true">
        <span className="strip-axis-spacer" />
        <div className="strip-axis-track">
          {ticks.map((tick) => {
            const left = position(tick);
            const align = left < 4 ? "start" : left > 96 ? "end" : "center";
            return (
              <span key={tick} className={`strip-axis-label align-${align}`} style={{ left: `${left}%` }}>
                {formatShortTime(tick)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
