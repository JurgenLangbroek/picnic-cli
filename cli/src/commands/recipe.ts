import { get, post } from "../client.js";

export async function getRecipes() {
  return get("/recipes");
}

export async function getAllRecipes() {
  return get("/recipes/all");
}

export async function searchRecipes(query: string) {
  return get(`/recipes/search?q=${encodeURIComponent(query)}`);
}

export async function getRecipeDetails(recipeId: string) {
  return get(`/recipe/${encodeURIComponent(recipeId)}`);
}

export async function saveRecipe(recipeId: string) {
  return post(`/recipe/${encodeURIComponent(recipeId)}/save`);
}

export async function unsaveRecipe(recipeId: string) {
  return post(`/recipe/${encodeURIComponent(recipeId)}/unsave`);
}

export async function addProductToRecipe(
  productId: string,
  recipeId: string,
  count = 1,
  ingredientId?: string,
  ingredientType?: string,
  dayOffset?: number,
  servings?: number,
) {
  return post("/recipe/add-product", {
    productId,
    recipeId,
    count,
    ...(ingredientId ? { ingredientId } : {}),
    ...(ingredientType ? { ingredientType } : {}),
    ...(dayOffset !== undefined ? { dayOffset } : {}),
    ...(servings !== undefined ? { servings } : {}),
  });
}
