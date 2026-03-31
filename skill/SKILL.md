---
name: picnic
description: Plan weekly meals and manage grocery shopping on Picnic (Dutch supermarket) — search recipes, apply shopping rules, manage cart with recipe linking
requires:
  bins:
    - picnic
env:
  PICNIC_API_URL: http://picnic.localhost:1355
---

# Picnic Grocery Shopping

You can plan weekly meals and manage grocery shopping on Picnic using the `picnic` CLI tool. All commands output JSON by default.

## Auth Flow

Before using any commands, check if authenticated:

```bash
picnic status
```

If not authenticated, the user needs to log in:

```bash
picnic login <email> <password>
```

If the response is `{"status": "2fa_required"}`, a 2FA code is needed:

```bash
picnic 2fa-generate    # sends SMS code
picnic 2fa-verify <code>
```

## Weekly Meal Planning Workflow

The primary use case is planning a full week of meals. Follow this order:

### 1. Check Rules

```bash
picnic rules
```

Rules tell you how to plan. Key rule types:
- **week** rules: meal structure (3 meals x 2 days), variety constraints, standard recipes to always add
- **recipe** rules: what makes a good recipe (quick, child-friendly, seasonal, etc.)
- **product** rules: how to pick ingredients (prefer bio, always Mutti, brown rice, etc.)

### 2. Check Previous Orders (Avoid Repeats)

```bash
picnic deliveries                    # find recent delivery IDs
picnic delivery <id> --verbose       # see what was ordered
```

### 3. Browse This Week's Recipes First

```bash
picnic recipes                       # this week's Picnic menu
picnic recipes --all                 # all recipes from meals page
```

### 4. Search for Specific Recipes

```bash
picnic recipe-search "zalm"          # search full recipe catalog
picnic recipe-search "stamppot"
```

The response includes `results` (recipes) and `rules` (recipe + week rules to consider).

### 5. Get Recipe Details

```bash
picnic recipe <id>
```

Response includes:
- `ingredients` — items to buy (CORE, CORE_STOCKABLE, VARIATION)
- `assumedAtHome` — pantry staples (oil, salt, pepper, garlic) — skip these
- `rules` — product rules to apply when selecting ingredients

### 6. Add Ingredients with Recipe Linking

```bash
picnic recipe-add <productId> <recipeId> [qty] \
  --ingredient-id <uuid> \
  --ingredient-type CORE \
  --day-offset 0 \
  --servings 4
```

Always include `--ingredient-id` and `--ingredient-type` from the recipe detail so products are linked to the recipe in the Picnic app.

Use `--day-offset` to assign meals to days (0 = delivery day, 2 = two days later, etc.).

### 7. Apply Product Rules When Adding

When adding ingredients, apply rules from the response:

**Overrides (must follow):**
- Swap tomato products for Mutti brand
- Use brown rice / whole wheat pasta instead of white
- Use whole onions instead of pre-cut
- Use beef mince instead of pork/mixed
- Choose no-salt-added spice blends

**Preferences (ask first):**
- Prefer bio products — search for "bio <product>" alternatives
- Prefer store brands (Picnic brand)
- Prefer individual spices over pre-made mixes
- Check cart for eggs/apples before adding more
- Ask about pantry staples (ginger, milk, garlic, spices)
- Prefer naan bread when available as variation
- Suggest extra vegetables from variations

### 8. Add Standard Weekly Items

Always add these own recipes (overrides):
- **Wraps** (`409f1c9d025040098f055550b08d720b`) — weekly lunch
- **Standaard stuff** (`b91938aace3a4f9281490f936664826d`) — weekly pantry stock

Ask before adding:
- **Voorraadkast** (`11d7cd160b174a169f6874be21d68921`) — not needed every week

### 9. Review Cart

```bash
picnic cart
```

The cart response includes week rules. Verify:
- No duplicate cuisine types in the week
- Salmon included if possible
- Weekend oven dish if both partners are home (check calendars)

## All Commands

| Command | Description |
|---------|-------------|
| `picnic status` | Check authentication status |
| `picnic login <email> <password>` | Log in |
| `picnic 2fa-generate` | Send 2FA SMS code |
| `picnic 2fa-verify <code>` | Verify 2FA code |
| `picnic search <query> [--limit N]` | Search products |
| `picnic suggestions <query>` | Autocomplete suggestions |
| `picnic product <id>` | Product details |
| `picnic cart` | View current cart (includes week rules) |
| `picnic add <id> [qty]` | Add product to cart (includes product rules) |
| `picnic remove <id> [qty]` | Remove product from cart |
| `picnic clear` | Empty the cart |
| `picnic slots` | Available delivery windows |
| `picnic set-slot <id>` | Book a delivery slot |
| `picnic deliveries` | Order history |
| `picnic delivery <id>` | Delivery details (`--verbose` for line items) |
| `picnic track <id>` | Live delivery tracking |
| `picnic recipes [--mine] [--all]` | Browse recipes (weekly / all / own) |
| `picnic recipe-search <query>` | Search full recipe catalog |
| `picnic recipe <id>` | Recipe details with ingredients and rules |
| `picnic save-recipe <id>` | Save a recipe |
| `picnic unsave-recipe <id>` | Unsave a recipe |
| `picnic recipe-add <productId> <recipeId> [qty] [opts]` | Add recipe ingredient (linked) |
| `picnic favorites [--limit N] [--deals] [--refresh]` | Frequently bought products |
| `picnic rules` | List all shopping rules |
| `picnic add-rule <cat> <type> <text>` | Add rule (cat: product\|recipe\|week) |
| `picnic remove-rule <id>` | Remove a rule |
| `picnic user` | Account info |
| `picnic payment-profile` | Payment methods |
| `picnic transactions` | Wallet transactions |

## Tips

- Always check `picnic status` before other commands
- Check `picnic rules` at the start of a planning session — rules are embedded in responses but reading them upfront helps
- Browse `picnic recipes` (this week's menu) and new recipes before doing generic searches
- Product IDs come from search results or recipe details
- Slot IDs come from `picnic slots`
- All output is JSON; add `--pretty` for human-readable tables
- Use `--verbose` to see full API responses (useful for debugging)
- When searching, try Dutch terms (e.g., "halfvolle melk" not "milk")
- Cupboard items in recipes are already filtered to `assumedAtHome` — don't add those
- Unavailability warnings are hidden when no slot is selected (prices show as 999.99 placeholder)
