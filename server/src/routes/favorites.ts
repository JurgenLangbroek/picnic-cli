import { requireAuth } from "../picnic-client";

interface ProductCount {
  id: string;
  name: string;
  count: number;
  lastPrice: number;
  unit: string;
}

interface CachedFavorites {
  products: ProductCount[];
  enriched: any[] | null;
  fetchedAt: number;
  enrichedAt: number;
}

import { readFile, writeFile, mkdir } from "fs/promises";

const CACHE_PATH = "/data/favorites-cache.json";
const PRICE_TTL = 4 * 60 * 60 * 1000; // 4 hours
let cache: CachedFavorites | null = null;

async function loadCache(): Promise<CachedFavorites | null> {
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf-8"));
  } catch {
    return null;
  }
}

async function saveCache(c: CachedFavorites) {
  await mkdir("/data", { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(c));
}

export async function handleFavorites(path: string, req: Request, url: URL): Promise<Response | null> {
  const verbose = url.searchParams.get("verbose") === "true";
  const refresh = url.searchParams.get("refresh") === "true";

  if (path === "/favorites" && req.method === "GET") {
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const client = requireAuth();
    const now = Date.now();

    // Load from disk if not in memory
    if (!cache) cache = await loadCache();

    // Fetch order history only if no cache or explicit refresh
    if (!cache || refresh) {
      console.log("Favorites: fetching order history...");
      cache = {
        products: await fetchProductCounts(client),
        enriched: null,
        fetchedAt: now,
        enrichedAt: 0,
      };
      await saveCache(cache);
      console.log(`Favorites: found ${cache.products.length} unique products from order history (cached to disk)`);
    }

    const sorted = cache.products.slice(0, limit);

    if (verbose) return Response.json(sorted);

    // Enrich with current prices if stale
    if (!cache.enriched || refresh || now - cache.enrichedAt > PRICE_TTL) {
      console.log("Favorites: enriching with current prices...");
      // Only enrich the top products to minimize API calls
      cache.enriched = await enrichWithCurrentPrices(client, cache.products.slice(0, 20));
      cache.enrichedAt = now;
      await saveCache(cache);
      console.log("Favorites: price enrichment done (cached to disk)");
    }

    const result = cache.enriched.slice(0, limit);
    return Response.json(result);
  }

  return null;
}

async function fetchProductCounts(client: any): Promise<ProductCount[]> {
  const deliveries = await client.delivery.getDeliveries();
  const completed = deliveries.filter((d: any) => d.status === "COMPLETED");

  // Fetch in batches of 3 with delays to avoid rate limits
  const productCounts = new Map<string, ProductCount>();
  const batchSize = 3;

  for (let i = 0; i < Math.min(completed.length, 20); i += batchSize) {
    const batch = completed.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (d: any) => {
        try {
          const detail = await client.delivery.getDelivery(d.delivery_id);
          for (const order of detail.orders || []) {
            for (const line of order.items || []) {
              for (const article of line.items || []) {
                if (!article.id?.startsWith("s")) continue;
                const qty = (article.decorators || []).find((dec: any) => dec.type === "QUANTITY")?.quantity ?? 1;
                const unitPrice = Math.round((line.display_price || line.price) / qty);
                const existing = productCounts.get(article.id);
                if (existing) {
                  existing.count += qty;
                  existing.lastPrice = unitPrice;
                } else {
                  productCounts.set(article.id, {
                    id: article.id,
                    name: article.name,
                    count: qty,
                    lastPrice: unitPrice,
                    unit: article.unit_quantity || "",
                  });
                }
              }
            }
          }
        } catch {}
      })
    );
    // Delay between batches to avoid rate limits
    if (i + batchSize < 20) await new Promise((r) => setTimeout(r, 1000));
  }

  return [...productCounts.values()].sort((a, b) => b.count - a.count);
}

async function enrichWithCurrentPrices(client: any, products: ProductCount[]) {
  const priceMap = new Map<string, number>();

  // Search in batches of 3 with delays
  const uniqueNames = [...new Set(products.map((p) => p.name))];
  const batchSize = 3;

  for (let i = 0; i < uniqueNames.length; i += batchSize) {
    const batch = uniqueNames.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (name) => {
        try {
          const results = await client.catalog.search(name);
          for (const r of results) {
            if (r.id && r.display_price !== undefined) {
              priceMap.set(r.id, r.display_price);
            }
          }
        } catch {}
      })
    );
    if (i + batchSize < uniqueNames.length) await new Promise((r) => setTimeout(r, 300));
  }

  return products.map((p) => {
    const currentPrice = priceMap.get(p.id) ?? null;
    const item: any = {
      id: p.id,
      name: p.name,
      unit: p.unit,
      timesBought: p.count,
      lastPricePaid: p.lastPrice,
      currentPrice,
    };
    if (currentPrice !== null && currentPrice < p.lastPrice) {
      item.onSale = true;
      item.saving = p.lastPrice - currentPrice;
    }
    return item;
  });
}
