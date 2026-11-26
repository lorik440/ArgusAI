import { EMPTY_FILTERS, hasActiveFilters } from "../lib/filters.js";
import { cameraLabel } from "../lib/format.js";
import { PRIORITIES, PRIORITY_ORDER, REVIEW_STATUSES } from "../lib/scoring.js";

/** One filter row that scopes both the timeline strip and the event list. */
export default function EventFilters({ filters, onChange, seats, cameras }) {
  const update = (patch) => onChange({ ...filters, ...patch });
  const togglePriority = (priority) => {
    const next = filters.priority.includes(priority)
      ? filters.priority.filter((item) => item !== priority)
      : [...filters.priority, priority];
    update({ priority: next });
  };

  return (
    <div className="filters" role="search" aria-label="Filter review events">
      <div className="filters-row">
        <div className="chip-group" role="group" aria-label="Priority">
          {PRIORITY_ORDER.map((priority) => (
            <button
              key={priority}
              type="button"
              className={`chip p-${priority}`}
              aria-pressed={filters.priority.includes(priority)}
              onClick={() => togglePriority(priority)}
            >
              <span className="priority-glyph" aria-hidden="true">
                {PRIORITIES[priority].glyph}
              </span>
              {PRIORITIES[priority].label}
            </button>
          ))}
        </div>
        <label className="field field--inline">
          <span className="visually-hidden">Search events</span>
          <input
            type="search"
            placeholder="Search seat, signal…"
            value={filters.q}
            onChange={(event) => update({ q: event.target.value })}
          />
        </label>
      </div>
      <div className="filters-row">
        <label className="field field--inline">
          <span className="field-label">Status</span>
          <select value={filters.status} onChange={(event) => update({ status: event.target.value })}>
            <option value="">All</option>
            {Object.entries(REVIEW_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--inline">
          <span className="field-label">Seat</span>
          <select value={filters.seat} onChange={(event) => update({ seat: event.target.value })}>
            <option value="">All</option>
            {seats.map((seat) => (
              <option key={seat} value={seat}>
                {seat}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--inline">
          <span className="field-label">Camera</span>
          <select value={filters.camera} onChange={(event) => update({ camera: event.target.value })}>
            <option value="">All</option>
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {cameraLabel(camera.id, cameras)}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--inline">
          <span className="field-label">From</span>
          <input type="time" value={filters.from} onChange={(event) => update({ from: event.target.value })} />
        </label>
        <label className="field field--inline">
          <span className="field-label">To</span>
          <input type="time" value={filters.to} onChange={(event) => update({ to: event.target.value })} />
        </label>
        {hasActiveFilters(filters) && (
          <button type="button" className="button button--ghost button--sm" onClick={() => onChange({ ...EMPTY_FILTERS })}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
