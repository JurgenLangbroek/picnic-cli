import { AuthError } from "../picnic-client";

export function errorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: 401 });
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  const status = isApiError(error) ? error.statusCode || 500 : 500;

  console.error("Request error:", message);
  return Response.json({ error: message }, { status });
}

function isApiError(e: unknown): e is { statusCode?: number; message: string } {
  return typeof e === "object" && e !== null && "message" in e;
}
