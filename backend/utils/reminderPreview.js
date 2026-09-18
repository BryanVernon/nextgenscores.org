export function buildReminderPreview(email) {
  const to = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("A valid email address is required");
  return {
    to,
    name: "Bryan",
    poolName: "NextGenScores Preview Pool",
    poolId: "preview",
    week: 1,
    missingCount: 3,
  };
}
