import { get, post, del } from "../client";

export async function getRules() {
  return get("/rules");
}

export async function addRule(category: string, type: string, rule: string) {
  return post("/rules", { category, type, rule });
}

export async function removeRule(id: string) {
  return del(`/rules/${encodeURIComponent(id)}`);
}
