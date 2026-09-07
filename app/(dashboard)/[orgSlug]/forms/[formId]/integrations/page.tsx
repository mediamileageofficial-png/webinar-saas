import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { generateQrCodeDataUrl } from "@/lib/utils/qrcode";
import { CopyButton } from "@/components/ui/copy-button";
import { CodeBlock } from "./code-block";

export default async function FormIntegrationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; formId: string }>;
}) {
  const { orgSlug, formId } = await params;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const supabase = await createClient();
  const { data: form, error } = await supabase
    .from("forms")
    .select("id, name, public_slug, is_published")
    .eq("id", formId)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  if (error || !form) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const publicUrl = `${appUrl}/f/${form.public_slug}`;

  const embedCode = `<iframe
  src="${publicUrl}"
  width="100%"
  height="700"
  frameborder="0"
  style="border: none;"
  title="${form.name}"
></iframe>`;

  const reactSnippet = `// Fetch the form's current fields (name, type, required, options)
const res = await fetch("${appUrl}/api/public/forms/${form.public_slug}");
const { form, fields } = await res.json();

// Submit a registration - "values" keys must match each field's field_key
const submitRes = await fetch("${appUrl}/api/public/forms/${form.public_slug}/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    values: {
      full_name: "Jane Doe",
      email: "jane@example.com",
      mobile: "9876543210",
    },
    utm: {
      utm_source: "google",
      utm_campaign: "spring-launch",
    },
    referrer: document.referrer,
    landingPage: window.location.href,
  }),
});

const result = await submitRes.json();
// result.ok === true on success
// result.requiresPayment === true means the form is paid - redirect the
// visitor to result.registrationId's checkout, e.g. \`/pay/\${result.registrationId}\`
// on THIS app's domain (Cashfree checkout is hosted here, not on your site).
// result.fieldErrors is a { [field_key]: message } map on validation failure (HTTP 422).`;

  let qrCodeDataUrl: string | null = null;
  try {
    qrCodeDataUrl = await generateQrCodeDataUrl(publicUrl);
  } catch {
    qrCodeDataUrl = null; // Non-fatal - the rest of the page still works without it.
  }

  return (
    <div>
      <Link
        href={`/${orgSlug}/forms/${formId}/builder`}
        className="text-xs text-slate-400 hover:underline"
      >
        &larr; Back to builder
      </Link>
      <h1 className="mt-1 text-lg font-semibold text-slate-900">Integrations - {form.name}</h1>

      {!form.is_published && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This form isn&apos;t published yet - these links won&apos;t work until you publish it
          from the builder.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-8">
        <section>
          <h2 className="text-sm font-semibold text-slate-900">Public URL</h2>
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={publicUrl}
              className="w-full max-w-xl rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
            <CopyButton text={publicUrl} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">Embed on any website (iframe)</h2>
          <p className="mt-1 text-sm text-slate-500">
            Works on any site that accepts raw HTML.
          </p>
          <div className="mt-2 max-w-2xl">
            <CodeBlock title="Embed code" code={embedCode} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">WordPress</h2>
          <p className="mt-1 text-sm text-slate-500">
            In the WordPress block editor, add a &quot;Custom HTML&quot; block and paste the
            embed code above. No plugin required.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">React integration</h2>
          <p className="mt-1 text-sm text-slate-500">
            Call the public API directly for a fully custom UI on your own React site.
          </p>
          <div className="mt-2 max-w-2xl">
            <CodeBlock title="Fetch + submit example" code={reactSnippet} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">QR code</h2>
          <p className="mt-1 text-sm text-slate-500">
            Scan to open the registration page - useful for print materials, banners, or event
            signage.
          </p>
          {qrCodeDataUrl ? (
            <div className="mt-2 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, not an optimizable remote/static asset */}
              <img
                src={qrCodeDataUrl}
                alt={`QR code linking to ${form.name}`}
                width={160}
                height={160}
                className="rounded-md border border-slate-200"
              />
              <a
                href={qrCodeDataUrl}
                download={`${form.public_slug}-qr.png`}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Download PNG
              </a>
            </div>
          ) : (
            <p className="mt-2 text-sm text-red-600">Could not generate a QR code right now.</p>
          )}
        </section>
      </div>
    </div>
  );
}
