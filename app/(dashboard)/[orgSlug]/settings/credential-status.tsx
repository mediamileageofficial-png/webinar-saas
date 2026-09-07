export function CredentialStatus({
  configured,
  updatedAt,
}: {
  configured: boolean;
  updatedAt: string | null;
}) {
  if (!configured) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
        Not configured
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      Configured{updatedAt ? ` - updated ${new Date(updatedAt).toLocaleDateString()}` : ""}
    </span>
  );
}
