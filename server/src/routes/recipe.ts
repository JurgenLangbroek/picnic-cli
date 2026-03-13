import { requireAuth } from "../picnic-client";
import { extractRecipesFromPage, extractRecipeDetails } from "../formatters";

export async function handleRecipe(path: string, req: Request, url: URL): Promise<Response | null> {
  const verbose = url.searchParams.get("verbose") === "true";

  if (path === "/recipes" && req.method === "GET") {
    const client = requireAuth();
    const page = await client.app.getPage("cookbook-page-content");
    if (verbose) return Response.json(page);
    return Response.json(extractRecipesFromPage(page));
  }

  const detailMatch = path.match(/^\/recipe\/([^/]+)$/);
  if (detailMatch && req.method === "GET") {
    const recipeId = detailMatch[1];
    const client = requireAuth();
    const page = await client.app.getPage(`selling-group-details-page?selling_group_id=${encodeURIComponent(recipeId)}`);
    if (verbose) return Response.json(page);
    const details = extractRecipeDetails(page);
    details.id = recipeId;

    // Enrich ingredients with product names from catalog
    const productIds = details.ingredients.map((i: any) => i.productId);
    if (productIds.length > 0) {
      const names = await lookupProductNames(client, productIds);
      for (const ing of details.ingredients) {
        const info = names.get(ing.productId);
        if (info) {
          ing.name = info.name;
          ing.unit = info.unit;
        }
      }
    }

    return Response.json(details);
  }

  const saveMatch = path.match(/^\/recipe\/([^/]+)\/save$/);
  if (saveMatch && req.method === "POST") {
    const result = await requireAuth().recipe.saveRecipe(saveMatch[1]);
    return Response.json(result);
  }

  const unsaveMatch = path.match(/^\/recipe\/([^/]+)\/unsave$/);
  if (unsaveMatch && req.method === "POST") {
    const result = await requireAuth().recipe.unsaveRecipe(unsaveMatch[1]);
    return Response.json(result);
  }

  if (path === "/recipe/add-product" && req.method === "POST") {
    const { productId, recipeId, count = 1 } = await req.json() as {
      productId: string; recipeId: string; count?: number;
    };
    if (!productId || !recipeId) {
      return Response.json({ error: "productId and recipeId required" }, { status: 400 });
    }
    // Note: Picnic's API doesn't support selling_unit_contexts on add_product.
    // Recipe-context linking is a frontend-only feature in the Picnic app.
    // We add the product to cart normally.
    const client = requireAuth();
    const cart = await client.cart.addProductToCart(productId, count);
    if (verbose) return Response.json(cart);
    return Response.json({ status: "added", productId, recipeId, count });
  }

  return null;
}

// Look up product names using catalog.getProductDetails (structured API, not Fusion)
async function lookupProductNames(client: any, productIds: string[]): Promise<Map<string, { name: string; unit: string }>> {
  const names = new Map<string, { name: string; unit: string }>();

  // Fetch product details in parallel (structured response, not Fusion page)
  await Promise.allSettled(
    productIds.map(async (id) => {
      try {
        const details = await client.catalog.getProductDetails(id);
        if (details?.name) {
          names.set(id, { name: details.name, unit: details.unit_quantity || "" });
        }
      } catch {
        // Product details not available; leave name empty
      }
    })
  );

  return names;
}
