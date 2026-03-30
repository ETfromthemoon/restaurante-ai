/**
 * billing.ts — Servicio centralizado de DodoPayments.
 * Usado tanto por el panel webmaster como por el signup público.
 */
import DodoPayments from 'dodopayments';

const DODO_API_KEY    = process.env.DODO_API_KEY    ?? '';
const DODO_PRODUCT_ID = process.env.DODO_PRODUCT_ID ?? '';
export const BASE_DOMAIN = process.env.BASE_DOMAIN  ?? 'miapp.com';

export const BILLING_ENABLED = !!(DODO_API_KEY && DODO_PRODUCT_ID);

const dodoEnv = process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode';

export const dodo = BILLING_ENABLED
  ? new DodoPayments({ bearerToken: DODO_API_KEY, environment: dodoEnv })
  : null;

export interface BillingResult {
  customerId:     string | null;
  subscriptionId: string | null;
  paymentLink:    string | null;
}

/**
 * Crea un customer + subscription en DodoPayments.
 * Si billing no está configurado devuelve nulls (modo dev/demo).
 */
export async function createSubscription(params: {
  tenantId:   string;
  tenantName: string;
  email:      string;
  slug:       string;
  country:    string;
}): Promise<BillingResult> {
  if (!dodo) {
    return { customerId: null, subscriptionId: null, paymentLink: null };
  }

  const result = await dodo.subscriptions.create({
    billing:      { country: params.country as any },
    customer:     { email: params.email, name: params.tenantName },
    product_id:   DODO_PRODUCT_ID,
    quantity:     1,
    payment_link: true,
    return_url:   `https://${params.slug}.${BASE_DOMAIN}/login?welcome=1`,
    metadata:     { tenant_id: params.tenantId },
  });

  return {
    customerId:     result.customer?.customer_id ?? null,
    subscriptionId: result.subscription_id,
    paymentLink:    result.payment_link ?? null,
  };
}
