import { useEffect, useState } from "react";
import "./Leaderboard.css";

const API_BASE = import.meta.env.MODE === "development" ? "http://localhost:3002" : "https://nextgenscores-org.onrender.com";

async function readLeaderboard(pool, signal) {
  const response = await fetch(`${API_BASE}/api/pools/${pool.id}/leaderboard/current`, { credentials: "include", signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Unable to load leaderboard");
  if (!Array.isArray(body?.leaderboard)) throw new Error("The leaderboard response is incomplete.");
  return { ...body, pool: body.pool || pool };
}

export default function Leaderboard() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBoards() {
      try {
        const response = await fetch(`${API_BASE}/api/pools/mine`, { credentials: "include", signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load your pools");
        const pools = await response.json();
        const results = await Promise.all(pools.map(async pool => {
          try {
            return { pool, standings: await readLeaderboard(pool, controller.signal) };
          } catch (loadError) {
            if (loadError.name === "AbortError") throw loadError;
            return { pool, error: loadError.message };
          }
        }));
        setBoards(results);
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadBoards();
    return () => controller.abort();
  }, []);

  return <div className="leaderboard-page">
    <p className="eyebrow">See who is making the right calls</p><h1>Pool <span>Leaderboard</span></h1>
    <p className="leaderboard-intro">Track the weekly race across every Pick 'Em pool you have joined.</p>
    {loading && <p className="leaderboard-status">Loading your pools...</p>}
    {!loading && boards.length === 0 && !error && <div className="leaderboard-empty">Join or create a Pick 'Em pool to see standings here.</div>}
    {!loading && boards.length > 0 && <div className="leaderboard-boards">{boards.map(({ pool, standings, error: boardError }) => boardError ? <section className="leaderboard-board leaderboard-board-error" key={pool.id}><h2>{pool.name}</h2><p>{boardError}</p></section> : <LeaderboardTable key={pool.id} standings={standings} />)}</div>}
    {error && <div className="leaderboard-error">{error}</div>}
  </div>;
}

function LeaderboardTable({ standings }) {
  const pool = standings.pool;
  const leaderboard = standings.leaderboard;

  return <section className="leaderboard-board">
    <div className="leaderboard-board-header"><div><p className="eyebrow">{pool.conference || "All conferences"} · {standings.season} season</p><h2>{pool.name || "Pool leaderboard"}</h2></div><span>{standings.completedGames} / {standings.totalGames} final</span></div>
    {leaderboard.length === 0 ? <p className="leaderboard-status">No participants yet.</p> : <ol className="leaderboard-rows">{leaderboard.map(entry => <li key={entry.userId} className={entry.rank === 1 ? "leaderboard-row leader-row" : "leaderboard-row"}><span className="leaderboard-rank">#{entry.rank}</span><strong>{entry.name}</strong><span>{entry.correct} correct</span><small>{entry.picks} picks</small></li>)}</ol>}
  </section>;
}
