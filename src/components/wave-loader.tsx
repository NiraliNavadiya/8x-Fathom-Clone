import { cn } from "cn";

// Eight bars rising in sequence. Styles live in globals.css (`.wave-loader`).
export function WaveLoader({
  label = "Loading",
  size = "md",
  className,
}: {
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    // At "md" it fills the rest of the page content area and centers there;
    // pages make <main> a flex column so `flex-1` can take the space.
    <div
      role="status"
      className={cn("flex items-center justify-center", size === "md" && "min-h-40 flex-1", className)}
    >
      <div className="wave-loader" data-size={size} aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
