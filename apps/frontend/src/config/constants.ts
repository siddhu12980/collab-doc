export const WS_URL = import.meta.env.VITE_WS_URL;
export const API_URL = import.meta.env.VITE_API_URL;
if (!WS_URL || !API_URL) {
  throw new Error("Missing environment variables");
}
