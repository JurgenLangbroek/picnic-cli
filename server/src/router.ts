import { handleAuth } from "./routes/auth";
import { handleCart } from "./routes/cart";
import { handleCatalog } from "./routes/catalog";
import { handleDelivery } from "./routes/delivery";
import { handleUser } from "./routes/user";
import { handlePayment } from "./routes/payment";
import { handleRecipe } from "./routes/recipe";
import { handleFavorites } from "./routes/favorites";
import { errorResponse } from "./middleware/error-handler";

const handlers = [handleAuth, handleCart, handleCatalog, handleDelivery, handleUser, handlePayment, handleRecipe, handleFavorites];

export async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/health") {
    return Response.json({ ok: true });
  }

  try {
    for (const handler of handlers) {
      const response = await handler(path, req, url);
      if (response) return response;
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
