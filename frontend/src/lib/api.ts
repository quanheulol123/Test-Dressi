const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

const ensureLeadingSlash = (path: string): string =>
  path.startsWith("/") ? path : `/${path}`;

export const apiUrl = (path: string): string =>
  `${API_BASE_URL}${ensureLeadingSlash(path)}`;

export const apiBaseUrl = API_BASE_URL;
