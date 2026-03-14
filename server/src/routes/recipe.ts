import { requireAuth } from "../picnic-client";
import { extractRecipesFromPage, extractRecipeDetails, extractRecipesFromSearchPage } from "../formatters";
import { getRulesByCategory, formatRulesHint } from "./rules";

export async function handleRecipe(path: string, req: Request, url: URL): Promise<Response | null> {
  const verbose = url.searchParams.get("verbose") === "true";

  if (path === "/recipes" && req.method === "GET") {
    const client = requireAuth();
    const page = await client.app.getPage("cookbook-page-content");
    if (verbose) return Response.json(page);
    return Response.json(extractRecipesFromPage(page));
  }

  if (path === "/recipes/all" && req.method === "GET") {
    const client = requireAuth();
    const page = await client.app.getPage("see-more-recipes-page?segmentName=Alles&segmentType=ALL_RECIPES");
    if (verbose) return Response.json(page);
    return Response.json(extractRecipesFromPage(page));
  }

  if (path === "/recipes/search" && req.method === "GET") {
    const query = url.searchParams.get("q");
    if (!query) return Response.json({ error: "q parameter required" }, { status: 400 });
    const client = requireAuth();
    // Picnic's recipe search uses the regular search page with recipe context params
    const page = await client.app.getPage(`search-page-results?search_term=${encodeURIComponent(query)}&page_context=MEALS&is_recipe=true`);
    if (verbose) return Response.json(page);
    const recipes = extractRecipesFromSearchPage(page);
    const [recipeRules, weekRules] = await Promise.all([
      getRulesByCategory("recipe"),
      getRulesByCategory("week"),
    ]);
    const rules = [...recipeRules, ...weekRules];
    return Response.json({ results: recipes, ...(rules.length > 0 ? { rules: formatRulesHint(rules) } : {}) });
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
    const allProductIds = [
      ...details.ingredients.map((i: any) => i.productId),
      ...details.assumedAtHome,
    ];
    if (allProductIds.length > 0) {
      const names = await lookupProductNames(client, allProductIds);
      for (const ing of details.ingredients) {
        const info = names.get(ing.productId);
        if (info) {
          ing.name = info.name;
          ing.unit = info.unit;
        }
      }
      // Replace assumedAtHome IDs with readable names
      details.assumedAtHome = details.assumedAtHome.map(
        (id: string) => names.get(id)?.name || id
      );
    }

    const productRules = await getRulesByCategory("product");
    if (productRules.length > 0) details.rules = formatRulesHint(productRules);
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
    const { productId, recipeId, ingredientId, ingredientType, count = 1, dayOffset = 0, servings = 4 } = await req.json() as {
      productId: string; recipeId: string; ingredientId?: string; ingredientType?: string;
      count?: number; dayOffset?: number; servings?: number;
    };
    if (!productId || !recipeId) {
      return Response.json({ error: "productId and recipeId required" }, { status: 400 });
    }
    const client = requireAuth();
    const contexts: any[] = [
      {
        type: "MEAL_PLAN",
        day_relative_to_slot: dayOffset,
        number_of_servings: servings,
      },
      {
        type: "SELLING_GROUP",
        selling_group_id: recipeId,
        selling_group_creator_type: "PIM",
        ...(ingredientId ? { selling_group_component_id: ingredientId } : {}),
        ...(ingredientType ? { selling_group_component_type: ingredientType } : {}),
        selling_group_component_swap_type: null,
      },
    ];
    // TODO: Switch to client.cart.addProductToCart once picnic-api supports selling_unit_contexts
    const cart = await client.sendRequest("POST", `/cart/add_product`, {
      product_id: productId,
      count,
      selling_unit_contexts: contexts,
    });
    if (verbose) return Response.json(cart);
    return Response.json({ status: "added", productId, recipeId, ingredientId, count });
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
