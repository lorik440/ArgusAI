import { countByStatus } from "../lib/events.js";
import { hasActiveFilters } from "../lib/filters.js";
import EventCard from "./EventCard.jsx";
import EventFilters from "./EventFilters.jsx";
import { EmptyState, ErrorState, LoadingState } from "./States.jsx";
import TimelineStrip from "./TimelineStrip.jsx";
import "./EventTimeline.css";

/** Filters, the time strip, and the list of review events for one exam. */
export default function EventTimeline({
  exam,
  events,
  visibleEvents,
  filters,
  onFiltersChange,
  seats,
  cameras,
  newIds,
  loading,
  error,
  onRetry,
  now,
}) {
  const counts = countByStatus(events);
  const filtered = hasActiveFilters(filters);
  const start = Date.parse(exam.starts_at);
  const end = Date.parse(exam.ends_at);

  return (
    <section className="panel timeline" aria-labelledby="timeline-title">
      <div className="panel-head">
        <h2 id="timeline-title" className="panel-title">
          Review events
        </h2>
        <p className="timeline-counts">
          <strong>{counts.needs_review}</strong> need review · {counts.reviewed} reviewed · {counts.dismissed} dismissed
        </p>
      </div>

      <EventFilters filters={filters} onChange={onFiltersChange} seats={seats} cameras={cameras} />

      <TimelineStrip examId={exam.id} events={visibleEvents} start={start} end={end} now={now} />

      {error && !events.length ? (
        <ErrorState error={error} onRetry={onRetry} title="Could not load events" />
      ) : loading && !events.length ? (
        <LoadingState label="Loading events…" />
      ) : visibleEvents.length === 0 ? (
        <EmptyState title={filtered ? "No events match these filters" : "No review events yet"}>
          {filtered
            ? "Clear or change the filters to see more events."
            : "Events appear here when the system observes behavior that may need a supervisor's attention."}
        </EmptyState>
      ) : (
        <>
          <p className="timeline-summary" aria-live="polite">
            {filtered
              ? `Showing ${visibleEvents.length} of ${events.length} events`
              : `${events.length} ${events.length === 1 ? "event" : "events"}, newest first`}
          </p>
          <ol className="event-list">
            {visibleEvents.map((event) => (
              <li key={event.id}>
                <EventCard event={event} examId={exam.id} isNew={newIds?.has(event.id)} now={now} />
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
