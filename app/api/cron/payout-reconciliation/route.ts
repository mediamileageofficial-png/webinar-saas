import { NextResponse } from "next/server";
import { runPayoutReconciliation } from "@/lib/payouts/reconciliation";

/**
 * Same auth pattern as /api/cron/automation-tick: Vercel sends CRON_SECRET
 * as a Bearer token automatically once configured as an env var.
 */
async function handleTick(req: Request): Promise<Response> {
  const configuredSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const providedSecret = authHeader?.replace(/^Bearer\s+/i, "");

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPayoutReconciliation();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/payout-reconciliation]", err);
    return NextResponse.json({ error: "Reconciliation tick failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handleTick(req);
}

export async function POST(req: Request) {
  return handleTick(req);
}
