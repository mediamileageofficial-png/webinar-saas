import { CopyButton } from "@/components/ui/copy-button";

export function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-xs text-slate-700">
        <code>{code}</code>
      </pre>
    </div>
  );
}
