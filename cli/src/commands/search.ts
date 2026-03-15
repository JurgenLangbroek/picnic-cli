import { get } from "../client.js";

export async function search(query: string, limit?: number) {
  const params = new URLSearchParams({ q: query });
  if (limit) params.set("limit", String(limit));
  return get(`/catalog/search?${params}`);
}

export async function suggestions(query: string) {
  return get(`/catalog/suggestions?q=${encodeURIComponent(query)}`);
}

export async function productDetails(id: string) {
  return get(`/catalog/product/${encodeURIComponent(id)}`);
}
