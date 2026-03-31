const BASE_URL = process.env.PICNIC_API_URL || "http://picnic.localhost:1355";

let verbose = false;

export function setVerbose(v: boolean) {
  verbose = v;
}

function appendVerbose(path: string): string {
  if (!verbose) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}verbose=true`;
}

export async function get(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${appendVerbose(path)}`);
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  return body;
}

export async function post(path: string, data?: unknown): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${appendVerbose(path)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  return body;
}

export async function del(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${appendVerbose(path)}`, { method: "DELETE" });
  const body = await res.json();
  if (!res.ok) throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  return body;
}
