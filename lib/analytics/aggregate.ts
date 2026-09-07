/**
 * Counts occurrences of a (possibly null) value across rows, e.g. grouping
 * registrations by utm_source. This aggregates in application code rather
 * than via SQL GROUP BY - fine at MVP data volumes per the plan's "keep
 * analytics simple for MVP" directive; a high-volume tenant would want this
 * pushed into a database view or materialized aggregate instead.
 */
export function groupCount(values: (string | null | undefined)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const raw of values) {
    const key = raw && raw.trim() ? raw : "Direct / Unknown";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

export function sortedEntries(counts: Record<string, number>): [string, number][] {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}
