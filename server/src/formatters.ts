// Concise response formatters — strip verbose API responses to essentials

export function formatCart(raw: any) {
  const items = (raw.items || []).flatMap((line: any) =>
    (line.items || []).map((article: any) => {
      const decorators = article.decorators || [];
      const unavailable = decorators.find((d: any) => d.type === "UNAVAILABLE");
      const item: any = {
        id: article.id,
        name: article.name,
        price: article.price,
        quantity: decorators.find((d: any) => d.type === "QUANTITY")?.quantity ?? 1,
        unit: article.unit_quantity,
      };
      if (unavailable) {
        item.unavailable = {
          reason: unavailable.reason,
          explanation: unavailable.explanation?.short_explanation || unavailable.reason,
          replacements: (unavailable.replacements || []).map((r: any) => ({
            id: r.id,
            name: r.name !== "irrelevant" ? r.name : null,
          })),
        };
      }
      return item;
    })
  );

  const selectedSlot = raw.selected_slot;
  const slotImplicit = selectedSlot?.state === "IMPLICIT";

  // Strip unavailability info when no slot is explicitly selected,
  // since stock checks default to tomorrow which is misleading
  if (slotImplicit) {
    for (const item of items) {
      delete item.unavailable;
    }
  }

  const result: any = {
    items,
    totalCount: raw.total_count,
    totalPrice: raw.total_price,
    checkoutTotal: raw.checkout_total_price,
    selectedSlot: selectedSlot?.slot_id || null,
    fees: raw.fees || [],
  };

  const warnings: string[] = [];
  if (slotImplicit) {
    warnings.push("No delivery slot explicitly chosen — using default. Use 'picnic slots' and 'picnic set-slot <id>' to pick one.");
  }
  const unavailableItems = items.filter((i: any) => i.unavailable);
  if (unavailableItems.length > 0) {
    warnings.push(`${unavailableItems.length} item(s) unavailable: ${unavailableItems.map((i: any) => `${i.name} (${i.unavailable.explanation})`).join(", ")}`);
  }
  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  return result;
}

export function formatDeliveries(raw: any[]) {
  return raw.map((d) => ({
    id: d.delivery_id,
    status: d.status,
    createdAt: d.creation_time,
    slotStart: d.slot?.window_start,
    slotEnd: d.slot?.window_end,
    eta: d.eta2 ? { start: d.eta2.start, end: d.eta2.end } : null,
    deliveredAt: d.delivery_time ? { start: d.delivery_time.start, end: d.delivery_time.end } : null,
    orders: (d.orders || []).map((o: any) => ({
      id: o.id,
      total: o.total_price,
      status: o.status,
    })),
  }));
}

export function formatDelivery(raw: any) {
  return formatDeliveries([raw])[0];
}

export function formatSearchResults(raw: any[]) {
  return raw.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.display_price,
    unit: item.unit_quantity,
    maxCount: item.max_count,
  }));
}

export function formatSlots(raw: any) {
  const slots = Array.isArray(raw) ? raw : raw.delivery_slots || [];
  return slots.map((s: any) => ({
    id: s.slot_id,
    start: s.window_start,
    end: s.window_end,
    cutOff: s.cut_off_time,
    available: s.is_available,
    selected: s.selected,
    minOrder: s.minimum_order_value,
  }));
}

export function formatUser(raw: any) {
  return {
    id: raw.user_id,
    firstName: raw.firstname,
    lastName: raw.lastname,
    email: raw.contact_email,
    phone: raw.phone,
    address: raw.address ? {
      street: raw.address.street,
      houseNumber: raw.address.house_number,
      houseSuffix: raw.address.house_number_ext,
      city: raw.address.city,
      postalCode: raw.address.postal_code,
    } : null,
  };
}

// Extract recipes from the cookbook Fusion page by parsing onAddButtonPostRecipeHandler JSON payloads
export function extractRecipesFromPage(page: any): any[] {
  const text = JSON.stringify(page);
  const recipes = new Map<string, any>();

  // Extract recipe data from onAddButtonPostRecipeHandler expressions
  // The payload contains nested objects (portionsData), so we need balanced brace matching
  const handlerPrefix = "onAddButtonPostRecipeHandler(";
  let searchStart = 0;
  let match;
  while ((searchStart = text.indexOf(handlerPrefix, searchStart)) !== -1) {
    const jsonStart = searchStart + handlerPrefix.length;
    const jsonStr = extractBalancedBraces(text, jsonStart);
    searchStart = jsonStart + 1;
    if (!jsonStr) continue;
    try {
      const unescaped = jsonStr.replace(/\\\\"/g, '"').replace(/\\"/g, '"').replace(/\\\\\\\\/g, '\\');
      const data = JSON.parse(unescaped);
      if (data.id && !recipes.has(data.id)) {
        recipes.set(data.id, {
          id: data.id,
          name: data.name,
          type: data.segmentType === "USER_DEFINED_RECIPES" ? "user" : "picnic",
          servings: data.defaultServings || null,
          preparationTime: data.preparationTimeCopy || null,
          qualityCue: data.qualityCue || null,
          ingredientCount: data.componentsLength || null,
        });
      }
    } catch {}
  }

  // Also extract from analytics contexts as fallback for user recipes
  const analyticsRegex = /\\?"recipe_id\\?"\s*:\s*\\?"([^"\\]+)\\?"[^}]*?\\?"recipe_name\\?"\s*:\s*\\?"([^"\\]+)\\?"/g;
  while ((match = analyticsRegex.exec(text)) !== null) {
    const id = match[1];
    const name = match[2];
    if (!recipes.has(id)) {
      recipes.set(id, { id, name, type: "user", servings: null, preparationTime: null, qualityCue: null, ingredientCount: null });
    }
  }

  return Array.from(recipes.values());
}

const CUPBOARD_TYPES = new Set(["CUPBOARD", "HIDDEN_CUPBOARD"]);

// Extract recipe detail from selling-group-details Fusion page
export function extractRecipeDetails(page: any): any {
  const details: any = {
    id: null,
    name: null,
    ingredients: [] as any[],
    assumedAtHome: [] as string[],
  };

  // Find recipe name
  findRecipeName(page, details);

  // Extract structured ingredient data from sellableContentState.ingredientsState
  const ingredientsState = findIngredientsState(page);
  if (ingredientsState) {
    for (const ing of ingredientsState) {
      const units = Object.values(ing.sellingUnits || {}) as any[];
      for (const unit of units) {
        if (CUPBOARD_TYPES.has(ing.ingredientType)) {
          // Cupboard/pantry items — assumed to be at home
          details.assumedAtHome.push(unit.sellingUnitId);
        } else {
          details.ingredients.push({
            productId: unit.sellingUnitId,
            ingredientId: ing.ingredientId, // UUID for selling_group_component_id
            price: unit.price,
            quantity: unit.requiredAmount || 1,
            type: ing.ingredientType, // CORE, CORE_STOCKABLE, VARIATION
            available: ing.isAvailable,
            swapped: ing.isSwapped,
          });
        }
      }
    }
  }

  return details;
}

function findRecipeName(obj: any, details: any) {
  if (!obj || typeof obj !== "object") return;
  if (obj.type === "RICH_TEXT" && obj.markdown && typeof obj.markdown === "string") {
    const clean = obj.markdown.replace(/#\([^)]*\)/g, "").trim();
    if (clean && obj.textAttributes?.size >= 20 && !details.name) {
      details.name = clean;
    }
  }
  if (Array.isArray(obj)) {
    for (const item of obj) findRecipeName(item, details);
  } else {
    for (const val of Object.values(obj)) findRecipeName(val, details);
  }
}

function findIngredientsState(obj: any): any[] | null {
  if (!obj || typeof obj !== "object") return null;
  if (obj.id === "sellableContentState" && obj.state?.ingredientsState) {
    return obj.state.ingredientsState;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = findIngredientsState(item);
      if (result) return result;
    }
  } else {
    for (const val of Object.values(obj)) {
      const result = findIngredientsState(val);
      if (result) return result;
    }
  }
  return null;
}

// Extract recipes from search results Fusion page by walking the tree
export function extractRecipesFromSearchPage(page: any): any[] {
  const recipes: any[] = [];
  const seen = new Set<string>();

  function walk(obj: any): void {
    if (!obj || typeof obj !== "object") return;
    // Check if this is a TOUCHABLE with selling_group_id in onPress target
    if (obj.type === "TOUCHABLE" && obj.onPress?.target) {
      const target = String(obj.onPress.target);
      const m = target.match(/selling_group_id=([a-f0-9]{24})/);
      if (m && !seen.has(m[1])) {
        seen.add(m[1]);
        // Extract name and time from RICH_TEXT markdown children
        const childText = JSON.stringify(obj);
        const markdowns = [...childText.matchAll(/"markdown"\s*:\s*"([^"]+)"/g)].map(x => x[1]);
        const name = markdowns[0] || null;
        // Parse time from second markdown (format: #(#333333)30 minuten#(#333333))
        let prepTime: string | null = null;
        if (markdowns[1]) {
          const timeMatch = markdowns[1].match(/(\d+\s*(?:uur|minuten)(?:\s+\d+\s*minuten)?)/);
          if (timeMatch) prepTime = timeMatch[1];
        }
        // Parse tags from remaining markdowns
        const tags = markdowns.slice(2)
          .map(md => md.replace(/#\([^)]*\)/g, "").trim())
          .filter(Boolean);
        recipes.push({
          id: m[1],
          name: name ? name.replace(/\\u[\da-fA-F]{4}/g, (esc) => JSON.parse(`"${esc}"`)) : null,
          preparationTime: prepTime,
          ...(tags.length > 0 ? { tags } : {}),
        });
        return; // Don't recurse into recipe card children
      }
    }
    if (Array.isArray(obj)) {
      for (const item of obj) walk(item);
    } else {
      for (const val of Object.values(obj)) walk(val);
    }
  }

  walk(page);
  return recipes;
}

function extractBalancedBraces(text: string, start: number): string | null {
  if (text[start] !== "{" && text[start] !== "\\") {
    // Handle escaped brace
    if (text.substring(start, start + 2) === "\\{") return null;
    if (text[start] !== "{") return null;
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length && i < start + 5000; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"' && !escaped) { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return text.substring(start, i + 1);
    }
  }
  return null;
}

