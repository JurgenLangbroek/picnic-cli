import PicnicClient from "picnic-api";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

const SESSION_PATH = "/data/session.json";
const COUNTRY_CODE = (process.env.PICNIC_COUNTRY_CODE || "NL") as "NL" | "DE";

let client: PicnicClient | null = null;
let authenticated = false;

interface SessionData {
  authKey: string;
}

async function saveSession(authKey: string): Promise<void> {
  await mkdir("/data", { recursive: true });
  await writeFile(SESSION_PATH, JSON.stringify({ authKey }));
}

async function clearSession(): Promise<void> {
  try {
    await writeFile(SESSION_PATH, JSON.stringify({}));
  } catch {}
}

async function loadSession(): Promise<string | null> {
  try {
    const data = JSON.parse(await readFile(SESSION_PATH, "utf-8")) as Partial<SessionData>;
    return data.authKey || null;
  } catch {
    return null;
  }
}

function createClient(authKey?: string): PicnicClient {
  return new PicnicClient({
    countryCode: COUNTRY_CODE,
    ...(authKey ? { authKey } : {}),
  });
}

export async function initClient(): Promise<void> {
  const savedKey = await loadSession();
  if (savedKey) {
    client = createClient(savedKey);
    try {
      await client.cart.getCart();
      authenticated = true;
      console.log("Restored session from saved auth key");
      return;
    } catch {
      console.log("Saved session invalid, starting unauthenticated");
      await clearSession();
    }
  }
  client = createClient();
  authenticated = false;
}

export function getClient(): PicnicClient {
  if (!client) throw new Error("Client not initialized");
  return client;
}

export function isAuthenticated(): boolean {
  return authenticated;
}

export function requireAuth(): PicnicClient {
  if (!authenticated) throw new AuthError("Not authenticated");
  return getClient();
}

export async function login(email: string, password: string) {
  const c = getClient();
  const result = await c.auth.login(email, password);
  if (result.second_factor_authentication_required) {
    return { status: "2fa_required" as const };
  }
  const authKey = c.authKey;
  if (authKey) {
    await saveSession(authKey);
    authenticated = true;
  }
  return { status: "authenticated" as const };
}

export async function generate2FA() {
  const c = getClient();
  try {
    await c.auth.generate2FACode("SMS");
  } catch (e) {
    // generate2FA often returns empty body causing JSON parse error
    if (!(e instanceof SyntaxError)) throw e;
  }
  return { status: "2fa_sent" };
}

export async function verify2FA(code: string) {
  const c = getClient();
  await c.auth.verify2FACode(code);
  const authKey = c.authKey;
  if (authKey) {
    await saveSession(authKey);
    authenticated = true;
  }
  return { status: "authenticated" };
}

export async function logout() {
  const c = getClient();
  try {
    await c.auth.logout();
  } catch {}
  await clearSession();
  authenticated = false;
  client = createClient();
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
