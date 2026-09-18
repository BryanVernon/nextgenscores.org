export const DEFAULT_TIME_ZONE = "America/Chicago";
export const COMMON_TIME_ZONES = [
  ["America/New_York", "Eastern Time"],
  ["America/Chicago", "Central Time"],
  ["America/Denver", "Mountain Time"],
  ["America/Phoenix", "Arizona (no daylight saving)"],
  ["America/Los_Angeles", "Pacific Time"],
  ["America/Anchorage", "Alaska Time"],
  ["Pacific/Honolulu", "Hawaii Time"],
  ["UTC", "UTC"],
];

export function resolveTimeZone(value) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value || DEFAULT_TIME_ZONE }).format(); return value || DEFAULT_TIME_ZONE; }
  catch { return DEFAULT_TIME_ZONE; }
}

export function formatDateTime(value, timeZone, options = {}) {
  const date = value == null || value === "" ? null : new Date(value);
  return date && Number.isFinite(date.getTime())
    ? date.toLocaleString("en-US", { ...options, timeZone: resolveTimeZone(timeZone) })
    : "Time to be announced";
}
