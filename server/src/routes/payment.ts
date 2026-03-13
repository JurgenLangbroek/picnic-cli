import { requireAuth } from "../picnic-client";

export async function handlePayment(path: string, req: Request, _url: URL): Promise<Response | null> {
  if (path === "/payment/profile" && req.method === "GET") {
    const profile = await requireAuth().payment.getPaymentProfile();
    return Response.json(profile);
  }

  if (path === "/payment/transactions" && req.method === "GET") {
    const transactions = await requireAuth().payment.getWalletTransactions(0);
    return Response.json(transactions);
  }

  return null;
}
