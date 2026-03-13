import { requireAuth } from "../picnic-client";
import { formatCart } from "../formatters";

async function formatCartWithNames(raw: any) {
  const formatted = formatCart(raw);
  // Enrich replacement names for unavailable items
  const replacementIds = new Set<string>();
  for (const item of formatted.items) {
    if (item.unavailable?.replacements) {
      for (const r of item.unavailable.replacements) {
        if (!r.name) replacementIds.add(r.id);
      }
    }
  }
  if (replacementIds.size > 0) {
    const client = requireAuth();
    const names = new Map<string, string>();
    await Promise.allSettled(
      [...replacementIds].map(async (id) => {
        try {
          const details = await client.catalog.getProductDetails(id);
          if (details?.name) names.set(id, details.name);
        } catch {}
      })
    );
    for (const item of formatted.items) {
      if (item.unavailable?.replacements) {
        for (const r of item.unavailable.replacements) {
          if (!r.name && names.has(r.id)) r.name = names.get(r.id);
        }
      }
    }
  }
  return formatted;
}

export async function handleCart(path: string, req: Request, url: URL): Promise<Response | null> {
  const verbose = url.searchParams.get("verbose") === "true";

  if (path === "/cart" && req.method === "GET") {
    const cart = await requireAuth().cart.getCart();
    return Response.json(verbose ? cart : await formatCartWithNames(cart));
  }

  if (path === "/cart/add" && req.method === "POST") {
    const { productId, quantity = 1 } = await req.json() as { productId: string; quantity?: number };
    if (!productId) return Response.json({ error: "productId required" }, { status: 400 });
    const cart = await requireAuth().cart.addProductToCart(productId, quantity);
    return Response.json(verbose ? cart : await formatCartWithNames(cart));
  }

  if (path === "/cart/remove" && req.method === "POST") {
    const { productId, quantity = 1 } = await req.json() as { productId: string; quantity?: number };
    if (!productId) return Response.json({ error: "productId required" }, { status: 400 });
    const cart = await requireAuth().cart.removeProductFromCart(productId, quantity);
    return Response.json(verbose ? cart : await formatCartWithNames(cart));
  }

  if (path === "/cart/clear" && req.method === "POST") {
    const cart = await requireAuth().cart.clearCart();
    return Response.json(verbose ? cart : await formatCartWithNames(cart));
  }

  return null;
}
