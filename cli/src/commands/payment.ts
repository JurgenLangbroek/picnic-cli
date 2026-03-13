import { get } from "../client";

export async function getPaymentProfile() {
  return get("/payment/profile");
}

export async function getTransactions() {
  return get("/payment/transactions");
}
