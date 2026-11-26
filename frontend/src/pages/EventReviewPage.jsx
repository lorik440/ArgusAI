import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/index.js";
import { PriorityBadge, StatusBadge } from "../components/Badges.jsx";
import EvidencePlayer from "../components/EvidencePlayer.jsx";
import ReviewPanel from "../components/ReviewPanel.jsx";
import ScoreMeter from "../components/ScoreMeter.jsx";
import { ErrorState, LoadingState } from "../components/States.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useEvents } from "../hooks/useEvents.js";
import { eventSignals, explainEvent, reviewNeighbours } from "../lib/events.js";
import { cameraLabel, cameraShortLabel, formatDate, formatDuration, formatPercent, formatTime } from "../lib/format.js";
import { eventTypeLabel, scoreFromSignals } from "../lib/scoring.js";
import { useAuth } from "../store/AuthContext.jsx";

function SignalList({ event, cameras }) {
  const signals = eventSignals(event);
  const hasWeights = signals.some((signal) => signal.weight != null);
  const score = event.score ?? (hasWeights ? scoreFromSignals(event.signals) : null);

  return (
    <>
      <table className="signal-table">
        <caption className="visually-hidden">Signals that contributed to this event</caption>
        <thead>
          <tr>
            <th scope="col">Observed signal</th>
            <th scope="col">Seen by</th>
            {hasWeights && (
              <th scope="col" className="num">
                Weight
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {signals.map((signal) => (
            <tr key={signal.type}>
              <td>
                <span className="signal-label">{signal.label}</span>
                <span className="signal-detail">
                  {[
                    signal.occurrences ? `${signal.occurrences}× in window` : null,
                    signal.confidence != null ? `${formatPercent(signal.confidence)} detection confidence` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </td>
              <td>
                {(signal.camera_ids ?? []).map((id) => (
                  <span key={id} className="cam-chip" title={cameraLabel(id, cameras)}>
                    {cameraShortLabel(id)}
                  </span>
                ))}
              </td>
              {hasWeights && <td className="num">{signal.weight != null ? `+${signal.weight}` : "—"}</td>}
            </tr>
          ))}
        </tbody>
        {score != null && (
          <tfoot>
            <tr>
              <th scope="row" colSpan={hasWeights ? 2 : 1}>
                Review-priority score
              </th>
              {hasWeights && <td className="num">{score}</td>}
            </tr>
          </tfoot>
        )}
      </table>
      {score != null && <ScoreMeter score={score} />}
      <p className="fine-print">
        The score ranks events for attention. It is not a probability of cheating, and the weights are development
        defaults that the team tunes on staged recordings.
      </p>
    </>
  );
}

export default function EventReviewPage() {
  const { examId, eventId } = useParams();
  const { canReview } = useAuth();
  const exam = useAsync(() => api.getExam(examId), [examId]);
  const cameras = useAsync(() => api.listCameras(examId), [examId]);
  const single = useAsync(() => api.getEvent(eventId), [eventId]);
  const { events, replaceEvent } = useEvents(examId, { live: exam.data?.status === "live" });

  // Prefer the freshest copy: the live list is updated by the realtime feed.
  const listed = events.find((item) => item.id === eventId);
  const event = useMemo(
    () => (single.data && single.data.id === eventId ? { ...single.data, ...(listed ?? {}) } : listed),
    [single.data, listed, eventId],
  );
  const neighbours = useMemo(() => reviewNeighbours(events, eventId), [events, eventId]);

  if ((single.loading || exam.loading) && !event) return <LoadingState label="Loading event…" />;
  if (!event) {
    return (
      <div className="page">
        <ErrorState error={single.error ?? new Error("Event not found.")} onRetry={single.reload} title="Could not load this event" />
        <Link to={`/exams/${examId}`}>← Back to the exam</Link>
      </div>
    );
  }

  const cameraList = cameras.data ?? [];
  const onReviewed = (updated) => {
    single.setData(updated);
    replaceEvent(updated);
  };

  return (
    <div className="page page--wide">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Exams</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/exams/${examId}`}>{exam.data?.course ?? "Exam"}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">
          Seat {event.seat_id} at {formatTime(event.start_time)}
        </span>
      </nav>

      <header className="page-head review-head">
        <div>
          <p className="eyebrow">Review recommended</p>
          <h1 className="page-title">
            Seat {event.seat_id} <span className="page-title-sub">· {eventTypeLabel(event.event_type)}</span>
          </h1>
          <p className="page-lede">
            {formatDate(event.start_time)} · {formatTime(event.start_time)}–{formatTime(event.end_time)} ·{" "}
            {formatDuration(event.duration_seconds)} · {(event.camera_ids ?? []).map((id) => cameraLabel(id, cameraList)).join(" + ")}
          </p>
        </div>
        <div className="review-head-badges">
          <PriorityBadge priority={event.priority} size="lg" />
          <StatusBadge status={event.review_status} />
        </div>
      </header>

      <p className="notice">
        <strong>This is a prompt for human review, not proof of misconduct.</strong> Students may stretch, look at the
        clock or reach for an eraser for ordinary reasons. Pose estimation describes body orientation, not where a
        student is looking.
      </p>

      <div className="review-grid">
        <div className="review-main">
          <section className="panel" aria-labelledby="evidence-title">
            <div className="panel-head">
              <h2 id="evidence-title" className="panel-title">
                Synchronized evidence
              </h2>
              <span className="panel-meta">Both cameras on one timeline</span>
            </div>
            <EvidencePlayer event={event} cameras={cameraList} layout={exam.data?.seat_layout} />
          </section>

          <section className="panel" aria-labelledby="why-title">
            <h2 id="why-title" className="panel-title">
              Why this was flagged
            </h2>
            <p className="explanation">{explainEvent(event)}</p>
            <SignalList event={event} cameras={cameraList} />
          </section>
        </div>

        <aside className="review-side">
          <ReviewPanel
            event={event}
            examId={examId}
            canReview={canReview}
            nextOpen={neighbours.nextOpen}
            onReviewed={onReviewed}
          />

          <nav className="panel review-nav" aria-label="Other events in this exam">
            <p className="review-nav-position">
              Event {neighbours.position || "–"} of {neighbours.total}
            </p>
            <div className="review-nav-links">
              {neighbours.previous ? (
                <Link className="button button--secondary button--sm" to={`/exams/${examId}/events/${neighbours.previous.id}`}>
                  ← Previous
                </Link>
              ) : (
                <span className="button button--secondary button--sm is-disabled" aria-disabled="true">
                  ← Previous
                </span>
              )}
              {neighbours.next ? (
                <Link className="button button--secondary button--sm" to={`/exams/${examId}/events/${neighbours.next.id}`}>
                  Next →
                </Link>
              ) : (
                <span className="button button--secondary button--sm is-disabled" aria-disabled="true">
                  Next →
                </span>
              )}
            </div>
            {neighbours.nextOpen && (
              <Link className="review-nav-open" to={`/exams/${examId}/events/${neighbours.nextOpen.id}`}>
                Next needing review: Seat {neighbours.nextOpen.seat_id} at {formatTime(neighbours.nextOpen.start_time)}
              </Link>
            )}
            <Link className="review-nav-back" to={`/exams/${examId}`}>
              Back to the live view
            </Link>
          </nav>

          <section className="panel" aria-labelledby="privacy-title">
            <h2 id="privacy-title" className="panel-title">
              Handling evidence
            </h2>
            <p className="fine-print">
              Open evidence only for supervising this exam, and do not copy or share clips. The system does not use
              facial recognition or record audio, and students are identified by seat only.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
