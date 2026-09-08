export function Wordmark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const mark =
    size === "lg" ? "h-9 w-9 text-base" : size === "sm" ? "h-6 w-6 text-xs" : "h-7 w-7 text-sm";
  const text =
    size === "lg" ? "text-lg" : size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className={`inline-flex select-none items-center gap-2 ${className}`}>
      <span
        className={`flex shrink-0 items-center justify-center rounded-md bg-sky-500 font-bold text-white ${mark}`}
      >
        W
      </span>
      <span
        className={`font-bold tracking-[0.22em] text-slate-900 ${text}`}
      >
        WEBIFUNEL
      </span>
    </span>
  );
}
