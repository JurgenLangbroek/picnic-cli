import { route } from "./router";
import { initClient } from "./picnic-client";

const PORT = Number(process.env.PORT) || 3000;

await initClient();

Bun.serve({
  port: PORT,
  fetch: route,
  idleTimeout: 120,
});

console.log(`Picnic API server running on port ${PORT}`);
