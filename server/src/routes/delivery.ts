import { requireAuth } from "../picnic-client";
import { formatDeliveries, formatDelivery, formatSlots } from "../formatters";

export async function handleDelivery(path: string, req: Request, url: URL): Promise<Response | null> {
  const verbose = url.searchParams.get("verbose") === "true";

  if (path === "/delivery/slots" && req.method === "GET") {
    const slots = await requireAuth().cart.getDeliverySlots();
    return Response.json(verbose ? slots : formatSlots(slots));
  }

  if (path === "/delivery/slot" && req.method === "POST") {
    const { slotId } = await req.json() as { slotId: string };
    if (!slotId) return Response.json({ error: "slotId required" }, { status: 400 });
    const result = await requireAuth().cart.setDeliverySlot(slotId);
    return Response.json(result);
  }

  if (path === "/deliveries" && req.method === "GET") {
    const deliveries = await requireAuth().delivery.getDeliveries();
    return Response.json(verbose ? deliveries : formatDeliveries(deliveries));
  }

  const positionMatch = path.match(/^\/delivery\/(.+)\/position$/);
  if (positionMatch && req.method === "GET") {
    const position = await requireAuth().delivery.getDeliveryPosition(positionMatch[1]);
    return Response.json(position);
  }

  const rateMatch = path.match(/^\/delivery\/(.+)\/rate$/);
  if (rateMatch && req.method === "POST") {
    const { score } = await req.json() as { score: number };
    if (score === undefined) return Response.json({ error: "score required" }, { status: 400 });
    const result = await requireAuth().delivery.setDeliveryRating(rateMatch[1], score);
    return Response.json({ result });
  }

  const deliveryMatch = path.match(/^\/delivery\/([^/]+)$/);
  if (deliveryMatch && req.method === "GET") {
    const delivery = await requireAuth().delivery.getDelivery(deliveryMatch[1]);
    return Response.json(verbose ? delivery : formatDelivery(delivery));
  }

  return null;
}
