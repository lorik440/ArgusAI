const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const shortTimeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toDate(value) {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 10:42:18 */
export function formatTime(value) {
  const date = toDate(value);
  return date ? timeFormat.format(date) : "—";
}

/** 10:42 */
export function formatShortTime(value) {
  const date = toDate(value);
  return date ? shortTimeFormat.format(date) : "—";
}

/** Wed, 11 Nov 2026 */
export function formatDate(value) {
  const date = toDate(value);
  return date ? dateFormat.format(date) : "—";
}

/** 11 Nov, 10:42 */
export function formatDateTime(value) {
  const date = toDate(value);
  return date ? dateTimeFormat.format(date) : "—";
}

/** 09:00–10:30 */
export function formatTimeRange(start, end) {
  return `${formatShortTime(start)}–${formatShortTime(end)}`;
}

/** 10:42:18.4 (used on evidence playback) */
export function formatPreciseTime(ms) {
  const date = toDate(ms);
  if (!date) return "—";
  const tenths = Math.floor(date.getMilliseconds() / 100);
  return `${timeFormat.format(date)}.${tenths}`;
}

/** 8.3 s · 1 min 12 s */
export function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) return "—";
  const value = Number(seconds);
  if (value < 60) {
    const rounded = Math.round(value * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} s`;
  }
  const minutes = Math.floor(value / 60);
  const rest = Math.round(value - minutes * 60);
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

/** 1 h 12 min · 38 min · 45 s */
export function formatSpan(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} min`;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

/** "just now" · "4 min ago" · "in 2 h 5 min" */
export function formatRelative(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return "—";
  const diff = date.getTime() - now;
  if (Math.abs(diff) < 45_000) return "just now";
  return diff < 0 ? `${formatSpan(-diff)} ago` : `in ${formatSpan(diff)}`;
}

/** Display name for a camera id, using the camera list when available. */
export function cameraLabel(cameraId, cameras = []) {
  const camera = cameras.find((item) => item.id === cameraId);
  if (camera?.name) return camera.name;
  const match = /(\d+)$/.exec(cameraId ?? "");
  return match ? `Camera ${match[1]}` : cameraId ?? "Unknown camera";
}

/** "Cam 1" — compact label for chips. Non-breaking so it never wraps mid-label. */
export function cameraShortLabel(cameraId) {
  const match = /(\d+)$/.exec(cameraId ?? "");
  return match ? `Cam ${match[1]}` : cameraId ?? "?";
}

export function formatPercent(value) {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}
