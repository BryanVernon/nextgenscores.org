import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import authFetch from "../authFetch";

const API_BASE = import.meta.env.MODE === "development"
  ? `${window.location.protocol}//${window.location.hostname}:3002`
  : "https://nextgenscores-org.onrender.com";

export default function Dashboard() {
  const { user, loading } = useContext(AuthContext);
  const [summaries, setSummaries] = useState({});
  const [pools, setPools] = useState([]);
  const [poolsLoading, setPoolsLoading] = useState(true);

  useEffect(() => {
    if (!user?.favoriteTeams?.length) return;

    user.favoriteTeams.forEach(async (team) => {
      try {
        const res = await fetch(`${API_BASE}/api/team-summary?team=${encodeURIComponent(team)}`);
        if (!res.ok) return;
        const data = await res.json();
        setSummaries(prev => ({ ...prev, [team]: data }));
      } catch (err) {
        console.error(`Failed to load summary for ${team}`, err);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    authFetch(`${API_BASE}/api/pools/mine`)
      .then(async res => {
        if (!res.ok) throw new Error("Couldn't load your pools.");
        return res.json();
      })
      .then(setPools)
      .catch(error => {
        console.error(error);
        setPools([]);
      })
      .finally(() => setPoolsLoading(false));
  }, [user]);

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
            <TeamPanel key={team} team={team} summary={summaries[team]} />
          ))
        ) : (
          <div className="dashboard-panel favorite-panel">
            <span className="panel-label">Favorite teams</span>
            <strong>Not set yet</strong>
            <p>Add a team to see their record and upcoming game here.</p>
          </div>
        )}

        <PoolPanel pools={pools} loading={poolsLoading} />
      </section>

      <div className="dashboard-actions">
        <Link className="dashboard-link" to="/schedule">View schedule <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  );
}

function TeamPanel({ team, summary }) {
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
            })}{" "}
            at{" "}
            {new Date(nextGame.startDate).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
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

function PoolPanel({ pools, loading }) {
  return <div className="dashboard-panel pools-panel">
    <span className="panel-label">Pick 'Em pools</span>
    {loading ? <p>Loading your pools...</p> : pools.length === 0 ? <>
      <strong>No pools yet</strong><p>Join a pool to make your picks and compete with friends.</p>
      <Link className="dashboard-link" to="/pickem">Find a pool <span aria-hidden="true">→</span></Link>
    </> : <div className="dashboard-pool-list">{pools.map(pool => <Link className="dashboard-pool-link" to={`/pickem?pool=${pool.id}`} key={pool.id}>
      <span><strong>{pool.name}</strong><small>{pool.conference} · {pool.participants}/{pool.limit ?? 10} players</small></span><span aria-hidden="true">→</span>
    </Link>)}</div>}
  </div>;
}
