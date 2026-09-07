import { NextResponse } from "next/server";
import { runAutomationTick } from "@/lib/automation/engine";

/**
 * Called on a schedule (Vercel Cron - see vercel.json) to fire time-based
 * automation rules (reminders, post-webinar follow-ups). Safe to call more
 * often than needed, or twice for the same window, or out of order - every
 * actual send is deduplicated in sendTemplatedMessage via message_logs'
 * unique dedupe_key, not by anything in this endpoint or the schedule.
 */
async function handleTick(req: Request): Promise<Response> {
  const configuredSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const providedSecret = authHeader?.replace(/^Bearer\s+/i, "");

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAutomationTick();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/automation-tick]", err);
    return NextResponse.json({ error: "Automation tick failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handleTick(req);
}

export async function POST(req: Request) {
  return handleTick(req);
}
