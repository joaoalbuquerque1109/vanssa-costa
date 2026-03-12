export const MERCADO_PAGO_API_URL = "https://api.mercadopago.com";

export function getMercadoPagoConfig() {
  return {
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    publicKey: process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY,
    webhookUrl: process.env.MERCADO_PAGO_WEBHOOK_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  };
}

export function mapMercadoPagoStatus(status: string | null | undefined) {
  if (!status) return "pending";

  const normalized = status.toLowerCase();
  if (normalized === "approved") return "paid";
  if (normalized === "authorized") return "authorized";
  if (normalized === "in_process") return "processing";
  if (normalized === "pending") return "pending";
  if (normalized === "rejected") return "failed";
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "refunded") return "refunded";
  if (normalized === "charged_back") return "chargeback";

  return normalized;
}
