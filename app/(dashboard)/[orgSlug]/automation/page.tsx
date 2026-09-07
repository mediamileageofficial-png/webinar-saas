import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateAutomationRuleForm } from "./create-rule-form";
import { RuleRowActions } from "./rule-row-actions";
import { TEMPLATE_KEY_LABELS } from "@/lib/validation/schemas/message-template";
import type { TemplateKey } from "@/lib/validation/schemas/message-template";

function describeTrigger(trigger: string, offsetMinutes: number | null): string {
  if (trigger === "before_webinar" && offsetMinutes !== null) {
    return `${Math.abs(offsetMinutes)} min before the webinar`;
  }
  if (trigger === "after_webinar" && offsetMinutes !== null) {
    return `${offsetMinutes} min after the webinar ends`;
  }
  if (trigger === "no_show") return "When marked as no-show";
  return trigger;
}

export default async function AutomationPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const canManage = ["organization_owner", "organization_admin"].includes(membership.role);

  const supabase = await createClient();
  const [{ data: rules }, { data: webinars }] = await Promise.all([
    supabase
      .from("automation_rules")
      .select("id, webinar_id, trigger, offset_minutes, channel, template_key, is_active")
      .eq("organization_id", membership.organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("webinars")
      .select("id, name")
      .eq("organization_id", membership.organizationId)
      .order("start_time", { ascending: false }),
  ]);

  const webinarNameById = new Map((webinars ?? []).map((w) => [w.id, w.name]));

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Automation</h1>
      <p className="mt-1 text-sm text-slate-500">
        Registration and payment confirmations send automatically. Reminders
        and follow-ups below run on a schedule and only fire once per
        registration, even if the schedule overlaps.
      </p>

      {canManage && (
        <div className="mt-6">
          <CreateAutomationRuleForm orgSlug={orgSlug} webinarOptions={webinars ?? []} />
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Trigger</th>
              <th className="px-4 py-2 font-medium">Applies to</th>
              <th className="px-4 py-2 font-medium">Channel</th>
              <th className="px-4 py-2 font-medium">Template</th>
              <th className="px-4 py-2 font-medium">Status</th>
              {canManage && <th className="px-4 py-2 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(!rules || rules.length === 0) && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-6 text-center text-slate-400">
                  No automation rules yet.
                </td>
              </tr>
            )}
            {rules?.map((rule) => (
              <tr key={rule.id}>
                <td className="px-4 py-3 text-slate-900">
                  {describeTrigger(rule.trigger, rule.offset_minutes)}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {rule.webinar_id ? webinarNameById.get(rule.webinar_id) ?? "Unknown" : "All webinars"}
                </td>
                <td className="px-4 py-3 text-slate-500">{rule.channel}</td>
                <td className="px-4 py-3 text-slate-500">
                  {TEMPLATE_KEY_LABELS[rule.template_key as TemplateKey] ?? rule.template_key}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      rule.is_active
                        ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                        : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
                    }
                  >
                    {rule.is_active ? "Active" : "Paused"}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <RuleRowActions orgSlug={orgSlug} ruleId={rule.id} isActive={rule.is_active} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
