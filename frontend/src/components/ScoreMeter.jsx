import { PRIORITY_BANDS, priorityFromScore } from "../lib/scoring.js";

// Ascending, with each band's share of the 0–100 track.
const BANDS = [...PRIORITY_BANDS]
  .sort((a, b) => a.min - b.min)
  .map((band, index, all) => ({ ...band, width: (all[index + 1]?.min ?? 100) - band.min }));

/**
 * Where the review-priority score sits in the bands from the project guide.
 * It is a ranking aid, not a probability, and the caption says so.
 */
export default function ScoreMeter({ score }) {
  if (score == null) return null;
  const value = Math.max(0, Math.min(100, score));
  const current = priorityFromScore(value);
  const edge = value > 94 ? " is-end" : value < 6 ? " is-start" : "";

  return (
    <div className="score-meter">
      <div
        className="score-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label="Review-priority score"
      >
        {BANDS.map((band) => (
          <span
            key={band.label}
            className={`score-band band-${band.priority ?? "none"}${band.priority === current ? " is-current" : ""}`}
            style={{ width: `${band.width}%` }}
          />
        ))}
        <span className={`score-marker${edge}`} style={{ left: `${value}%` }} aria-hidden="true">
          <span className="score-marker-value">{value}</span>
        </span>
      </div>
      <div className="score-scale" aria-hidden="true">
        {BANDS.map((band) => (
          <span key={band.label} style={{ width: `${band.width}%` }}>
            {band.priority ? band.label.replace(" priority", "") : band.label}
            <span className="score-range">
              {band.min}–{band.max}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
