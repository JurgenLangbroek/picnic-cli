import { requireAuth } from "../picnic-client";
import { formatUser } from "../formatters";

export async function handleUser(path: string, req: Request, url: URL): Promise<Response | null> {
  const verbose = url.searchParams.get("verbose") === "true";

  if (path === "/user" && req.method === "GET") {
    const user = await requireAuth().user.getUserDetails();
    return Response.json(verbose ? user : formatUser(user));
  }

  return null;
}
