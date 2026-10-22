// Display helpers shared by server and client components.

/** 85_000 → "1:25", 3_088_917 → "51:28", 3_700_000 → "1:01:40". */
export function formatTimestamp(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = (total % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/**
 * When a meeting happened. `recordedAt` is a calendar date with no reliable
 * time of day, so it is shown as a date in UTC; otherwise the upload time.
 */
export function formatMeetingDate(recordedAt: string | null, createdAt: string) {
  if (recordedAt) {
    return new Date(recordedAt).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });
  }
  return `Added ${new Date(createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}
