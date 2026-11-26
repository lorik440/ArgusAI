import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/index.js";
import { formatDateTime } from "../lib/format.js";
import { REVIEW_STATUSES } from "../lib/scoring.js";
import { StatusBadge } from "./Badges.jsx";

const DONE_MESSAGE = {
  reviewed: "Marked as reviewed.",
  dismissed: "Event dismissed.",
  needs_review: "Event reopened for review.",
};

/** Supervisor decision for one event. The decision always stays with a person. */
export default function ReviewPanel({ event, examId, canReview, nextOpen, onReviewed }) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    setNote("");
    setError(null);
    setDone(null);
  }, [event.id]);

  async function submit(status) {
    setPending(status);
    setError(null);
    try {
      const updated = await api.reviewEvent(event.id, { status, note });
      setNote("");
      setDone(status);
      onReviewed?.(updated);
    } catch (err) {
      setError(err.message ?? "Could not save the review.");
    } finally {
      setPending(null);
    }
  }

  const open = event.review_status === "needs_review";
  const history = [...(event.review_history ?? [])].reverse();

  return (
    <section className="panel review-panel" aria-labelledby="review-title">
      <div className="panel-head">
        <h2 id="review-title" className="panel-title">
          Supervisor review
        </h2>
        <StatusBadge status={event.review_status} />
      </div>

      {event.review && !open && (
        <div className="review-decision">
          <p>
            {REVIEW_STATUSES[event.review.status]} by <strong>{event.review.reviewer}</strong>,{" "}
            {formatDateTime(event.review.reviewed_at)}
          </p>
          {event.review.note && <blockquote>{event.review.note}</blockquote>}
        </div>
      )}

      {canReview ? (
        <form
          className="review-form"
          onSubmit={(formEvent) => {
            formEvent.preventDefault();
            submit("reviewed");
          }}
        >
          <label className="field">
            <span className="field-label">Note {open ? "(recommended)" : "(optional)"}</span>
            <textarea
              rows={3}
              value={note}
              onChange={(changeEvent) => setNote(changeEvent.target.value)}
              placeholder="What did you see, and what did you do?"
              maxLength={1000}
            />
          </label>
          <div className="review-actions">
            {open ? (
              <>
                <button type="submit" className="button button--primary" disabled={Boolean(pending)}>
                  {pending === "reviewed" ? "Saving…" : "Mark reviewed"}
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={Boolean(pending)}
                  onClick={() => submit("dismissed")}
                >
                  {pending === "dismissed" ? "Saving…" : "Dismiss"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="button button--secondary"
                disabled={Boolean(pending)}
                onClick={() => submit("needs_review")}
              >
                {pending === "needs_review" ? "Saving…" : "Reopen for review"}
              </button>
            )}
          </div>
          {open && (
            <p className="field-hint">
              <strong>Reviewed</strong>: you checked the evidence and handled it. <strong>Dismissed</strong>: no
              concern, for example a false detection or a legitimate movement.
            </p>
          )}
        </form>
      ) : (
        <p className="field-hint">Your role can view events but not record review decisions.</p>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {done && (
        <div className="review-done" role="status">
          <span>{DONE_MESSAGE[done]}</span>
          {nextOpen && done !== "needs_review" && (
            <Link className="button button--secondary button--sm" to={`/exams/${examId}/events/${nextOpen.id}`}>
              Next event needing review →
            </Link>
          )}
        </div>
      )}

      {history.length > 0 && (
        <details className="review-history">
          <summary>Review history ({history.length})</summary>
          <ol>
            {history.map((entry, index) => (
              <li key={`${entry.reviewed_at}-${index}`}>
                <span className="review-history-head">
                  {REVIEW_STATUSES[entry.status]} · {entry.reviewer} · {formatDateTime(entry.reviewed_at)}
                </span>
                {entry.note && <span className="review-history-note">{entry.note}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
