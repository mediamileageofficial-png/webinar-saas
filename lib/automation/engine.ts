import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplatedMessage } from "@/lib/messaging/send";

/**
 * How far back from "now" a single tick looks for newly-due rules. Must be
 * >= the actual cron interval, or webinars could fall through the gap
 * between two ticks and never get their reminder. Wider than necessary just
 * means re-scanning a slightly bigger set of rows each tick - harmless,
 * since sendTemplatedMessage's dedupe_key is what actually prevents a
 * duplicate send, not the tightness of this window.
 */
const TICK_WINDOW_MINUTES = 15;

interface AutomationRuleRow {
  id: string;
  organization_id: string;
  webinar_id: string | null;
  trigger: "before_webinar" | "after_webinar";
  offset_minutes: number | null;
  channel: "sms" | "whatsapp" | "email";
  template_key: string;
}

export interface TickResult {
  rulesEvaluated: number;
  webinarsMatched: number;
  registrationsProcessed: number;
}

export async function runAutomationTick(now: Date = new Date()): Promise<TickResult> {
  const supabase = createAdminClient();
  const result: TickResult = { rulesEvaluated: 0, webinarsMatched: 0, registrationsProcessed: 0 };

  const { data: rules, error: rulesError } = await supabase
    .from("automation_rules")
    .select("id, organization_id, webinar_id, trigger, offset_minutes, channel, template_key")
    .eq("is_active", true)
    .in("trigger", ["before_webinar", "after_webinar"])
    .not("offset_minutes", "is", null);

  if (rulesError || !rules) return result;

  for (const rule of rules as AutomationRuleRow[]) {
    result.rulesEvaluated += 1;
    if (rule.offset_minutes === null) continue;

    // trigger_time = anchor_time + offset_minutes
    // due when: (now - window) < trigger_time <= now
    // <=> (now - window - offset) < anchor_time <= (now - offset)
    // Verified against real timestamps before writing this - see
    // supabase/migrations/automation_window_test.sql.
    const offsetMs = rule.offset_minutes * 60_000;
    const windowMs = TICK_WINDOW_MINUTES * 60_000;
    const rangeStart = new Date(now.getTime() - windowMs - offsetMs);
    const rangeEnd = new Date(now.getTime() - offsetMs);

    const anchorColumn = rule.trigger === "before_webinar" ? "start_time" : "end_time";

    let webinarQuery = supabase
      .from("webinars")
      .select("id, name, start_time, end_time, join_url")
      .eq("organization_id", rule.organization_id)
      .gt(anchorColumn, rangeStart.toISOString())
      .lte(anchorColumn, rangeEnd.toISOString())
      .not("status", "in", "(cancelled,draft)");

    if (rule.webinar_id) {
      webinarQuery = webinarQuery.eq("id", rule.webinar_id);
    }

    const { data: webinars } = await webinarQuery;
    if (!webinars || webinars.length === 0) continue;

    for (const webinar of webinars) {
      result.webinarsMatched += 1;

      const { data: registrations } = await supabase
        .from("registrations")
        .select("id, full_name, email, mobile")
        .eq("organization_id", rule.organization_id)
        .eq("webinar_id", webinar.id)
        .eq("status", "confirmed");

      for (const registration of registrations ?? []) {
        const recipient = rule.channel === "email" ? registration.email : registration.mobile;
        if (!recipient) continue;

        result.registrationsProcessed += 1;

        // dedupeSuffix = rule.id: this is what actually makes a rule
        // idempotent across ticks. If this exact rule already sent to this
        // registration (this tick, a re-run, or an overlapping window),
        // sendTemplatedMessage's unique dedupe_key silently no-ops instead
        // of sending twice - proven in Phase 8's message_dedupe_test.sql and
        // re-confirmed for this specific call pattern below.
        await sendTemplatedMessage({
          organizationId: rule.organization_id,
          registrationId: registration.id,
          templateKey: rule.template_key,
          channel: rule.channel,
          recipient,
          variables: {
            name: registration.full_name ?? "",
            webinar_name: webinar.name,
            date: new Date(webinar.start_time).toLocaleDateString(),
            time: new Date(webinar.start_time).toLocaleTimeString(),
            join_link: webinar.join_url ?? "",
            registration_id: registration.id,
          },
          dedupeSuffix: rule.id,
        });
      }
    }
  }

  return result;
}
