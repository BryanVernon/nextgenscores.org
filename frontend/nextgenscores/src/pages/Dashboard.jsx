import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import authFetch from "../authFetch";
import { lineupLabel } from "../gameLineup";
import { featuredGames } from "../featuredGames";
import { favoriteTeamNextGame } from "../dashboardGames";
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
        if (!controller.signal.aborted) setPools(body);
      })
      .catch(error => {
        if (!controller.signal.aborted) setPoolsError(error.message);
      })
      .finally(() => { if (!controller.signal.aborted) setPoolsLoading(false); });
    return () => controller.abort();
  }, [user, poolsAttempt]);

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

      <section className="dashboard-picks-section" aria-labelledby="dashboard-picks-title">
        <div className="dashboard-section-heading"><div><p className="eyebrow">Your next action</p><h2 id="dashboard-picks-title">Pick ’Em center</h2></div><Link className="dashboard-link" to="/pickem">Manage pools <span aria-hidden="true">→</span></Link></div>
        <PoolPanel pools={pools} loading={poolsLoading} error={poolsError} onRetry={retryPools} />
      </section>

      <section className="dashboard-teams-section" aria-labelledby="dashboard-teams-title">
        <div className="dashboard-section-heading"><div><p className="eyebrow">Follow the action</p><h2 id="dashboard-teams-title">Your teams</h2></div><Link className="dashboard-link" to="/settings">Edit teams <span aria-hidden="true">→</span></Link></div>
        <div className="dashboard-grid">
          {user.favoriteTeams?.length ? (
            user.favoriteTeams.map(team => <TeamPanel key={team} team={team} />)
          ) : <div className="dashboard-panel favorite-panel"><span className="panel-label">Favorite teams</span><strong>Not set yet</strong><p>Add a team to see its record and upcoming game here.</p><Link className="dashboard-link" to="/settings">Choose favorite teams <span aria-hidden="true">→</span></Link></div>}
        </div>
      </section>

      <FeaturedGamesPanel />
    </div>
  );
}

function TeamPanel({ team }) {
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

  return <div className="dashboard-panel favorite-panel">
    <span className="panel-label">{team}</span>
    <strong>{record.wins}-{record.losses}</strong>
    {lastGame && <p>Last game: {lastGame.isHome ? "vs" : "at"} {lastGame.opponent}, {lastGame.teamScore}-{lastGame.oppScore}</p>}
    {game ? <div className="dashboard-team-game"><span className="dashboard-game-label">Next game</span><div className="game-card"><GameCard game={game} /></div></div> : <p className="dashboard-no-next-game">No upcoming game is scheduled yet.</p>}
  </div>;
}

function FeaturedGamesPanel() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/schedule?conference=All`, { signal: controller.signal, cache: "no-cache" })
      .then(async response => {
        if (!response.ok) throw new Error("Today's featured games are unavailable right now.");
        const body = await response.json();
        if (!Array.isArray(body?.games)) throw new Error("Today's featured games are unavailable right now.");
        if (!controller.signal.aborted) setGames(featuredGames(body.games));
      })
      .catch(requestError => { if (!controller.signal.aborted) setError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  return <section className="dashboard-featured-section" aria-labelledby="dashboard-featured-title">
    <div className="dashboard-section-heading"><div><p className="eyebrow">The slate</p><h2 id="dashboard-featured-title">Today’s featured games</h2></div><Link className="dashboard-link" to="/schedule">Full schedule <span aria-hidden="true">→</span></Link></div>
    {loading ? <div className="dashboard-featured-status" role="status">Loading today’s featured games...</div> : error ? <div className="dashboard-featured-status" role="alert"><p>{error}</p><button className="dashboard-link" onClick={() => { setError(null); setLoading(true); setAttempt(value => value + 1); }}>Try again</button></div> : games.length === 0 ? <div className="dashboard-featured-status">No featured games are scheduled right now. <Link className="dashboard-link" to="/schedule">View the full schedule <span aria-hidden="true">→</span></Link></div> : <ul className="games-grid dashboard-featured-grid">{games.map(game => <li className="game-card" key={game._id || game.id}><GameCard game={game} /></li>)}</ul>}
  </section>;
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
