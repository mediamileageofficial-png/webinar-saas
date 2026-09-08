/**
 * Full-bleed background treatment: the WEBIFUNEL wordmark tiled at a large
 * scale, very low opacity, on the app's off-white ground. Purely decorative
 * (aria-hidden, pointer-events-none) and sits behind everything (-z-10).
 */
export function BrandBackdrop({
  variant = "auth",
}: {
  variant?: "auth" | "subtle";
}) {
  const opacity = variant === "auth" ? "opacity-[0.025]" : "opacity-[0.015]";
  const rows = variant === "auth" ? 9 : 7;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-50"
    >
      <div
        className={`absolute -left-24 top-1/2 flex -translate-y-1/2 -rotate-12 flex-col gap-8 ${opacity}`}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <span
            key={i}
            className="whitespace-nowrap text-[7.5rem] font-black leading-none tracking-tighter text-slate-900"
          >
            WEBIFUNEL&nbsp;WEBIFUNEL&nbsp;WEBIFUNEL&nbsp;WEBIFUNEL
          </span>
        ))}
      </div>
      {variant === "auth" && (
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-slate-50" />
      )}
    </div>
  );
}
