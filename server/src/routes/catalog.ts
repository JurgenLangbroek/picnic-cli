import { requireAuth } from "../picnic-client";
import { formatSearchResults } from "../formatters";

export async function handleCatalog(path: string, req: Request, url: URL): Promise<Response | null> {
  const verbose = url.searchParams.get("verbose") === "true";

  if (path === "/catalog/search" && req.method === "GET") {
    const q = url.searchParams.get("q");
    if (!q) return Response.json({ error: "q parameter required" }, { status: 400 });
    let results = await requireAuth().catalog.search(q);
    const limit = parseInt(url.searchParams.get("limit") || "0");
    if (limit > 0) results = results.slice(0, limit);
    return Response.json(verbose ? results : formatSearchResults(results));
  }

  if (path === "/catalog/suggestions" && req.method === "GET") {
    const q = url.searchParams.get("q");
    if (!q) return Response.json({ error: "q parameter required" }, { status: 400 });
    const results = await requireAuth().catalog.getSuggestions(q);
    return Response.json(results);
  }

  const productMatch = path.match(/^\/catalog\/product\/(.+)$/);
  if (productMatch && req.method === "GET") {
    const result = await requireAuth().catalog.getProductDetails(productMatch[1]);
    return Response.json(result);
  }

  return null;
}
