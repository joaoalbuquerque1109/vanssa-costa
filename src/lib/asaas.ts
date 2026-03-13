export const ASAAS_API_BASE_URL = "https://api-sandbox.asaas.com/v3";

export function getAsaasConfig() {
  return {
    apiKey: String(process.env.ASAAS_API_KEY ?? "").trim(),
    webhookToken: String(process.env.ASAAS_WEBHOOK_TOKEN ?? "").trim(),
    webhookUrl: String(process.env.ASAAS_WEBHOOK_URL ?? "").trim(),
    appUrl: String(process.env.NEXT_PUBLIC_APP_URL ?? "").trim(),
    apiBaseUrl: String(process.env.ASAAS_API_BASE_URL ?? ASAAS_API_BASE_URL).trim().replace(/\/+$/, ""),
  };
}

export function mapAsaasStatus(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (!normalized) return "pending";
  if (normalized === "RECEIVED" || normalized === "CONFIRMED" || normalized === "RECEIVED_IN_CASH") return "paid";
  if (normalized === "AUTHORIZED") return "authorized";
  if (normalized === "PENDING" || normalized === "AWAITING_RISK_ANALYSIS") return "pending";
  if (normalized === "OVERDUE" || normalized === "REPROVED_BY_RISK_ANALYSIS") return "failed";
  if (normalized === "REFUNDED") return "refunded";
  if (normalized.startsWith("CHARGEBACK")) return "chargeback";

  return normalized.toLowerCase();
}

export function mapAsaasBillingTypeLabel(billingType?: string | null) {
  const normalized = String(billingType ?? "").trim().toUpperCase();

  if (normalized === "PIX") return "Pix";
  if (normalized === "CREDIT_CARD") return "Cartao de credito";
  if (normalized === "DEBIT_CARD") return "Cartao de debito";
  if (normalized === "BOLETO") return "Boleto";
  if (normalized === "UNDEFINED") return "Checkout Asaas";

  return "Nao identificado";
}

export function normalizeDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}
