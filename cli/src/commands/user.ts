import { get } from "../client.js";

export async function getUser() {
  return get("/user");
}
