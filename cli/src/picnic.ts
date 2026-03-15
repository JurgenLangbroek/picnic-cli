#!/usr/bin/env node

import * as auth from "./commands/auth.js";
import * as cart from "./commands/cart.js";
import * as searchCmd from "./commands/search.js";
import * as delivery from "./commands/delivery.js";
import * as user from "./commands/user.js";
import * as payment from "./commands/payment.js";
import * as recipe from "./commands/recipe.js";
import * as favorites from "./commands/favorites.js";
import * as rules from "./commands/rules.js";
import { setVerbose } from "./client.js";

function readLine(): Promise<string> {
  return new Promise((resolve) => {
    process.stdin.setEncoding("utf-8");
    process.stdin.resume();
    process.stdin.once("data", (chunk) => {
      process.stdin.pause();
      process.stdin.removeAllListeners();
      resolve(String(chunk).trim());
    });
  });
}

const args = process.argv.slice(2);
const command = args[0];
const pretty = args.includes("--pretty");
const verbose = args.includes("--verbose");
if (verbose) setVerbose(true);
const cleanArgs = args.filter((a) => a !== "--pretty" && a !== "--verbose");

function output(data: unknown) {
  if (pretty) {
    if (Array.isArray(data)) {
      printTable(data);
    } else if (typeof data === "object" && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        console.log(`${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`);
      }
    } else {
      console.log(data);
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

function printTable(items: Record<string, unknown>[]) {
  if (items.length === 0) {
    console.log("(empty)");
    return;
  }
  const keys = Object.keys(items[0]).slice(0, 6);
  const widths = keys.map((k) =>
    Math.max(k.length, ...items.map((item) => String(item[k] ?? "").slice(0, 40).length))
  );
  console.log(keys.map((k, i) => k.padEnd(widths[i])).join("  "));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const item of items) {
    console.log(keys.map((k, i) => String(item[k] ?? "").slice(0, 40).padEnd(widths[i])).join("  "));
  }
}

function usage(): never {
  console.log(`Usage: picnic <command> [args] [--pretty] [--verbose]

Auth:
  status                        Check auth status
  login <email> <password>      Login
  2fa-generate                  Send 2FA SMS code
  2fa-verify <code>             Verify 2FA code
  logout                        Log out

Catalog:
  search <query> [--limit N]    Search products
  suggestions <query>           Autocomplete suggestions
  product <id>                  Product details

Cart:
  cart                          View cart
  add <id> [quantity]           Add to cart
  remove <id> [quantity]        Remove from cart
  clear                         Empty cart

Delivery:
  slots                         Available delivery slots
  set-slot <id>                 Book a delivery slot
  deliveries                    Order history
  delivery <id>                 Delivery details
  track <id>                    Live tracking

Recipes:
  recipes [--mine] [--all]      Browse recipes (--mine own, --all from meals page)
  recipe-search <query>         Search recipes by name
  recipe <id>                   Recipe details
  save-recipe <id>              Save a recipe
  unsave-recipe <id>            Unsave a recipe
  recipe-add <productId> <recipeId> [qty]  Add recipe product to cart

Favorites:
  favorites [--limit N] [--deals] [--refresh] Frequently bought

Rules:
  rules                         List shopping rules
  add-rule <cat> <type> <text>   Add rule (cat: product|recipe|week, type: override|preference)
  remove-rule <id>              Remove a rule

Account:
  user                          User profile
  payment-profile               Payment methods
  transactions                  Wallet transactions`);
  process.exit(1);
}

async function run() {
  if (!command || command === "help" || command === "--help") usage();

  switch (command) {
    case "status":
      return output(await auth.status());
    case "login": {
      const email = cleanArgs[1];
      const password = cleanArgs[2];
      if (!email || !password) { console.error("Usage: picnic login <email> <password>"); process.exit(1); }
      const loginResult = await auth.login(email, password) as { status: string };
      if (loginResult.status === "2fa_required") {
        console.log("2FA required, sending SMS code...");
        await auth.generate2FA();
        console.log("SMS code sent. Enter the code:");
        const code = (await readLine()).trim();
        if (!code) { console.error("No code entered"); process.exit(1); }
        return output(await auth.verify2FA(code));
      }
      return output(loginResult);
    }
    case "logout":
      return output(await auth.logout());
    case "2fa-generate":
      return output(await auth.generate2FA());
    case "2fa-verify": {
      const code = cleanArgs[1];
      if (!code) { console.error("Usage: picnic 2fa-verify <code>"); process.exit(1); }
      return output(await auth.verify2FA(code));
    }
    case "search": {
      const query = cleanArgs[1];
      if (!query) { console.error("Usage: picnic search <query>"); process.exit(1); }
      const limitIdx = cleanArgs.indexOf("--limit");
      const limit = limitIdx !== -1 ? parseInt(cleanArgs[limitIdx + 1]) : undefined;
      return output(await searchCmd.search(query, limit));
    }
    case "suggestions": {
      const query = cleanArgs[1];
      if (!query) { console.error("Usage: picnic suggestions <query>"); process.exit(1); }
      return output(await searchCmd.suggestions(query));
    }
    case "product": {
      const id = cleanArgs[1];
      if (!id) { console.error("Usage: picnic product <id>"); process.exit(1); }
      return output(await searchCmd.productDetails(id));
    }
    case "cart":
      return output(await cart.getCart());
    case "add": {
      const id = cleanArgs[1];
      if (!id) { console.error("Usage: picnic add <id> [quantity]"); process.exit(1); }
      const qty = cleanArgs[2] ? parseInt(cleanArgs[2]) : 1;
      return output(await cart.addProduct(id, qty));
    }
    case "remove": {
      const id = cleanArgs[1];
      if (!id) { console.error("Usage: picnic remove <id> [quantity]"); process.exit(1); }
      const qty = cleanArgs[2] ? parseInt(cleanArgs[2]) : 1;
      return output(await cart.removeProduct(id, qty));
    }
    case "clear":
      return output(await cart.clearCart());
    case "slots":
      return output(await delivery.getSlots());
    case "set-slot": {
      const slotId = cleanArgs[1];
      if (!slotId) { console.error("Usage: picnic set-slot <id>"); process.exit(1); }
      return output(await delivery.setSlot(slotId));
    }
    case "deliveries":
      return output(await delivery.getDeliveries());
    case "delivery": {
      const id = cleanArgs[1];
      if (!id) { console.error("Usage: picnic delivery <id>"); process.exit(1); }
      return output(await delivery.getDelivery(id));
    }
    case "track": {
      const id = cleanArgs[1];
      if (!id) { console.error("Usage: picnic track <id>"); process.exit(1); }
      return output(await delivery.getPosition(id));
    }
    case "favorites": {
      const limitIdx = cleanArgs.indexOf("--limit");
      const limit = limitIdx !== -1 ? parseInt(cleanArgs[limitIdx + 1]) : undefined;
      const dealsOnly = args.includes("--deals");
      const refresh = args.includes("--refresh");
      let results = await favorites.getFavorites(limit, refresh) as any[];
      if (dealsOnly) results = results.filter((r: any) => r.onSale);
      return output(results);
    }
    case "recipes": {
      const mine = args.includes("--mine");
      const all = args.includes("--all");
      let recipes = all ? await recipe.getAllRecipes() as any[] : await recipe.getRecipes() as any[];
      if (mine) recipes = recipes.filter((r: any) => r.type === "user");
      return output(recipes);
    }
    case "recipe-search": {
      const query = cleanArgs[1];
      if (!query) { console.error("Usage: picnic recipe-search <query>"); process.exit(1); }
      return output(await recipe.searchRecipes(query));
    }
    case "recipe": {
      const id = cleanArgs[1];
      if (!id) { console.error("Usage: picnic recipe <id>"); process.exit(1); }
      return output(await recipe.getRecipeDetails(id));
    }
    case "save-recipe": {
      const id = cleanArgs[1];
      if (!id) { console.error("Usage: picnic save-recipe <id>"); process.exit(1); }
      return output(await recipe.saveRecipe(id));
    }
    case "unsave-recipe": {
      const id = cleanArgs[1];
      if (!id) { console.error("Usage: picnic unsave-recipe <id>"); process.exit(1); }
      return output(await recipe.unsaveRecipe(id));
    }
    case "recipe-add": {
      const productId = cleanArgs[1];
      const recipeId = cleanArgs[2];
      if (!productId || !recipeId) { console.error("Usage: picnic recipe-add <productId> <recipeId> [qty] [--ingredient-id ID] [--ingredient-type TYPE] [--day-offset N] [--servings N]"); process.exit(1); }
      const qty = cleanArgs[3] && !cleanArgs[3].startsWith("--") ? parseInt(cleanArgs[3]) : 1;
      const ingIdIdx = cleanArgs.indexOf("--ingredient-id");
      const ingTypeIdx = cleanArgs.indexOf("--ingredient-type");
      const dayIdx = cleanArgs.indexOf("--day-offset");
      const servIdx = cleanArgs.indexOf("--servings");
      const ingredientId = ingIdIdx !== -1 ? cleanArgs[ingIdIdx + 1] : undefined;
      const ingredientType = ingTypeIdx !== -1 ? cleanArgs[ingTypeIdx + 1] : undefined;
      const dayOffset = dayIdx !== -1 ? parseInt(cleanArgs[dayIdx + 1]) : undefined;
      const servings = servIdx !== -1 ? parseInt(cleanArgs[servIdx + 1]) : undefined;
      return output(await recipe.addProductToRecipe(productId, recipeId, qty, ingredientId, ingredientType, dayOffset, servings));
    }
    case "rules":
      return output(await rules.getRules());
    case "add-rule": {
      const category = cleanArgs[1];
      const type = cleanArgs[2];
      const text = cleanArgs.slice(3).join(" ");
      if (!category || !type || !text) { console.error("Usage: picnic add-rule <product|recipe> <override|preference> <rule text>"); process.exit(1); }
      if (category !== "product" && category !== "recipe" && category !== "week") { console.error("Category must be 'product', 'recipe', or 'week'"); process.exit(1); }
      if (type !== "override" && type !== "preference") { console.error("Type must be 'override' or 'preference'"); process.exit(1); }
      return output(await rules.addRule(category, type, text));
    }
    case "remove-rule": {
      const id = cleanArgs[1];
      if (!id) { console.error("Usage: picnic remove-rule <id>"); process.exit(1); }
      return output(await rules.removeRule(id));
    }
    case "user":
      return output(await user.getUser());
    case "payment-profile":
      return output(await payment.getPaymentProfile());
    case "transactions":
      return output(await payment.getTransactions());
    default:
      console.error(`Unknown command: ${command}`);
      usage();
  }
}

run().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
