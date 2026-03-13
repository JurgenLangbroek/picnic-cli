---
name: picnic
description: Manage grocery shopping on Picnic (Dutch supermarket) — search products, manage cart, check deliveries
requires:
  bins:
    - picnic
env:
  PICNIC_API_URL: http://localhost:3100
---

# Picnic Grocery Shopping

You can manage grocery shopping on Picnic using the `picnic` CLI tool. All commands output JSON by default.

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

## Common Workflows

### Search and Add to Cart

```bash
# Search for a product
picnic search "melk"

# Look at the results, find the product ID, then add it
picnic add <productId>

# Add multiple of the same item
picnic add <productId> 3

# View the cart
picnic cart
```

### Check Delivery Slots

```bash
# See available delivery windows
picnic slots

# Book a slot
picnic set-slot <slotId>
```

### Order History

```bash
picnic deliveries          # list past/upcoming deliveries
picnic delivery <id>       # details of a specific delivery
picnic track <id>          # live tracking of active delivery
```

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
| `picnic cart` | View current cart |
| `picnic add <id> [qty]` | Add product to cart |
| `picnic remove <id> [qty]` | Remove product from cart |
| `picnic clear` | Empty the cart |
| `picnic slots` | Available delivery windows |
| `picnic set-slot <id>` | Book a delivery slot |
| `picnic deliveries` | Order history |
| `picnic delivery <id>` | Delivery details |
| `picnic track <id>` | Live delivery tracking |
| `picnic recipes [--mine]` | Browse recipes (`--mine` for user's own) |
| `picnic recipe <id>` | Recipe details with categorized ingredients |
| `picnic save-recipe <id>` | Save a recipe |
| `picnic unsave-recipe <id>` | Unsave a recipe |
| `picnic recipe-add <productId> <recipeId>` | Add recipe ingredient to cart |
| `picnic favorites [--limit N]` | Frequently bought products with current prices |
| `picnic favorites --deals` | Only items cheaper than last time |
| `picnic user` | Account info |
| `picnic payment-profile` | Payment methods |
| `picnic transactions` | Wallet transactions |

### Recipes

```bash
picnic recipes --mine          # user's custom recipes
picnic recipe <id>             # see ingredients (CORE vs CUPBOARD)
picnic recipe-add <productId> <recipeId>  # add ingredient to cart
```

### Favorites & Deals

```bash
picnic favorites               # top 20 most frequently bought
picnic favorites --deals       # only items cheaper than last bought
```

## Tips

- Always check `picnic status` before other commands — if unauthenticated, guide the user through login
- Product IDs come from search results — use `picnic search` first
- Slot IDs come from `picnic slots` — use that before `picnic set-slot`
- All output is JSON; add `--pretty` for human-readable tables
- When searching, try different terms if nothing is found (e.g., "halfvolle melk" instead of "milk")
