import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { USE_MOCKS } from "../api/index.js";
import { evidenceWindow } from "../lib/events.js";
import { cameraLabel, formatPreciseTime, formatTime } from "../lib/format.js";
import CameraScene from "./scene/CameraScene.jsx";
import "./EvidencePlayer.css";

const VISIBILITY = {
  clear: { label: "Clear view", glyph: "●" },
  partial: { label: "Partial view", glyph: "◐" },
  not_visible: { label: "No clear view", glyph: "○" },
};

const RATES = [0.5, 1, 2];

/**
 * Plays every camera's evidence clip on one shared clock, so Camera 1 and
 * Camera 2 always show the same moment. Each clip keeps its own offset in
 * case the cameras' clips start at slightly different times.
 */
export default function EvidencePlayer({ event, cameras, layout }) {
  const win = useMemo(() => evidenceWindow(event), [event]);
  const eventOffset = Math.max(0, (win.eventStart - win.start) / 1000);
  const eventLength = Math.max(0.1, (win.eventEnd - win.eventStart) / 1000);

  const [t, setT] = useState(eventOffset);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const tRef = useRef(t);
  tRef.current = t;
  const videos = useRef({});

  useEffect(() => {
    setT(eventOffset);
    setPlaying(false);
  }, [event.id, eventOffset]);

  // Shared clock.
  useEffect(() => {
    if (!playing) return undefined;
    let frame;
    let last = performance.now();
    const tick = (time) => {
      const next = Math.min(win.duration, tRef.current + ((time - last) / 1000) * rate);
      last = time;
      setT(next);
      if (next >= win.duration) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, rate, win.duration]);

  // Keep real <video> elements locked to the shared clock.
  useEffect(() => {
    for (const clip of win.clips) {
      const video = videos.current[clip.camera_id];
      if (!video) continue;
      const local = t - (clip.startMs - win.start) / 1000;
      const length = (clip.endMs - clip.startMs) / 1000;
      if (video.playbackRate !== rate) video.playbackRate = rate;
      if (local < 0 || local > length) {
        if (!video.paused) video.pause();
        continue;
      }
      if (Math.abs(video.currentTime - local) > 0.3) video.currentTime = local;
      if (playing && video.paused) video.play().catch(() => {});
      if (!playing && !video.paused) video.pause();
    }
  }, [t, playing, rate, win]);

  const seek = useCallback((value) => setT(Math.min(win.duration, Math.max(0, value))), [win.duration]);

  const togglePlay = () => {
    if (!playing && t >= win.duration - 0.05) setT(0);
    setPlaying((value) => !value);
  };

  const onKeyDown = (keyEvent) => {
    // Let form controls and buttons handle their own keys (Space activates a button).
    if (keyEvent.target.closest("input, select, textarea, button")) return;
    if (keyEvent.key === " " || keyEvent.key === "k") {
      keyEvent.preventDefault();
      togglePlay();
    } else if (keyEvent.key === "ArrowLeft" || keyEvent.key === "j") {
      keyEvent.preventDefault();
      seek(t - (keyEvent.key === "j" ? 5 : 1));
    } else if (keyEvent.key === "ArrowRight" || keyEvent.key === "l") {
      keyEvent.preventDefault();
      seek(t + (keyEvent.key === "l" ? 5 : 1));
    }
  };

  const absolute = win.start + t * 1000;
  const inEvent = absolute >= win.eventStart && absolute <= win.eventEnd;

  const cameraIds = useMemo(() => {
    const ids = new Set([
      ...cameras.map((camera) => camera.id),
      ...(event.camera_ids ?? []),
      ...(event.visibility ?? []).map((item) => item.camera_id),
    ]);
    return [...ids].sort();
  }, [cameras, event]);

  const highlight = useMemo(
    () => ({ [event.seat_id]: inEvent ? event.priority ?? "selected" : "faint" }),
    [event.seat_id, event.priority, inEvent],
  );
  const active = useMemo(() => (inEvent ? new Set([event.seat_id]) : undefined), [inEvent, event.seat_id]);

  const pct = (seconds) => `${(seconds / win.duration) * 100}%`;

  return (
    <div className="evidence" onKeyDown={onKeyDown}>
      <div
        className="evidence-panes"
        tabIndex={0}
        role="group"
        aria-label="Synchronized camera evidence. Press Space to play or pause, arrow keys to step."
      >
        {cameraIds.map((cameraId) => {
          const camera = cameras.find((item) => item.id === cameraId);
          const clip = win.clips.find((item) => item.camera_id === cameraId);
          const visibility = event.visibility?.find((item) => item.camera_id === cameraId);
          const view = VISIBILITY[visibility?.seat_visibility] ?? null;
          const name = cameraLabel(cameraId, cameras);
          const role = camera?.role ?? (cameraId.endsWith("2") ? "desk" : "overview");

          let media;
          if (clip?.clip_url) {
            media = (
              <video
                ref={(node) => {
                  if (node) videos.current[cameraId] = node;
                  else delete videos.current[cameraId];
                }}
                className="evidence-media"
                src={clip.clip_url}
                muted
                playsInline
                preload="auto"
              />
            );
          } else if (clip?.snapshot_url) {
            media = <img className="evidence-media" src={clip.snapshot_url} alt={`Snapshot from ${name}`} />;
          } else if (USE_MOCKS) {
            media = (
              <CameraScene
                role={role}
                layout={layout}
                highlights={clip ? highlight : undefined}
                activeSeats={clip ? active : undefined}
                label={`Demo scene from ${name} around seat ${event.seat_id}`}
              />
            );
          } else {
            media = <div className="evidence-placeholder">No clip stored for this camera.</div>;
          }

          return (
            <figure key={cameraId} className={`evidence-pane${clip ? "" : " is-unsupported"}`}>
              <div className="evidence-frame">
                {media}
                <div className="evidence-hud">
                  <span className="evidence-cam">{name}</span>
                  <span className="evidence-clock">{formatPreciseTime(absolute)}</span>
                </div>
                {inEvent && clip && <span className="evidence-flag">Event window</span>}
                {!clip && (
                  <div className="evidence-overlay">
                    {visibility?.seat_visibility === "not_visible"
                      ? `No clear view of seat ${event.seat_id} from ${name}.`
                      : `${name} did not contribute evidence for this event.`}
                  </div>
                )}
                {clip && !clip.clip_url && USE_MOCKS && <span className="evidence-demo">Demo scene, not footage</span>}
              </div>
              <figcaption className="evidence-caption">
                {view && (
                  <span className={`visibility visibility--${visibility.seat_visibility}`}>
                    <span aria-hidden="true">{view.glyph}</span> {view.label}
                  </span>
                )}
                <span>{visibility?.note ?? (camera ? camera.description : "")}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <div className="evidence-controls">
        <button
          type="button"
          className="button button--primary evidence-play"
          onClick={togglePlay}
          aria-label={playing ? "Pause both cameras" : "Play both cameras"}
        >
          <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
        </button>
        <button type="button" className="button button--ghost button--sm" onClick={() => seek(t - 5)}>
          −5 s
        </button>
        <button type="button" className="button button--ghost button--sm" onClick={() => seek(eventOffset)}>
          Event start
        </button>
        <button type="button" className="button button--ghost button--sm" onClick={() => seek(t + 5)}>
          +5 s
        </button>

        <div className="scrubber">
          <span className="scrubber-window" style={{ left: pct(eventOffset), width: pct(eventLength) }} aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={win.duration}
            step={0.1}
            value={t}
            onChange={(changeEvent) => seek(Number(changeEvent.target.value))}
            aria-label="Playback position"
            aria-valuetext={formatPreciseTime(absolute)}
          />
        </div>

        <label className="field field--inline evidence-rate">
          <span className="visually-hidden">Playback speed</span>
          <select value={rate} onChange={(changeEvent) => setRate(Number(changeEvent.target.value))}>
            {RATES.map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="evidence-legend">
        <span className="evidence-legend-swatch" aria-hidden="true" />
        Event window {formatTime(win.eventStart)}–{formatTime(win.eventEnd)}. Clips include about 5 seconds before
        and after. Keys: Space play/pause, ← → 1 s, J / L 5 s.
      </p>
    </div>
  );
}
