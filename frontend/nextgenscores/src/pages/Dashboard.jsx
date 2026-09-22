import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import authFetch from "../authFetch";
import { lineupLabel } from "../gameLineup";
import { featuredGames, featuredWeekIndex } from "../featuredGames";
import { favoriteGameDay, favoriteTeamNextGame } from "../dashboardGames";
import useTimeZone from "../useTimeZone";
import { poolPickStatus, shouldShowPickPrompt } from "../poolPickStatus";
import { GameCard } from "./Scoreboard";

const API_BASE = import.meta.env.MODE === "development"
  ? `${window.location.protocol}//${window.location.hostname}:3002`
  : "https://nextgenscores-org.onrender.com";

export default function Dashboard() {
  const { user, loading } = useContext(AuthContext);
  const [pools, setPools] = useState([]);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [poolsError, setPoolsError] = useState(null);
  const [poolsAttempt, setPoolsAttempt] = useState(0);
  const [poolStatuses, setPoolStatuses] = useState({});

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    authFetch(`${API_BASE}/api/pools/mine`, { signal: controller.signal })
      .then(async res => {
        if (!res.ok) throw new Error("Couldn't load your pools.");
        return res.json();
      })
      .then(body => {
        if (!Array.isArray(body)) throw new Error("Couldn't load your pools.");
        if (!controller.signal.aborted) {
          setPoolStatuses({});
          setPools(body);
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) setPoolsError(error.message);
      })
      .finally(() => { if (!controller.signal.aborted) setPoolsLoading(false); });
    return () => controller.abort();
  }, [user, poolsAttempt]);

  useEffect(() => {
    if (poolsLoading || poolsError || pools.length === 0) return;
    const controller = new AbortController();
    Promise.all(pools.map(async pool => {
      const response = await authFetch(`${API_BASE}/api/pools/${pool.id}/picks/current`, { signal: controller.signal });
      if (!response.ok) throw new Error("Couldn't load your pick status.");
      const body = await response.json();
      if (!Array.isArray(body?.games)) throw new Error("Couldn't load your pick status.");
      return [pool.id, poolPickStatus(body.games, body.picks || {})];
    }))
      .then(entries => { if (!controller.signal.aborted) setPoolStatuses(Object.fromEntries(entries)); })
      .catch(() => { if (!controller.signal.aborted) setPoolStatuses({}); });
    return () => controller.abort();
  }, [pools, poolsError, poolsLoading]);

  const showPickPrompt = !poolsLoading && !poolsError && shouldShowPickPrompt(pools.map(pool => pool.id), poolStatuses);

  function retryPools() {
    setPoolsLoading(true);
    setPoolsError(null);
    setPoolsAttempt(attempt => attempt + 1);
  }

  if (loading) return <div className="page-message">Loading...</div>;
  if (!user) return <div className="page-message">Please log in</div>;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <p className="eyebrow">Your season hub</p><h1>Welcome back, <span>{user.name}</span>.</h1><p className="dashboard-lede">Your picks, teams, standings, and Saturday schedule in one place.</p>
      </header>

      <section className="dashboard-teams-section" aria-labelledby="dashboard-teams-title">
        <div className="dashboard-section-heading"><div><p className="eyebrow">Follow the action</p><h2 id="dashboard-teams-title">Your teams</h2></div><Link className="dashboard-link" to="/settings">Edit teams <span aria-hidden="true">→</span></Link></div>
        <div className="dashboard-grid">
          {user.favoriteTeams?.length ? (
            user.favoriteTeams.map(team => <TeamPanel key={team} team={team} />)
          ) : <div className="dashboard-panel favorite-panel"><span className="panel-label">Favorite teams</span><strong>Not set yet</strong><p>Add a team to see its record and upcoming game here.</p><Link className="dashboard-link" to="/settings">Choose favorite teams <span aria-hidden="true">→</span></Link></div>}
        </div>
      </section>

      <FeaturedGamesPanel />

      <section className="dashboard-picks-section" aria-labelledby="dashboard-picks-title">
        <div className="dashboard-section-heading"><div><p className="eyebrow">Pick ’Em</p><h2 id="dashboard-picks-title">Your pools</h2></div><Link className="dashboard-link" to="/pickem">Manage pools <span aria-hidden="true">→</span></Link></div>
        <DashboardPickPrompt show={showPickPrompt} />
        <PoolPanel pools={pools} loading={poolsLoading} error={poolsError} onRetry={retryPools} />
        <DashboardLeaderboardPanel pools={pools} loading={poolsLoading} error={poolsError} />
      </section>
    </div>
  );
}

function TeamPanel({ team }) {
  const timeZone = useTimeZone();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/team-summary?team=${encodeURIComponent(team)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("This team's update is unavailable right now.");
        const body = await response.json();
        if (!body?.record) throw new Error("This team's update is unavailable right now.");
        if (!controller.signal.aborted) setSummary(body);
      })
      .catch(requestError => { if (!controller.signal.aborted) setError(requestError.message); });
    return () => controller.abort();
  }, [team, attempt]);

  if (error) return <div className="dashboard-panel favorite-panel">
    <span className="panel-label">{team}</span>
    <p role="alert">Couldn't load this team's update. Please try again.</p>
    <button className="dashboard-link" onClick={() => { setError(null); setAttempt(value => value + 1); }}>Try again</button>
  </div>;

  if (!summary) return <div className="dashboard-panel favorite-panel"><span className="panel-label">{team}</span><p>Loading...</p></div>;

  const { record, lastGame, nextGame } = summary;
  const game = favoriteTeamNextGame(team, nextGame);
  const gameDay = game ? favoriteGameDay(game.startDate, timeZone) : null;

  return <div className="dashboard-panel favorite-panel">
    <span className="panel-label">{team}</span>
    <strong>{record.wins}-{record.losses}</strong>
    {lastGame && <p>Last game: {lastGame.isHome ? "vs" : "at"} {lastGame.opponent}, {lastGame.teamScore}-{lastGame.oppScore}</p>}
    {game ? <div className="dashboard-team-game"><span className="dashboard-game-label">Next game{gameDay ? ` · ${gameDay}` : ""}</span><div className="game-card"><GameCard game={game} showDate /></div></div> : <p className="dashboard-no-next-game">No upcoming game is scheduled yet.</p>}
  </div>;
}

function FeaturedGamesPanel() {
  const timeZone = useTimeZone();
  const [games, setGames] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [weekIndex, setWeekIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const selectedWeek = weekIndex == null ? null : weeks[weekIndex];
  const selectedWeekNumber = selectedWeek?.week ?? null;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/schedule?conference=All`, { signal: controller.signal, cache: "no-cache" })
      .then(async response => {
        if (!response.ok) throw new Error("This week’s featured games are unavailable right now.");
        const body = await response.json();
        if (!Array.isArray(body?.weeks)) throw new Error("This week’s featured games are unavailable right now.");
        const initialWeekIndex = featuredWeekIndex(body.weeks, new Date(), timeZone);
        if (initialWeekIndex < 0) throw new Error("No featured week is scheduled right now.");
        if (!controller.signal.aborted) {
          setWeeks(body.weeks);
          setWeekIndex(initialWeekIndex);
        }
      })
      .catch(requestError => { if (!controller.signal.aborted) { setError(requestError.message); setLoading(false); } });
    return () => controller.abort();
  }, [attempt, timeZone]);

  useEffect(() => {
    if (selectedWeekNumber == null) return;
    const controller = new AbortController();
    fetch(`${API_BASE}/api/schedule?conference=All&week=${encodeURIComponent(selectedWeekNumber)}`, { signal: controller.signal, cache: "no-cache" })
      .then(async response => {
        if (!response.ok) throw new Error("This week’s featured games are unavailable right now.");
        const body = await response.json();
        if (!Array.isArray(body?.games)) throw new Error("This week’s featured games are unavailable right now.");
        if (!controller.signal.aborted) setGames(featuredGames(body.games));
      })
      .catch(requestError => { if (!controller.signal.aborted) setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedWeekNumber]);

  function changeFeaturedWeek(offset) {
    setLoading(true);
    setError(null);
    setWeekIndex(value => value + offset);
  }

  function retry() {
    setGames([]);
    setWeeks([]);
    setWeekIndex(null);
    setError(null);
    setLoading(true);
    setAttempt(value => value + 1);
  }

  return <section className="dashboard-featured-section" aria-labelledby="dashboard-featured-title">
    <div className="dashboard-section-heading dashboard-featured-heading"><div><p className="eyebrow">The slate</p><h2 id="dashboard-featured-title">This week’s featured games</h2></div><Link className="dashboard-link" to="/schedule">Full schedule <span aria-hidden="true">→</span></Link></div>
    <div className="featured-week-navigation" role="group" aria-label="Browse featured weeks">
      <button type="button" className="schedule-button" disabled={loading || weekIndex == null || weekIndex <= 0} onClick={() => changeFeaturedWeek(-1)}>← <span>Previous</span></button>
      <span className="featured-week-caption">{selectedWeek ? `Week ${selectedWeek.week}` : "Loading week"}</span>
      <button type="button" className="schedule-button" disabled={loading || weekIndex == null || weekIndex >= weeks.length - 1} onClick={() => changeFeaturedWeek(1)}><span>Next</span> →</button>
    </div>
    {loading ? <div className="dashboard-featured-status" role="status">Loading this week’s featured games...</div> : error ? <div className="dashboard-featured-status" role="alert"><p>{error}</p><button className="dashboard-link" onClick={retry}>Try again</button></div> : games.length === 0 ? <div className="dashboard-featured-status">No featured games are scheduled this week. <Link className="dashboard-link" to="/schedule">View the full schedule <span aria-hidden="true">→</span></Link></div> : <ul className="games-grid dashboard-featured-grid">{games.map(game => <li className="game-card" key={game._id || game.id}><GameCard game={game} showDate /></li>)}</ul>}
  </section>;
}

function DashboardPickPrompt({ show }) {
  if (!show) return null;
  return <aside className="dashboard-pick-prompt" aria-label="Pick reminder">
    <div><p className="eyebrow">Your next action</p><h3>Finish this week’s picks</h3><p>One or more pools still need picks before kickoff.</p></div>
    <Link className="dashboard-link" to="/pickem">Make picks <span aria-hidden="true">→</span></Link>
  </aside>;
}

function DashboardLeaderboardPanel({ pools, loading, error }) {
  if (loading || error || pools.length === 0) return null;
  return <section className="dashboard-leaderboards" aria-labelledby="dashboard-leaderboards-title">
    <div className="dashboard-section-heading"><div><p className="eyebrow">Current standings</p><h3 id="dashboard-leaderboards-title">Leaderboard</h3></div><Link className="dashboard-link" to="/leaderboard">All standings <span aria-hidden="true">→</span></Link></div>
    <div className="dashboard-leaderboard-list">{pools.map(pool => <DashboardPoolLeaderboard key={pool.id} pool={pool} />)}</div>
  </section>;
}

function DashboardPoolLeaderboard({ pool }) {
  const [standings, setStandings] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    authFetch(`${API_BASE}/api/pools/${pool.id}/leaderboard/current`, { signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok || !Array.isArray(body?.leaderboard)) throw new Error("Unable to load standings.");
        if (!controller.signal.aborted) setStandings(body);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [pool.id]);

  return <article className="dashboard-leaderboard-card">
    <div><strong>{pool.name}</strong><small>{standings ? `Week ${standings.week} · ${standings.completedGames}/${standings.totalGames} games final` : error ? "Standings unavailable" : "Loading standings..."}</small></div>
    {standings && <ol>{standings.leaderboard.slice(0, 3).map(entry => <li key={entry.userId}><span>#{entry.rank} {entry.name}</span><b>{entry.correct}</b></li>)}</ol>}
    <Link className="dashboard-link" to={`/leaderboard`}>View leaderboard <span aria-hidden="true">→</span></Link>
  </article>;
}

function PoolPanel({ pools, loading, error, onRetry }) {
  return <div className="dashboard-panel pools-panel">
    <span className="panel-label">Pick ’Em pools</span>
    {loading ? <p role="status">Loading your pools...</p> : error ? <>
      <p role="alert">Couldn't load your pools. Please try again.</p>
      <button className="dashboard-link" onClick={onRetry}>Try again</button>
    </> : pools.length === 0 ? <>
      <strong>No pools yet</strong><p>Join a pool to make your picks and compete with friends.</p>
      <Link className="dashboard-link" to="/pickem">Browse or create a pool <span aria-hidden="true">→</span></Link>
    </> : <><p className="dashboard-pools-intro">Choose a pool to make or review this week’s picks.</p><div className="dashboard-pool-list">{pools.map(pool => <Link className="dashboard-pool-link" to={`/pickem?pool=${pool.id}`} key={pool.id}>
      <span><strong>{pool.name}</strong><small>{lineupLabel(pool)} · {pool.participants}/{pool.limit ?? 10} players</small></span><span className="dashboard-pool-action">Make picks <i aria-hidden="true">→</i></span>
    </Link>)}</div></>}
  </div>;
}
