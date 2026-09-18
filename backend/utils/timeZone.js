export const DEFAULT_TIME_ZONE = "America/Chicago";

export function isValidTimeZone(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; }
  catch { return false; }
}

export function userTimeZone(value) {
  return isValidTimeZone(value) ? value : DEFAULT_TIME_ZONE;
}

export function footballSeason(now = new Date()) {
  // January and February bowls/playoffs belong to the previous fall's season.
  return now.getUTCFullYear() - (now.getUTCMonth() < 2 ? 1 : 0);
}
