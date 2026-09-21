import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Leaderboard.css";
import authFetch from "../authFetch";
import { seasonPoints } from "../leaderboardResults";
import { lineupLabel } from "../gameLineup";
import LeaderboardEntry, { PickResults } from "../components/LeaderboardEntry";

const API_BASE = import.meta.env.MODE === "development" ? `${window.location.protocol}//${window.location.hostname}:3002` : "https://nextgenscores-org.onrender.com";

export default function Leaderboard() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await authFetch(`${API_BASE}/api/pools/mine`, { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load your pools. Please try again.");
        const body = await response.json();
        if (!Array.isArray(body)) throw new Error("Unable to load your pools.");
        if (!controller.signal.aborted) setPools(body);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [attempt]);

  return <div className="leaderboard-page">
    <p className="eyebrow">Every week counts</p><h1>Pool <span>Leaderboard</span></h1>
    <p className="leaderboard-intro">Your points carry forward all season. Review the overall race or revisit any week's picks.</p>
    {loading && <p className="leaderboard-status" role="status">Loading your pools...</p>}
    {!loading && !pools.length && !error && <div className="leaderboard-empty"><p>Join or create a Pick 'Em pool to see standings here.</p><Link className="dashboard-link" to="/pickem">Browse pools →</Link></div>}
    <div className="leaderboard-boards">{pools.map(pool => <PoolLeaderboard key={pool.id} pool={pool} />)}</div>
    {error && <div className="leaderboard-error" role="alert"><p>{error}</p><button className="schedule-button" onClick={() => { setError(null); setLoading(true); setAttempt(value => value + 1); }}>Try again</button></div>}
  </div>;
}

function PoolLeaderboard({ pool }) {
  const [standings, setStandings] = useState(null);
  const [season, setSeason] = useState("");
  const [week, setWeek] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const query = new URLSearchParams({ week });
        if (season) query.set("year", season);
        const response = await authFetch(`${API_BASE}/api/pools/${pool.id}/leaderboard?${query}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok || !Array.isArray(body.leaderboard)) throw new Error(body.message || "Unable to load these standings.");
        if (!controller.signal.aborted) setStandings(body);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [pool.id, season, week, attempt]);

  function selectWeek(value) { setLoading(true); setError(null); setWeek(String(value)); }

  return <section className="leaderboard-board" aria-label={`${pool.name} standings`}>
    <div className="leaderboard-board-header"><div><p className="eyebrow">{lineupLabel(pool)}</p><h2>{pool.name}</h2></div><Link className="dashboard-link" to={`/pickem?pool=${pool.id}`}>Make picks →</Link></div>
    <div className="leaderboard-controls">
      <label>Season<select value={season || standings?.season || ""} onChange={event => { setLoading(true); setError(null); setSeason(event.target.value); setWeek("all"); }} disabled={!standings}>
        {!standings && <option value="">Loading...</option>}
        {standings?.seasons.map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <label>Standings<select value={week} onChange={event => selectWeek(event.target.value)} disabled={!standings}>
        <option value="all">Season total</option>
        {standings?.weeks.map(value => <option key={value} value={value}>Week {value}{value === standings.currentWeek ? " (current)" : ""}</option>)}
      </select></label>
      <button className="schedule-button" disabled={loading} onClick={() => { setLoading(true); setError(null); setAttempt(value => value + 1); }}>{loading ? "Loading…" : "Refresh"}</button>
    </div>
    {error && <p className="leaderboard-board-error" role="alert">{error} Use Refresh to try again.</p>}
    {loading && <p role="status">Loading standings...</p>}
    {!loading && !error && standings && <>
      <p className="leaderboard-note">{standings.view === "season" ? `${standings.season} season total` : `Week ${standings.week}`} · {standings.completedGames} of {standings.totalGames} games final. One point per correct pick; ties and pushes earn no points.</p>
      {standings.leaderboard.length === 0 ? <p>No results yet for this season.</p> : <ol className="participant-list">{standings.leaderboard.map(entry => standings.view === "season"
        ? <li className="participant-entry" key={entry.userId}><details className={`participant-details${entry.rank === 1 ? " participant-leader" : ""}`}>
          <summary className="participant-summary"><span className="participant-rank">#{entry.rank}</span><strong>{entry.name}</strong><span className="participant-score">{seasonPoints(entry.correct, standings.totalGames)}</span><span className="participant-toggle">By week ⌄</span></summary>
          <div className="participant-breakdown"><h4>{entry.name}'s season</h4><ul className="season-week-results">{entry.weeks.map(item => <SeasonWeekResult key={item.week} poolId={pool.id} season={standings.season} entry={entry} item={item} scoringType={pool.scoringType} />)}</ul></div>
        </details></li>
        : <LeaderboardEntry key={entry.userId} entry={entry} week={standings.week} scoringType={pool.scoringType} />)}</ol>}
    </>}
  </section>;
}

function SeasonWeekResult({ poolId, season, entry, item, scoringType }) {
  const [open, setOpen] = useState(false);
  const [weekEntry, setWeekEntry] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOpen(false);
    setWeekEntry(null);
    setError(null);
    setLoading(false);
  }, [poolId, season, item.week, entry.userId]);

  async function toggle() {
    if (open) return setOpen(false);
    setOpen(true);
    if (weekEntry || loading) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ year: String(season), week: String(item.week) });
      const response = await authFetch(`${API_BASE}/api/pools/${poolId}/leaderboard?${query}`);
      const body = await response.json();
      const found = body.leaderboard?.find(candidate => String(candidate.userId) === String(entry.userId));
      if (!response.ok || !found) throw new Error(body.message || "Unable to load these picks.");
      setWeekEntry(found);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return <li className={open ? "season-week-result is-open" : "season-week-result"}>
    <button className="season-week-button" aria-expanded={open} onClick={toggle}><span>Week {item.week}</span><span>{item.correct} correct · {item.picks} picks saved</span></button>
    {open && <div className="season-week-detail">{loading ? <p role="status">Loading Week {item.week} picks...</p> : error ? <p className="leaderboard-board-error" role="alert">{error}</p> : weekEntry && <PickResults entry={weekEntry} week={item.week} scoringType={scoringType} />}</div>}
  </li>;
}
