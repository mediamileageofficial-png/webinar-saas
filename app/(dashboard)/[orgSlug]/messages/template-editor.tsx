"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { saveMessageTemplateAction, type TemplateActionState } from "./actions";
import type { TemplateKey, MessageChannel } from "@/lib/validation/schemas/message-template";

const initialState: TemplateActionState = {};

export interface ExistingTemplate {
  subject: string | null;
  body: string;
  provider_template_id: string | null;
  version: number;
}

export function TemplateEditor({
  orgSlug,
  templateKey,
  channel,
  existing,
}: {
  orgSlug: string;
  templateKey: TemplateKey;
  channel: MessageChannel;
  existing: ExistingTemplate | null;
}) {
  const boundAction = saveMessageTemplateAction.bind(null, orgSlug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
      <input type="hidden" name="key" value={templateKey} />
      <input type="hidden" name="channel" value={channel} />

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-slate-400">{channel}</span>
        {existing && (
          <span className="text-xs text-slate-400">Currently v{existing.version}</span>
        )}
      </div>

      {channel === "email" && (
        <TextField
          label="Subject"
          name="subject"
          type="text"
          defaultValue={existing?.subject ?? undefined}
        />
      )}

      <TextareaField
        label={channel === "email" ? "Body (HTML)" : "Body"}
        name="body"
        rows={4}
        defaultValue={existing?.body}
        placeholder="Hi {{name}}, you're confirmed for {{webinar_name}} on {{date}} at {{time}}. Join: {{join_link}}"
      />

      {channel !== "email" && (
        <TextField
          label={channel === "sms" ? "MSG91 template id (DLT-approved)" : "WhatsApp template name (Meta-approved)"}
          name="providerTemplateId"
          type="text"
          defaultValue={existing?.provider_template_id ?? undefined}
          placeholder="Required to actually send - see MSG91/WhatsApp Business dashboard"
        />
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save new version"}
      </button>
    </form>
  );
}
