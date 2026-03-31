# Picnic CLI + Server

Grocery shopping management via the Picnic API. See `../AGENTS.md` for the full development and publishing workflow.

## Structure

- `server/` — Bun REST server, uses `picnic-api` SDK, holds auth in Docker volume at `/data/session.json`
- `cli/` — Node.js CLI, talks to server via `PICNIC_API_URL`
- `openclaw-skill/` — Published skill package (`@jurgenlangbroek/openclaw-skill-picnic`)
- `skill/` — Local dev skill (portless URL)

## Quick commands

```bash
# Rebuild CLI after changes
cd cli && npx tsc

# Rebuild server after changes
docker compose build && docker compose up -d

# Test locally
curl http://picnic.localhost:1355/health
node cli/dist/picnic.js status

# Publish CLI update
cd cli && npm version patch && npx tsc && npm publish --access public

# Publish skill update
cd openclaw-skill && npm version patch && npm publish --access public
```

## Dependencies

The server uses the `picnic-api` npm package (from `../picnic-api/`). When the SDK is updated:

```bash
cd server && bun update picnic-api && docker compose build && docker compose up -d
```

## API

- Upstream: via `picnic-api` SDK (NL country code)
- Host port: 3010, portless: `picnic.localhost:1355`
- Docker internal: `picnic-api:3000` on `openclaw_shared`
- Single-profile auth (no multi-profile)
- Supports 2FA flow (SMS code)
