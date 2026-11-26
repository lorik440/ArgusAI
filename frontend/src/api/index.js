import { httpApi } from "./http.js";
import { mockApi } from "./mock/mockApi.js";

/**
 * Demo data is the default because the backend currently only exposes
 * /health. Set VITE_USE_MOCKS=false once the API in frontend/README.md exists.
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

export const api = USE_MOCKS ? mockApi : httpApi;

export { ApiError } from "./client.js";
