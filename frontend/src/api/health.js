import { AI_API_BASE_URL, API_BASE_URL } from "./client.js";

// These two endpoints exist in the current scaffold, so they are always called
// for real, even when the rest of the dashboard runs on demo data.
export const SERVICES = [
  { id: "backend", name: "Backend", url: `${API_BASE_URL.replace(/\/$/, "")}/health` },
  { id: "ai-engine", name: "AI engine", url: `${AI_API_BASE_URL.replace(/\/$/, "")}/health` },
];

export async function checkService(service, signal) {
  try {
    const response = await fetch(service.url, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) return { state: "down", detail: `HTTP ${response.status}` };
    const body = await response.json();
    if (body.inference_available === false) {
      return { state: "partial", detail: `${body.status ?? "up"} · inference not implemented` };
    }
    return { state: "up", detail: body.status ?? "ok" };
  } catch (error) {
    if (error.name === "AbortError") throw error;
    return { state: "down", detail: "unreachable" };
  }
}
