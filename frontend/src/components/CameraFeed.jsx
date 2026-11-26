import { useEffect, useState } from "react";
import { USE_MOCKS } from "../api/index.js";
import { formatTime } from "../lib/format.js";
import CameraScene from "./scene/CameraScene.jsx";
import "./CameraFeed.css";

const RETRY_MS = 5000;

/**
 * Renders a camera's stream. Supported `stream_type` values:
 *   "mjpeg"  – multipart JPEG over HTTP (an <img>)
 *   "video"  – a browser-playable file or stream, e.g. a recorded MP4 used in development
 *   "hls"    – plays where the browser supports HLS natively (Safari); others need hls.js
 * Broken streams retry every few seconds.
 */
function StreamView({ camera, onStateChange }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!failed) return undefined;
    onStateChange?.("reconnecting");
    const timer = setTimeout(() => {
      setFailed(false);
      setAttempt((value) => value + 1);
    }, RETRY_MS);
    return () => clearTimeout(timer);
  }, [failed, onStateChange]);

  const onError = () => setFailed(true);
  const onLoad = () => onStateChange?.("online");
  const src = camera.stream_url;

  if (camera.stream_type === "mjpeg") {
    return <img key={attempt} className="feed-media" src={src} alt="" onError={onError} onLoad={onLoad} />;
  }
  if (camera.stream_type === "hls") {
    const canPlay = typeof document !== "undefined" && document.createElement("video").canPlayType("application/vnd.apple.mpegurl");
    if (!canPlay) {
      return <div className="feed-placeholder">This browser cannot play HLS streams without hls.js.</div>;
    }
  }
  return (
    <video
      key={attempt}
      className="feed-media"
      src={src}
      autoPlay
      muted
      loop
      playsInline
      onError={onError}
      onPlaying={onLoad}
    />
  );
}

const STATUS_TEXT = {
  online: "Live",
  reconnecting: "Reconnecting…",
  offline: "Offline",
};

export default function CameraFeed({ camera, layout, emptySeats, highlights, now, inactiveMessage }) {
  const [streamState, setStreamState] = useState(null);
  const status = inactiveMessage ? "offline" : streamState === "reconnecting" ? "reconnecting" : camera.status;
  const hasStream = Boolean(camera.stream_url);
  const showScene = !hasStream && USE_MOCKS;

  return (
    <figure className={`feed feed--${status}`}>
      <div className="feed-frame">
        {hasStream ? (
          <StreamView camera={camera} onStateChange={setStreamState} />
        ) : showScene ? (
          <CameraScene
            role={camera.role}
            layout={layout}
            emptySeats={emptySeats}
            highlights={inactiveMessage ? undefined : highlights}
            label={`Demo scene of ${camera.name}: ${camera.description}`}
          />
        ) : (
          <div className="feed-placeholder">No stream configured for this camera.</div>
        )}

        <div className="feed-hud">
          <div className="feed-hud-row">
            <span className="feed-name">
              {camera.name}
              <span className="feed-desc"> · {camera.description}</span>
            </span>
            {!inactiveMessage && <span className="feed-clock">{formatTime(now)}</span>}
          </div>
          <div className="feed-hud-row">
            <span className={`feed-status feed-status--${status}`}>
              <span className="feed-status-dot" aria-hidden="true" />
              {STATUS_TEXT[status] ?? status}
            </span>
            {status === "online" && camera.analyzed_fps != null && (
              <span className="feed-fps">{camera.analyzed_fps.toFixed(1)} fps analyzed</span>
            )}
            {showScene && <span className="feed-demo">Demo scene, not footage</span>}
          </div>
        </div>

        {inactiveMessage ? (
          <div className="feed-overlay">{inactiveMessage}</div>
        ) : status === "reconnecting" ? (
          <div className="feed-overlay" role="status">
            <span className="spinner spinner--light" aria-hidden="true" />
            Connection lost. Reconnecting to {camera.name}…
          </div>
        ) : status === "offline" ? (
          <div className="feed-overlay">{camera.name} is offline.</div>
        ) : null}
      </div>
      <figcaption className="feed-caption">{camera.placement}</figcaption>
    </figure>
  );
}
