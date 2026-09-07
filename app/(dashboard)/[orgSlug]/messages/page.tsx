import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  templateKeys,
  TEMPLATE_KEY_LABELS,
  messageChannels,
} from "@/lib/validation/schemas/message-template";
import { TemplateEditor, type ExistingTemplate } from "./template-editor";

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-600",
  queued: "bg-slate-100 text-slate-600",
};

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const canManageTemplates = ["organization_owner", "organization_admin"].includes(
    membership.role
  );

  const supabase = await createClient();

  const [{ data: activeTemplates }, { data: logs }] = await Promise.all([
    supabase
      .from("message_templates")
      .select("key, channel, subject, body, provider_template_id, version")
      .eq("organization_id", membership.organizationId)
      .eq("is_active", true),
    supabase
      .from("message_logs")
      .select("id, channel, template_key, recipient, status, failure_reason, created_at")
      .eq("organization_id", membership.organizationId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const templateByKeyChannel = new Map<string, ExistingTemplate>();
  activeTemplates?.forEach((t) => {
    templateByKeyChannel.set(`${t.key}:${t.channel}`, t);
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Messages</h1>
      <p className="mt-1 text-sm text-slate-500">
        Templates power automated confirmations, reminders, and follow-ups.
        Use {"{{name}}"}, {"{{webinar_name}}"}, {"{{date}}"}, {"{{time}}"},{" "}
        {"{{join_link}}"}, {"{{amount}}"}, {"{{registration_id}}"} as placeholders.
      </p>

      {canManageTemplates ? (
        <div className="mt-6 flex flex-col gap-6">
          {templateKeys.map((key) => (
            <section key={key}>
              <h2 className="text-sm font-semibold text-slate-900">
                {TEMPLATE_KEY_LABELS[key]}
              </h2>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {messageChannels.map((channel) => (
                  <TemplateEditor
                    key={channel}
                    orgSlug={orgSlug}
                    templateKey={key}
                    channel={channel}
                    existing={templateByKeyChannel.get(`${key}:${channel}`) ?? null}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-400">
          Only organization owners/admins can manage templates.
        </p>
      )}

      <h2 className="mt-10 text-sm font-semibold text-slate-900">Recent message activity</h2>
      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Recipient</th>
              <th className="px-4 py-2 font-medium">Channel</th>
              <th className="px-4 py-2 font-medium">Template</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No messages sent yet.
                </td>
              </tr>
            )}
            {logs?.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 text-slate-700">{log.recipient}</td>
                <td className="px-4 py-3 text-slate-500">{log.channel}</td>
                <td className="px-4 py-3 text-slate-500">{log.template_key}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[log.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                    title={log.failure_reason ?? undefined}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {new Date(log.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
