// Docker healthcheck: exits 0 if authenticated, 1 if not
const res = await fetch("http://localhost:3000/auth/status");
const data = await res.json() as { status: string };
process.exit(data.status === "authenticated" ? 0 : 1);
