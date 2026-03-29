/**
 * Webhook handler para DodoPayments.
 * POST /webmaster/api/billing/webhook
 *
 * Usa standardwebhooks para verificar la firma HMAC antes de procesar.
 *
 * Eventos manejados:
 *  subscription.active    → activar tenant
 *  subscription.on_hold   → suspender tenant (pago fallido)
 *  subscription.cancelled → suspender tenant
 *  subscription.expired   → suspender tenant
 *  subscription.renewed   → activar tenant
 *  subscription.failed    → suspender tenant
 */
import { Router, Request, Response } from 'express';
import { Webhook, WebhookVerificationError } from 'standardwebhooks';
import { masterStore } from '../../db/masterDatabase';

const router = Router();

// DodoPaments sends a Base64-encoded webhook secret.
// In dev/test we use a valid Base64 placeholder so the Webhook constructor doesn't throw.
const DODO_WEBHOOK_SECRET =
  process.env.DODO_WEBHOOK_SECRET ??
  Buffer.from('dev_webhook_secret_placeholder').toString('base64');

const wh = new Webhook(DODO_WEBHOOK_SECRET);

// ── Helpers ───────────────────────────────────────────────────────────────────

interface DodoPayload {
  type: string;
  data: {
    subscription_id?: string;
    customer_id?:     string;
    metadata?:        Record<string, string> | null;
  };
}

function getTenantId(payload: DodoPayload): string | null {
  return payload.data?.metadata?.tenant_id ?? null;
}

function activate(tenantId: string, subStatus: string, data: DodoPayload['data']) {
  if (!masterStore.getTenantById(tenantId)) return;
  masterStore.updateTenant(tenantId, {
    status: 'active',
    dodo_subscription_status: subStatus,
    ...(data.customer_id     && { dodo_customer_id: data.customer_id }),
    ...(data.subscription_id && { dodo_subscription_id: data.subscription_id }),
  });
}

function suspend(tenantId: string, subStatus: string) {
  if (!masterStore.getTenantById(tenantId)) return;
  masterStore.updateTenant(tenantId, { status: 'suspended', dodo_subscription_status: subStatus });
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.post('/webhook', (req: Request, res: Response): void => {
  // Verify signature
  const headers = {
    'webhook-id':        req.headers['webhook-id']        as string ?? '',
    'webhook-signature': req.headers['webhook-signature'] as string ?? '',
    'webhook-timestamp': req.headers['webhook-timestamp'] as string ?? '',
  };

  try {
    wh.verify(JSON.stringify(req.body), headers);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }
    res.status(500).json({ error: 'Webhook verification error' });
    return;
  }

  const payload = req.body as DodoPayload;
  const tenantId = getTenantId(payload);

  if (tenantId) {
    switch (payload.type) {
      case 'subscription.active':
      case 'subscription.renewed':
        activate(tenantId, payload.type.split('.')[1], payload.data);
        break;
      case 'subscription.on_hold':
      case 'subscription.cancelled':
      case 'subscription.expired':
      case 'subscription.failed':
        suspend(tenantId, payload.type.split('.')[1]);
        break;
    }
  }

  res.json({ received: true });
});

export default router;
