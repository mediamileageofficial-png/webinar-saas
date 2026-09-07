/**
 * Renders {{variable}} placeholders in a template body/subject.
 *
 * `escapeHtml` must be true when the result is inserted into an HTML email:
 * variable values can come from public form submissions (a registrant's own
 * name, for instance), and an unescaped "<script>" or stray "<" would be a
 * stored XSS vector in every email client that renders the confirmation.
 * SMS/WhatsApp are plain text, so escaping there would incorrectly show
 * literal "&amp;" etc. to the recipient - escaping is opt-in per call site,
 * not a global default, precisely so each channel gets the right behavior.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined>,
  options?: { escapeHtml?: boolean }
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const raw = variables[key];
    const value = raw === undefined || raw === null ? "" : String(raw);
    return options?.escapeHtml ? escapeHtml(value) : value;
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Extracts ordered {{variable}} names for provider APIs that need positional params (e.g. MSG91 SMS Flow). */
export function extractVariableNames(template: string): string[] {
  const matches = template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  const names: string[] = [];
  for (const m of matches) {
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return names;
}
