// Browser storage can be unavailable (private windows, blocked site data).
// Every access is wrapped so the app keeps working without it.

function store() {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readSession(key) {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeSession(key, value) {
  try {
    store()?.setItem(key, value);
  } catch {
    // Storage full or blocked: ignore, state stays in memory.
  }
}

export function removeSession(key) {
  try {
    store()?.removeItem(key);
  } catch {
    // ignore
  }
}
