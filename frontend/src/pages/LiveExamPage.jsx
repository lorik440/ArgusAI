import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/index.js";
import { ConnectionBadge, ExamStatusBadge, PriorityBadge } from "../components/Badges.jsx";
import CameraFeed from "../components/CameraFeed.jsx";
import CoverageMap from "../components/CoverageMap.jsx";
import EventTimeline from "../components/EventTimeline.jsx";
import { ErrorState, LoadingState } from "../components/States.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useEvents } from "../hooks/useEvents.js";
import { useNow } from "../hooks/useNow.js";
import { eventStartMs, openEventsBySeat, seatIdsForLayout } from "../lib/events.js";
import { filterEvents, filtersFromSearchParams, filtersToSearchParams } from "../lib/filters.js";
import { formatDate, formatShortTime, formatSpan, formatTimeRange } from "../lib/format.js";

// Seats with an event this recent are outlined on the camera feeds.
const RECENT_MS = 90_000;
const TOAST_MS = 9_000;

export default function LiveExamPage() {
  const { examId } = useParams();
  const now = useNow(1000);
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const setFilters = useCallback(
    (next) => setSearchParams(filtersToSearchParams(next), { replace: true }),
    [setSearchParams],
  );

  const exam = useAsync(() => api.getExam(examId), [examId]);
  const cameras = useAsync(() => api.listCameras(examId), [examId]);
  const coverage = useAsync(() => api.getCoverage(examId), [examId]);
  const live = exam.data?.status === "live";

  const onOtherMessage = useCallback(
    (message) => {
      if (message.type === "camera.status") {
        cameras.setData((list) => (list ?? []).map((camera) => (camera.id === message.data.id ? { ...camera, ...message.data } : camera)));
      } else if (message.type === "coverage.updated") {
        coverage.setData((list) => (list ?? []).map((seat) => (seat.seat_id === message.data.seat_id ? message.data : seat)));
      }
    },
    [cameras.setData, coverage.setData],
  );

  const { events, loading, error, reload, connection, newIds, latest } = useEvents(examId, { live, onOtherMessage });
  const visibleEvents = useMemo(() => filterEvents(events, filters), [events, filters]);

  // Toast for events that arrive while the page is open.
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!latest) return undefined;
    setToast(latest);
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [latest]);

  const layout = exam.data?.seat_layout;
  const seats = useMemo(() => seatIdsForLayout(layout), [layout]);
  const openBySeat = useMemo(() => openEventsBySeat(events), [events]);

  const emptySeats = useMemo(
    () => new Set((coverage.data ?? []).filter((seat) => seat.state === "not_covered").map((seat) => seat.seat_id)),
    [coverage.data],
  );

  // Outline the selected seat and seats with very recent open events.
  const highlightKey = Math.floor(now / 5000);
  const highlights = useMemo(() => {
    const result = {};
    for (const event of events) {
      if (event.review_status === "needs_review" && Date.now() - eventStartMs(event) < RECENT_MS) {
        result[event.seat_id] = event.priority;
      }
    }
    if (filters.seat) result[filters.seat] = result[filters.seat] ?? "selected";
    return result;
    // highlightKey re-evaluates "recent" every few seconds without re-rendering the scene each second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, filters.seat, highlightKey]);

  if (exam.loading && !exam.data) return <LoadingState label="Loading exam…" />;
  if (exam.error && !exam.data) {
    return (
      <div className="page">
        <ErrorState error={exam.error} onRetry={exam.reload} title="Could not load this exam" />
        <Link to="/">← Back to exams</Link>
      </div>
    );
  }

  const data = exam.data;
  const start = Date.parse(data.starts_at);
  const end = Date.parse(data.ends_at);
  const inactiveMessage =
    data.status === "scheduled"
      ? `Monitoring starts at ${formatShortTime(data.starts_at)}.`
      : data.status === "completed"
        ? "This exam has ended. Live feeds are off; recorded evidence is available on each event."
        : null;

  return (
    <div className="page page--wide">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Exams</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{data.course}</span>
      </nav>

      <header className="page-head exam-head">
        <div>
          <div className="exam-head-badges">
            <ExamStatusBadge status={data.status} />
            {live && <ConnectionBadge status={connection} />}
          </div>
          <h1 className="page-title">
            {data.course} <span className="page-title-sub">· {data.title}</span>
          </h1>
          <p className="page-lede">
            {data.room} · {formatDate(data.starts_at)} · {formatTimeRange(data.starts_at, data.ends_at)}
            {live && (
              <>
                {" "}
                · {formatSpan(now - start)} elapsed, {formatSpan(end - now)} left
              </>
            )}
          </p>
        </div>
      </header>

      <div className="live-grid">
        <div className="live-main">
          <section className="feeds" aria-label="Camera feeds">
            {cameras.loading && !cameras.data ? (
              <LoadingState label="Connecting to cameras…" />
            ) : cameras.error && !cameras.data ? (
              <ErrorState error={cameras.error} onRetry={cameras.reload} title="Could not load cameras" />
            ) : (
              (cameras.data ?? []).map((camera) => (
                <CameraFeed
                  key={camera.id}
                  camera={camera}
                  layout={layout}
                  emptySeats={live ? emptySeats : undefined}
                  highlights={highlights}
                  now={now}
                  inactiveMessage={inactiveMessage}
                />
              ))
            )}
          </section>

          <CoverageMap
            layout={layout}
            coverage={coverage.data}
            openBySeat={openBySeat}
            selectedSeat={filters.seat}
            onSelectSeat={(seat) => setFilters({ ...filters, seat })}
            live={live}
          />
        </div>

        <div className="live-side">
          <EventTimeline
            exam={data}
            events={events}
            visibleEvents={visibleEvents}
            filters={filters}
            onFiltersChange={setFilters}
            seats={seats}
            cameras={cameras.data ?? []}
            newIds={newIds}
            loading={loading}
            error={error}
            onRetry={reload}
            now={now}
          />
        </div>
      </div>

      <div className="toast-region" aria-live="polite">
        {toast && (
          <div className="toast" role="status">
            <div className="toast-body">
              <span className="toast-title">
                New review event · Seat {toast.seat_id} <PriorityBadge priority={toast.priority} />
              </span>
              <span className="toast-detail">Review recommended. Check the evidence before acting.</span>
            </div>
            <Link className="button button--primary button--sm" to={`/exams/${examId}/events/${toast.id}`}>
              Open
            </Link>
            <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => setToast(null)}>
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
