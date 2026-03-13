import { isAuthenticated, login, generate2FA, verify2FA, logout } from "../picnic-client";

export async function handleAuth(path: string, req: Request, _url: URL): Promise<Response | null> {
  if (path === "/auth/status" && req.method === "GET") {
    return Response.json({ status: isAuthenticated() ? "authenticated" : "unauthenticated" });
  }

  if (path === "/auth/login" && req.method === "POST") {
    const { email, password } = await req.json() as { email: string; password: string };
    if (!email || !password) {
      return Response.json({ error: "email and password required" }, { status: 400 });
    }
    const result = await login(email, password);
    return Response.json(result);
  }

  if (path === "/auth/2fa/generate" && req.method === "POST") {
    const result = await generate2FA();
    return Response.json(result);
  }

  if (path === "/auth/2fa/verify" && req.method === "POST") {
    const { code } = await req.json() as { code: string };
    if (!code) {
      return Response.json({ error: "code required" }, { status: 400 });
    }
    const result = await verify2FA(code);
    return Response.json(result);
  }

  if (path === "/auth/logout" && req.method === "POST") {
    await logout();
    return Response.json({ status: "logged_out" });
  }

  return null;
}
