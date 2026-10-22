// Updates one query parameter in place. Next.js syncs `history.replaceState`
// with useSearchParams, so filters update without a server round trip.
export function replaceSearchParam(name: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  window.history.replaceState(null, "", url);
}
