import { get } from "../client";

export async function getUser() {
  return get("/user");
}
