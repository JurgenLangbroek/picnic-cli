import { get, post } from "../client.js";

export async function getSlots() {
  return get("/delivery/slots");
}

export async function setSlot(slotId: string) {
  return post("/delivery/slot", { slotId });
}

export async function getDeliveries() {
  return get("/deliveries");
}

export async function getDelivery(id: string) {
  return get(`/delivery/${encodeURIComponent(id)}`);
}

export async function getPosition(id: string) {
  return get(`/delivery/${encodeURIComponent(id)}/position`);
}
