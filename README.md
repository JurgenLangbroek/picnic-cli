# Picnic Grocery API & CLI

A personal Picnic (Dutch supermarket) assistant: a Bun-based REST API server running in Docker that wraps the [`picnic-api`](https://www.npmjs.com/package/picnic-api) npm package, with a compiled CLI for managing grocery shopping from the terminal.

Built for use as an AI agent skill for weekly meal planning and grocery shopping.

## Quick Start

```bash
# Start the API server
docker compose up -d

# Check it's running
curl localhost:3100/auth/status

# Login (interactive — handles 2FA automatically)
picnic login 'your@email.com' 'your-password'

# Search & shop
picnic search "melk"
picnic add s1010510
picnic cart
```

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  picnic CLI  │────▶│  Bun.serve() API │────▶│  Picnic API  │
│  (compiled)  │     │  (Docker :3100)  │     │  (picnic-api)│
└─────────────┘     └──────────────────┘     └─────────────┘
                           │
                    /data/session.json
                    /data/favorites-cache.json
                    /data/rules.json (configurable)
```

- **Server**: Bun.serve() with ~30 routes, no framework. Runs in Docker on port 3100.
- **CLI**: Compiled binary (`bun build --compile`), zero runtime deps. JSON output by default.
- **Auth**: Login via API, 2FA handled interactively, session persisted to Docker volume.
- **Rules**: Shopping preferences stored as JSON, mounted into the container via `RULES_PATH`.

## CLI Commands

```
picnic <command> [args] [--pretty] [--verbose]
```

### Auth
| Command | Description |
|---------|-------------|
| `picnic status` | Check authentication status |
| `picnic login <email> <password>` | Login (auto-handles 2FA) |
| `picnic logout` | Log out and clear session |

### Catalog
| Command | Description |
|---------|-------------|
| `picnic search <query> [--limit N]` | Search products |
| `picnic suggestions <query>` | Autocomplete suggestions |
| `picnic product <id>` | Product details |

### Cart
| Command | Description |
|---------|-------------|
| `picnic cart` | View cart (with week rules) |
| `picnic add <id> [qty]` | Add product to cart (with product rules) |
| `picnic remove <id> [qty]` | Remove product from cart |
| `picnic clear` | Empty the cart |

### Delivery
| Command | Description |
|---------|-------------|
| `picnic slots` | Available delivery windows |
| `picnic set-slot <id>` | Book a delivery slot |
| `picnic deliveries` | Order history |
| `picnic delivery <id>` | Delivery details |
| `picnic track <id>` | Live delivery tracking |

### Recipes
| Command | Description |
|---------|-------------|
| `picnic recipes [--mine] [--all]` | Browse recipes (`--mine` own, `--all` from meals page) |
| `picnic recipe-search <query>` | Search all Picnic recipes by name |
| `picnic recipe <id>` | Recipe details with ingredients and product rules |
| `picnic save-recipe <id>` | Save a recipe |
| `picnic unsave-recipe <id>` | Unsave a recipe |
| `picnic recipe-add <productId> <recipeId> [qty] [opts]` | Add recipe ingredient to cart (linked) |

#### Recipe-Add Options

When adding recipe ingredients, include linking metadata so products appear grouped in the Picnic app:

```bash
picnic recipe-add <productId> <recipeId> [qty] \
  --ingredient-id <uuid>       # from recipe detail response
  --ingredient-type <type>     # CORE, CORE_STOCKABLE, VARIATION
  --day-offset <N>             # day relative to delivery slot (0, 2, 4, etc.)
  --servings <N>               # number of servings (default: 4)
```

### Rules
| Command | Description |
|---------|-------------|
| `picnic rules` | List all shopping rules |
| `picnic add-rule <cat> <type> <text>` | Add rule (cat: `product`\|`recipe`\|`week`, type: `override`\|`preference`) |
| `picnic remove-rule <id>` | Remove a rule |

### Favorites
| Command | Description |
|---------|-------------|
| `picnic favorites [--limit N]` | Frequently bought products |
| `picnic favorites --deals` | Only items cheaper than last bought |
| `picnic favorites --refresh` | Force refresh (normally cached) |

### Account
| Command | Description |
|---------|-------------|
| `picnic user` | User profile |
| `picnic payment-profile` | Payment methods |
| `picnic transactions` | Wallet transactions |

### Flags

- `--pretty` — Human-readable table output instead of JSON
- `--verbose` — Full raw API response (useful for debugging)

## Shopping Rules

Rules are preferences and constraints that guide an AI agent when planning meals and adding products. They are stored as a JSON file and mounted into the container via the `RULES_PATH` environment variable (defaults to `./rules.json`).

### Rule Types

- **override** — Automatically applied. The agent must follow these unless `--no-rules` is passed.
- **preference** — The agent should suggest these and ask for confirmation before applying.

### Rule Categories

- **product** — How to select specific products (e.g., "prefer bio", "always Mutti for tomatoes")
- **recipe** — What makes a good recipe (e.g., "under 25 minutes", "child-friendly")
- **week** — Meal planning constraints (e.g., "3 meals x 2 days", "no 2x pasta in a week")

### Rules in API Responses

Rules are automatically embedded in relevant API responses so an agent doesn't need to fetch them separately:

- `picnic recipe-search` → recipe + week rules
- `picnic recipe <id>` → product rules (for ingredient selection)
- `picnic cart` → week rules (for reviewing the plan)
- `picnic add` → product rules (on every add)

### Smart Defaults

- **Cupboard items** (oil, salt, pepper, garlic) are separated into `assumedAtHome` in recipe details — the agent skips these.
- **Unavailability warnings** are suppressed when no delivery slot is selected, since stock checks default to tomorrow which is misleading.

## Smart Features

### Recipe Ingredient Linking

Products added via `recipe-add` with `--ingredient-id` are properly linked to recipes in the Picnic app, including meal plan day assignment and serving count. This enables the swap/substitute UI in the app.

### Recipe Search

`recipe-search` uses Picnic's Fusion search page with `page_context=MEALS&is_recipe=true`, giving access to the full recipe catalog (not just this week's menu).

### Recipe Ingredient Types

Recipe details distinguish between:
- **CORE** — mandatory ingredients (included in `ingredients`)
- **CORE_STOCKABLE** — mandatory but you might have it (included in `ingredients`)
- **VARIATION** — alternative/optional ingredients (included in `ingredients`)
- **CUPBOARD / HIDDEN_CUPBOARD** — pantry staples (moved to `assumedAtHome`)

### Favorites & Deals

Analyzes your last 20 orders to find frequently bought products, then compares with current prices to surface deals. Results are cached (order history to disk, prices for 4 hours).

## Setup

### Prerequisites

- Docker & Docker Compose
- [Bun](https://bun.sh) (for building the CLI)

### Server

```bash
docker compose up -d
```

The server starts on `localhost:3100` with a Docker volume for session persistence.

To use a custom rules file location, set `RULES_PATH` before starting:

```bash
# Example: sync rules from iCloud Drive
RULES_PATH=~/Library/Mobile\ Documents/com~apple~CloudDocs/Picnic/rules.json docker compose up -d
```

Or create a `.env` file:

```env
RULES_PATH=./my-rules.json
```

### CLI

```bash
cd cli
bun install
bun build --compile src/picnic.ts --outfile picnic
cp picnic /usr/local/bin/  # or anywhere on your PATH
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PICNIC_COUNTRY_CODE` | `NL` | Country (`NL` or `DE`) |
| `PICNIC_API_URL` | `http://localhost:3100` | API server URL (CLI) |
| `RULES_PATH` | `./rules.json` | Host path to rules JSON file (mounted into Docker) |

## Inspired By

[ivo-toby/mcp-picnic](https://github.com/ivo-toby/mcp-picnic) — Picnic MCP server exposing 25 tools.
