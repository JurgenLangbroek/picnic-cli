import { get } from "../client";

export async function getFavorites(limit?: number, refresh?: boolean) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (refresh) params.set("refresh", "true");
  const qs = params.toString();
  return get(`/favorites${qs ? `?${qs}` : ""}`);
}
