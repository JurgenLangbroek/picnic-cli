import { get, post } from "../client";

export async function getRecipes() {
  return get("/recipes");
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

export async function addProductToRecipe(productId: string, recipeId: string, count = 1) {
  return post("/recipe/add-product", { productId, recipeId, count });
}
