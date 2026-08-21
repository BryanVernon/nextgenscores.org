import { useEffect, useState } from "react";
import "./Leaderboard.css";

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3002"
  : "https://nextgenscores-org.onrender.com";

export default function Leaderboard() {
  const [pools, setPools] = useState([]);
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [standings, setStandings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/pools/mine`, { credentials: "include" })
      .then(async response => {
        if (!response.ok) throw new Error("Unable to load your pools");
        return response.json();
      })
      .then(items => {
        setPools(items);
        setSelectedPoolId(items[0]?.id || "");
      })
      .catch(loadError => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPoolId) {
      setStandings(null);
      return;
    }

    setError(null);
    fetch(`${API_BASE}/api/pools/${selectedPoolId}/leaderboard/current`, { credentials: "include" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "Unable to load leaderboard");
        return body;
      })
      .then(setStandings)
      .catch(loadError => setError(loadError.message));
  }, [selectedPoolId]);

  return (
    <div className="leaderboard-page">
      <p className="eyebrow">See who is making the right calls</p>
      <h1>Pool <span>Leaderboard</span></h1>
      <p className="leaderboard-intro">Track the weekly race across every Pick 'Em pool you have joined.</p>

      {loading && <p className="leaderboard-status">Loading your pools...</p>}
      {!loading && pools.length === 0 && <div className="leaderboard-empty">Join or create a Pick 'Em pool to see standings here.</div>}
      {!loading && pools.length > 0 && (
        <>
          <div className="leaderboard-selector">
            <label htmlFor="leaderboard-pool">Pool</label>
            <select id="leaderboard-pool" value={selectedPoolId} onChange={event => setSelectedPoolId(event.target.value)}>
              {pools.map(pool => <option key={pool.id} value={pool.id}>{pool.name}</option>)}
            </select>
          </div>
          {standings && <LeaderboardTable standings={standings} />}
        </>
      )}
      {error && <div className="leaderboard-error">{error}</div>}
    </div>
  );
}

function LeaderboardTable({ standings }) {
  return (
    <section className="leaderboard-board">
      <div className="leaderboard-board-header">
        <div>
          <p className="eyebrow">{standings.pool.conference} · {standings.season} season</p>
          <h2>{standings.pool.name}</h2>
        </div>
        <span>{standings.completedGames} / {standings.totalGames} final</span>
      </div>
      {standings.leaderboard.length === 0 ? (
        <p className="leaderboard-status">No participants yet.</p>
      ) : (
        <ol className="leaderboard-rows">
          {standings.leaderboard.map(entry => (
            <li key={entry.userId} className={entry.rank === 1 ? "leaderboard-row leader-row" : "leaderboard-row"}>
              <span className="leaderboard-rank">#{entry.rank}</span>
              <strong>{entry.name}</strong>
              <span>{entry.correct} correct</span>
              <small>{entry.picks} picks</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}