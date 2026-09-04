export const FEATURED_LINEUP = "featured-ten";

export function lineupSettings(lineup) {
  return lineup === FEATURED_LINEUP
    ? { conference: "All", gameSelection: "competitive-ten" }
    : { conference: lineup, gameSelection: "all" };
}

export function lineupLabel(pool) {
  if (pool.gameSelection === "competitive-ten") {
    return !pool.conference || pool.conference === "All"
      ? "Featured 10 matchups"
      : `Featured 10 matchups · ${pool.conference}`;
  }
  return !pool.conference || pool.conference === "All" ? "All conferences" : pool.conference;
}
