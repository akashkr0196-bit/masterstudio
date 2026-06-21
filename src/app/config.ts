export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
export const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL?.trim() || "";
