import { memo } from "react";
import { getScene, VIEW } from "./geometry.js";
import "./CameraScene.css";

function seatHash(seat) {
  let hash = 0;
  for (const char of seat) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return hash;
}

/**
 * Schematic classroom from a camera's viewpoint, used only in demo mode.
 * It is clearly labelled by its parent as a demo scene, not footage.
 *
 * highlights: { [seatId]: "high" | "medium" | "low" | "faint" | "selected" }
 */
function CameraScene({ role = "overview", layout, emptySeats, highlights, activeSeats, showLabels = true, label }) {
  const scene = getScene(role, layout);

  return (
    <svg
      className="scene"
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label}
    >
      <rect width={VIEW.width} height={VIEW.height} className="scene-void" />
      {scene.background.map((shape, index) => (
        <polygon key={index} points={shape.points} className={`scene-${shape.className}`} />
      ))}
      <g className="scene-floor-lines">
        {scene.floorLines.map(([a, b], index) => (
          <line key={index} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
        ))}
      </g>
      {scene.items.map((item) => {
        if (item.kind === "student" && emptySeats?.has(item.seat)) return null;
        const active = item.kind === "student" && activeSeats?.has(item.seat);
        return (
          <g
            key={item.key}
            className={`scene-item scene-${item.kind}${active ? " is-active" : ""}`}
            style={item.kind === "student" ? { animationDelay: `${-(seatHash(item.seat) % 50) / 10}s` } : undefined}
          >
            {item.parts.map((part, index) =>
              part.type === "poly" ? (
                <polygon key={index} points={part.points} className={part.className} />
              ) : (
                <circle key={index} cx={part.cx} cy={part.cy} r={part.r} className={part.className} />
              ),
            )}
          </g>
        );
      })}
      {showLabels &&
        Object.entries(scene.seats).map(([seat, info]) => (
          <text key={seat} x={info.label[0]} y={info.label[1]} className="scene-seat-label">
            {seat}
          </text>
        ))}
      {Object.entries(highlights ?? {}).map(([seat, tone]) => {
        const bounds = scene.seats[seat]?.bounds;
        if (!bounds) return null;
        const pad = 5;
        const [x0, y0, x1, y1] = bounds;
        return (
          <g key={seat} className={`scene-highlight tone-${tone}`}>
            <rect x={x0 - pad} y={y0 - pad} width={x1 - x0 + pad * 2} height={y1 - y0 + pad * 2} rx="4" />
            <text x={x0 - pad + 2} y={y0 - pad - 4}>
              {seat}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default memo(CameraScene);
