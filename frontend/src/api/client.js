export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "/backend-api";
export const AI_API_BASE_URL = import.meta.env?.VITE_AI_API_BASE_URL || "/ai-api";

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

let accessToken = null;
let unauthorizedHandler = null;

export function setToken(token) {
  accessToken = token || null;
}

export function getToken() {
  return accessToken;
}

/** Called once by the auth provider so an expired session signs the user out. */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function buildUrl(path, query) {
  const url = new URL(`${API_BASE_URL.replace(/\/$/, "")}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, item));
    else url.searchParams.set(key, value);
  }
  return url;
}

// FastAPI reports errors as {"detail": "..."} or {"detail": [{"msg": ...}]}.
function messageFrom(body, fallback) {
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail.map((item) => item.msg).join("; ");
  return fallback;
}

export async function request(path, { method = "GET", body, query, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Cannot reach the backend. Check that the service is running.", 0);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") unauthorizedHandler?.();
    throw new ApiError(messageFrom(data, `Request failed (HTTP ${response.status}).`), response.status, data);
  }
  return data;
}
