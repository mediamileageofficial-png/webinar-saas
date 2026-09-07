export function BreakdownTable({
  title,
  entries,
  emptyLabel = "No data yet.",
}: {
  title: string;
  entries: [string, number][];
  emptyLabel?: string;
}) {
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {entries.map(([label, count]) => (
            <li key={label} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{label}</span>
              <span className="font-medium text-slate-900">
                {count}
                <span className="ml-1 text-xs font-normal text-slate-400">
                  ({total > 0 ? Math.round((count / total) * 100) : 0}%)
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
