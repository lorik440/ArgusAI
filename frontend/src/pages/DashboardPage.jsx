import { Link } from "react-router-dom";
import { api, USE_MOCKS } from "../api/index.js";
import { resetMockData } from "../api/mock/mockApi.js";
import { ExamStatusBadge } from "../components/Badges.jsx";
import ServiceStatus from "../components/ServiceStatus.jsx";
import { EmptyState, ErrorState, LoadingState } from "../components/States.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useNow } from "../hooks/useNow.js";
import { formatDate, formatRelative, formatSpan, formatTimeRange } from "../lib/format.js";
import { useAuth } from "../store/AuthContext.jsx";

const GROUPS = [
  { status: "live", title: "Live now", empty: "No exam is being monitored right now." },
  { status: "scheduled", title: "Upcoming", empty: "No upcoming exams." },
  { status: "completed", title: "Completed", empty: "No completed exams yet." },
];

function ExamCard({ exam, now }) {
  const open = exam.event_counts?.needs_review ?? 0;
  const start = Date.parse(exam.starts_at);
  const end = Date.parse(exam.ends_at);
  const timing =
    exam.status === "live"
      ? `${formatSpan(now - start)} elapsed · ${formatSpan(end - now)} left`
      : exam.status === "scheduled"
        ? `Starts ${formatRelative(exam.starts_at, now)}`
        : `Ended ${formatRelative(exam.ends_at, now)}`;

  return (
    <article className={`exam-card exam-card--${exam.status}`}>
      <div className="exam-card-head">
        <ExamStatusBadge status={exam.status} />
        <span className="exam-card-room">{exam.room}</span>
      </div>
      <h3 className="exam-card-title">
        <Link to={`/exams/${exam.id}`}>{exam.course}</Link>
      </h3>
      <p className="exam-card-subtitle">{exam.title}</p>
      <dl className="exam-card-meta">
        <div>
          <dt>Date</dt>
          <dd>{formatDate(exam.starts_at)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatTimeRange(exam.starts_at, exam.ends_at)}</dd>
        </div>
        <div>
          <dt>Cameras</dt>
          <dd>
            {exam.status === "live" ? `${exam.cameras_online ?? 0} of ${exam.camera_count ?? 0} online` : `${exam.camera_count ?? 0} assigned`}
          </dd>
        </div>
      </dl>
      <p className="exam-card-timing">{timing}</p>
      <div className="exam-card-foot">
        <span className={`open-count${open ? " has-open" : ""}`}>
          {open ? `${open} ${open === 1 ? "event needs" : "events need"} review` : "Nothing waiting for review"}
        </span>
        <Link
          className={`button ${exam.status === "live" ? "button--primary" : "button--secondary"} button--sm`}
          to={`/exams/${exam.id}`}
        >
          {exam.status === "live" ? "Open live view" : exam.status === "scheduled" ? "View exam" : "Review events"}
        </Link>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const now = useNow(30_000);
  const { data: exams, loading, error, reload } = useAsync(() => api.listExams(), []);

  const totalOpen = (exams ?? []).reduce((sum, exam) => sum + (exam.event_counts?.needs_review ?? 0), 0);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Signed in as {user?.name}</p>
          <h1 className="page-title">Exams</h1>
          {exams && (
            <p className="page-lede">
              {totalOpen
                ? `${totalOpen} ${totalOpen === 1 ? "event is" : "events are"} waiting for a supervisor's review.`
                : "No events are waiting for review."}
            </p>
          )}
        </div>
        {USE_MOCKS && (
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={() => {
              resetMockData();
              reload();
            }}
          >
            Reset demo data
          </button>
        )}
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          {loading && !exams ? (
            <LoadingState label="Loading exams…" />
          ) : error && !exams ? (
            <ErrorState error={error} onRetry={reload} title="Could not load exams" />
          ) : (
            GROUPS.map((group) => {
              const items = (exams ?? [])
                .filter((exam) => exam.status === group.status)
                .sort((a, b) =>
                  group.status === "completed"
                    ? Date.parse(b.starts_at) - Date.parse(a.starts_at)
                    : Date.parse(a.starts_at) - Date.parse(b.starts_at),
                );
              return (
                <section key={group.status} className="exam-group" aria-labelledby={`group-${group.status}`}>
                  <h2 id={`group-${group.status}`} className="section-title">
                    {group.title}
                    <span className="section-count">{items.length}</span>
                  </h2>
                  {items.length ? (
                    <div className="exam-cards">
                      {items.map((exam) => (
                        <ExamCard key={exam.id} exam={exam} now={now} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState title={group.empty} />
                  )}
                </section>
              );
            })
          )}
        </div>
        <aside className="dashboard-side">
          <ServiceStatus />
          <section className="panel guidance" aria-labelledby="guidance-title">
            <h2 id="guidance-title" className="panel-title">
              How to read alerts
            </h2>
            <ul>
              <li>
                An event means <strong>review recommended</strong>. It is not proof that a student did anything wrong.
              </li>
              <li>
                Students may stretch, look at the clock or reach for an eraser for ordinary reasons. Check the evidence
                from both cameras before acting.
              </li>
              <li>
                Body orientation is not gaze. The system estimates posture, not where someone is looking.
              </li>
              <li>Record every decision as reviewed or dismissed so there is a clear record.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
