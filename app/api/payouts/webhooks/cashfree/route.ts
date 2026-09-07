import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CashfreePayoutsProvider } from "@/lib/payouts/cashfree-payouts";
import { getOrgCredentials } from "@/lib/integrations/credentials";
import { applyPayoutTransactionStatus } from "@/lib/payouts/apply-status";

/**
 * Reads ONLY the transfer id out of the raw payload, without trusting
 * anything else in it - same reasoning as the Payments webhook's
 * extractUnverifiedOrderId: we need to know which organization's payout
 * credentials to verify the signature against, but can't trust the payload
 * until AFTER verification. Using this value only for a lookup (never
 * acting on it) keeps that safe.
 */
function extractUnverifiedTransferId(rawBody: string): string | null {
  try {
    const payload = JSON.parse(rawBody);
    const transferData = payload?.data?.transfer ?? payload?.data ?? {};
    const transferId = transferData?.transfer_id;
    return typeof transferId === "string" ? transferId : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  // CRITICAL: raw body BEFORE any JSON parsing - Cashfree signs the exact
  // bytes sent; re-serializing can reformat numbers and break the signature.
  const rawBody = await req.text();

  const unverifiedTransferId = extractUnverifiedTransferId(rawBody);
  if (!unverifiedTransferId) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data: transaction, error: lookupError } = await supabase
      .from("payout_transactions")
      .select("id, organization_id, payout_request_id, status")
      .eq("provider", "cashfree")
      .eq("provider_transfer_id", unverifiedTransferId)
      .maybeSingle();

    if (lookupError || !transaction) {
      // Unknown transfer - acknowledge so Cashfree stops retrying, but do
      // nothing else. No signature has been verified yet, so this must not
      // be treated as a legitimate event either way.
      return NextResponse.json({ ok: true, note: "Unknown transfer, ignored." });
    }

    const credentials = await getOrgCredentials(transaction.organization_id, "cashfree_payouts");
    const provider = new CashfreePayoutsProvider(credentials);

    let signatureValid = false;
    try {
      signatureValid = provider.verifyWebhookSignature(rawBody, req.headers);
    } catch {
      signatureValid = false;
    }

    if (!signatureValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let event;
    try {
      event = provider.parseWebhookEvent(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
    }

    // Idempotency + terminal-state transition rules live in one shared
    // helper (lib/payouts/apply-status.ts) used by both this webhook and
    // the reconciliation cron - see that file for why that matters.
    const applyResult = await applyPayoutTransactionStatus(supabase, transaction, event.status, {
      utr: event.utr,
      rawPayload: JSON.parse(rawBody),
      source: "webhook",
    });

    if (!applyResult.applied) {
      return NextResponse.json({ ok: true, note: "Already processed or no change." });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[payouts/webhooks/cashfree]", err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
