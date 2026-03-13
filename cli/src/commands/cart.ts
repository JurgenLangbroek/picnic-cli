import { get, post } from "../client";

export async function getCart() {
  return get("/cart");
}

export async function addProduct(productId: string, quantity = 1) {
  return post("/cart/add", { productId, quantity });
}

export async function removeProduct(productId: string, quantity = 1) {
  return post("/cart/remove", { productId, quantity });
}

export async function clearCart() {
  return post("/cart/clear");
}
