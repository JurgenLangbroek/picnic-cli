# Picnic Grocery API & CLI

A personal Picnic (Dutch supermarket) assistant: a Bun-based REST API server running in Docker that wraps the [`picnic-api`](https://www.npmjs.com/package/picnic-api) npm package, with a compiled CLI for managing grocery shopping from the terminal.

Built for use as an OpenClaw agent skill.

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
```

- **Server**: Bun.serve() with ~25 routes, no framework. Runs in Docker on port 3100.
- **CLI**: Compiled binary (`bun build --compile`), zero runtime deps. JSON output by default.
- **Auth**: Login via API, 2FA handled interactively, session persisted to Docker volume.

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
| `picnic cart` | View cart (with availability warnings) |
| `picnic add <id> [qty]` | Add product to cart |
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
| `picnic recipes [--mine]` | Browse recipes (`--mine` for your own) |
| `picnic recipe <id>` | Recipe details with ingredients |
| `picnic save-recipe <id>` | Save a recipe |
| `picnic unsave-recipe <id>` | Unsave a recipe |
| `picnic recipe-add <productId> <recipeId>` | Add recipe ingredient to cart |

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

## Smart Features

### Cart Warnings

The cart automatically warns about:
- **Unavailable items** — shows reason and named replacement suggestions
- **No delivery slot chosen** — reminds you to pick one explicitly

### Recipe Ingredient Types

Recipe details distinguish between:
- **CORE** — mandatory ingredients
- **CORE_STOCKABLE** — mandatory but you might have it
- **CUPBOARD** — pantry staples ("waarschijnlijk nog in huis")

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

## OpenClaw Skill

See [`skill/SKILL.md`](skill/SKILL.md) for the OpenClaw agent skill definition.

## Inspired By

[ivo-toby/mcp-picnic](https://github.com/ivo-toby/mcp-picnic) — Picnic MCP server exposing 25 tools.
