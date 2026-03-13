import { get, post } from "../client";

export async function status() {
  return get("/auth/status");
}

export async function login(email: string, password: string) {
  return post("/auth/login", { email, password });
}

export async function generate2FA() {
  return post("/auth/2fa/generate");
}

export async function verify2FA(code: string) {
  return post("/auth/2fa/verify", { code });
}

export async function logout() {
  return post("/auth/logout");
}
