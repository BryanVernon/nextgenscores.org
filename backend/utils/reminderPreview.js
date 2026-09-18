export function buildReminderPreview(email, { week = 1 } = {}) {
  const to = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("A valid email address is required");
  return {
    to,
    name: "Bryan",
    poolName: "NextGenScores Preview Pool",
    poolId: "preview",
    week: Number.isInteger(week) && week >= 0 ? week : 1,
    missingCount: 3,
  };
}
