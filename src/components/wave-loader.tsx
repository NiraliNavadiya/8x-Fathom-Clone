import { cn } from "cn";

// Eight bars rising in sequence. Styles live in globals.css (`.wave-loader`).
export function WaveLoader({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex min-h-40 items-center justify-center", className)}>
      <div className="wave-loader" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
