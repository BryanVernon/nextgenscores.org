import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import authFetch from "../authFetch";
import { lineupLabel } from "../gameLineup";
import useTimeZone from "../useTimeZone";

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
      <p className="eyebrow">Your season hub</p>
      <h1>Welcome back, <span>{user.name}</span>.</h1>
      <p className="dashboard-lede">Keep your picks close and your Saturdays closer.</p>

      <section className="dashboard-grid">
        {user.favoriteTeams?.length ? (
          user.favoriteTeams.map(team => (
            <TeamPanel key={team} team={team} />
          ))
        ) : (
          <div className="dashboard-panel favorite-panel">
            <span className="panel-label">Favorite teams</span>
            <strong>Not set yet</strong>
            <p>Add a team to see their record and upcoming game here.</p>
            <Link className="dashboard-link" to="/settings">Choose favorite teams <span aria-hidden="true">→</span></Link>
          </div>
        )}

        <PoolPanel pools={pools} loading={poolsLoading} error={poolsError} onRetry={retryPools} />
      </section>

      <div className="dashboard-actions">
        <Link className="dashboard-link" to="/schedule">View schedule <span aria-hidden="true">→</span></Link>
      </div>
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

  if (!summary) {
    return (
      <div className="dashboard-panel favorite-panel">
        <span className="panel-label">{team}</span>
        <p>Loading...</p>
      </div>
    );
  }

  const { record, lastGame, nextGame } = summary;

  return (
    <div className="dashboard-panel favorite-panel">
      <span className="panel-label">{team}</span>
      <strong>{record.wins}-{record.losses}</strong>

      {lastGame && (
        <p>
          Last Game: {lastGame.isHome ? "vs" : "@"} {lastGame.opponent} — {lastGame.teamScore}-{lastGame.oppScore}
        </p>
      )}

      {nextGame && (
        <>
          <p>
            Next Game: {nextGame.isHome ? "vs" : "@"} {nextGame.opponent} on{" "}
            {new Date(nextGame.startDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone,
            })}{" "}
            at{" "}
            {new Date(nextGame.startDate).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone, timeZoneName: "short",
            })}
          </p>

          {nextGame.outlet && (
            <p>Watch on: {nextGame.outlet}</p>
          )}
        </>
      )}
    </div>
  );
}

function PoolPanel({ pools, loading, error, onRetry }) {
  return <div className="dashboard-panel pools-panel">
    <span className="panel-label">Pick 'Em pools</span>
    {loading ? <p role="status">Loading your pools...</p> : error ? <>
      <p role="alert">Couldn't load your pools. Please try again.</p>
      <button className="dashboard-link" onClick={onRetry}>Try again</button>
    </> : pools.length === 0 ? <>
      <strong>No pools yet</strong><p>Join a pool to make your picks and compete with friends.</p>
      <Link className="dashboard-link" to="/pickem">Find a pool <span aria-hidden="true">→</span></Link>
    </> : <div className="dashboard-pool-list">{pools.map(pool => <Link className="dashboard-pool-link" to={`/pickem?pool=${pool.id}`} key={pool.id}>
      <span><strong>{pool.name}</strong><small>{lineupLabel(pool)} · {pool.participants}/{pool.limit ?? 10} players</small></span><span aria-hidden="true">→</span>
    </Link>)}</div>}
  </div>;
}
