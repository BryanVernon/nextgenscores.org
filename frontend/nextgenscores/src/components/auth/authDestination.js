export function authDestination(state) {
  const path = state?.from;
  // Authentication redirects must stay on a known local application page.
  if (typeof path !== "string" || !/^\/(dashboard|pickem|settings|leaderboard|admin)(?:[/?#]|$)/.test(path)) return "/dashboard";
  return path;
}
