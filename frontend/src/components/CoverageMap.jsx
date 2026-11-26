import { PRIORITIES } from "../lib/scoring.js";
import "./CoverageMap.css";

export const COVERAGE_STATES = {
  visible: { label: "Visible and tracked", glyph: "●" },
  partial: { label: "Partly visible or uncertain", glyph: "◐" },
  not_covered: { label: "Not covered or not detected", glyph: "○" },
};

/**
 * Classroom floor plan. Each seat shows its monitoring state (green, yellow,
 * grey, as in the project guide) and a flag when it has events awaiting
 * review. Selecting a seat filters the event list.
 */
export default function CoverageMap({ layout, coverage, openBySeat, selectedSeat, onSelectSeat, live }) {
  const rows = layout?.rows ?? ["A", "B", "C"];
  const columns = layout?.columns ?? 4;
  const bySeat = new Map((coverage ?? []).map((item) => [item.seat_id, item]));

  return (
    <section className="panel coverage" aria-labelledby="coverage-title">
      <div className="panel-head">
        <h2 id="coverage-title" className="panel-title">
          Classroom coverage
        </h2>
        <ul className="coverage-legend" aria-label="Legend">
          {Object.entries(COVERAGE_STATES).map(([state, info]) => (
            <li key={state} className={`cov-${state}`}>
              <span className="cov-glyph" aria-hidden="true">
                {info.glyph}
              </span>
              {info.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="coverage-room">
        <div className="coverage-front">
          <span>Front of room · board</span>
          <span className="coverage-camera coverage-camera--front" title="Camera 2, front-right wall">
            Cam 2 ◤
          </span>
        </div>
        <div className="coverage-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {rows.flatMap((row) =>
            Array.from({ length: columns }, (_, index) => {
              const seat = `${row}${index + 1}`;
              const info = bySeat.get(seat);
              const state = live ? info?.state ?? "not_covered" : "not_covered";
              const open = openBySeat?.get(seat);
              const selected = selectedSeat === seat;
              const stateInfo = COVERAGE_STATES[state] ?? COVERAGE_STATES.not_covered;
              const description = [
                `Seat ${seat}`,
                live ? stateInfo.label : "monitoring not running",
                live && info?.note ? info.note : null,
                open ? `${open.count} ${open.count === 1 ? "event needs" : "events need"} review` : null,
              ]
                .filter(Boolean)
                .join(". ");
              return (
                <button
                  key={seat}
                  type="button"
                  className={`seat cov-${state}${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  aria-label={description}
                  title={description}
                  onClick={() => onSelectSeat?.(selected ? "" : seat)}
                >
                  <span className="seat-glyph" aria-hidden="true">
                    {stateInfo.glyph}
                  </span>
                  <span className="seat-id">{seat}</span>
                  {open && (
                    <span className={`seat-flag p-${open.priority}`} aria-hidden="true">
                      <span className="priority-glyph">{PRIORITIES[open.priority]?.glyph}</span>
                      {open.count}
                    </span>
                  )}
                </button>
              );
            }),
          )}
        </div>
        <div className="coverage-back">
          <span className="coverage-camera" title="Camera 1, back-left corner">
            ◣ Cam 1
          </span>
          <span>Back of room</span>
        </div>
      </div>
      <p className="panel-foot">
        {live
          ? "Select a seat to show only its events. Flags count events still needing review."
          : "Coverage is shown while monitoring is running. Select a seat to filter its events."}
      </p>
    </section>
  );
}
