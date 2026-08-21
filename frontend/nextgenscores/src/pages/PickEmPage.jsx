import React, { useContext, useEffect, useState } from "react";
import "./PickEmPage.css";
import { AuthContext } from "../context/AuthContext";

const API_BASE = window.location.hostname === "localhost" ? "http://localhost:3002" : "https://nextgenscores-org.onrender.com";

async function readApiResponse(response) {
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { message: "The backend returned an HTML error page. It may need to be redeployed." };
  }
  if (!response.ok) throw new Error(body.message || body.error || "Request failed");
  return body;
}

export default function PickEmPage() {
  const [view, setView] = useState("home");
  const [pool, setPool] = useState(null);
  const [myPools, setMyPools] = useState([]);
  const [myPoolsLoading, setMyPoolsLoading] = useState(true);
  const openPicks = selectedPool => { setPool(selectedPool); setView("picks"); };
  useEffect(() => {
    fetch(`${API_BASE}/api/pools/mine`, { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(setMyPools)
      .finally(() => setMyPoolsLoading(false));
  }, []);
  useEffect(() => {
    const poolId = new URLSearchParams(window.location.search).get("pool");
    if (!poolId) return;
    fetch(`${API_BASE}/api/pools/mine`, { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(pools => {
        const selectedPool = pools.find(item => item.id === poolId);
        if (selectedPool) openPicks(selectedPool);
      })
      .catch(() => {});
  }, []);
  return <div className="pickem-page">
    <p className="eyebrow">Compete with your people</p><h1>Pick 'Em <span>Pools</span></h1>
    <p className="pickem-intro">Make your calls, track the field, and see who knows college football best.</p>
    {view === "home" && <><div className="home-buttons"><button className="btn" onClick={() => setView("create")}>Create Pool</button><button className="btn" onClick={() => setView("join")}>Join Pool</button></div><section className="my-pools-section"><div><p className="eyebrow">Your pools</p><h2>Ready for this week</h2></div>{myPoolsLoading ? <p>Loading your pools...</p> : myPools.length === 0 ? <p className="my-pools-empty">You have not joined any pools yet. Choose <strong>Join Pool</strong> to find one.</p> : <div className="my-pools-list">{myPools.map(item => <button className="my-pool-card" key={item.id} onClick={() => openPicks(item)}><span><strong>{item.name}</strong><small>{item.conference} · {item.participants}/{item.limit ?? 10} players</small></span><span aria-hidden="true">→</span></button>)}</div>}</section></>}
    {view === "join" && <JoinPool goBack={() => setView("home")} openPicks={openPicks} />}
    {view === "create" && <CreatePool goBack={() => setView("home")} openPicks={openPicks} />}
    {view === "picks" && <WeeklyPicks pool={pool} goBack={() => setView("home")} />}
  </div>;
}

function JoinPool({ goBack, openPicks }) {
  const { user } = useContext(AuthContext);
  const [pools, setPools] = useState([]); const [loading, setLoading] = useState(true); const [joiningId, setJoiningId] = useState(null);
  useEffect(() => { fetch(`${API_BASE}/api/pools`).then(res => res.json()).then(setPools).finally(() => setLoading(false)); }, []);
  async function join(pool) {
    setJoiningId(pool.id);
    try { const res = await fetch(`${API_BASE}/api/pools/${pool.id}/join`, { method: "POST", credentials: "include" }); await readApiResponse(res); openPicks(pool); }
    catch (error) { alert(error.message); } finally { setJoiningId(null); }
  }
  async function deletePool(pool) {
    if (!window.confirm(`Delete ${pool.name}? This permanently removes the pool and every saved pick.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/pools/${pool.id}`, { method: "DELETE", credentials: "include" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || body.error || "Failed to delete pool");
      setPools(current => current.filter(item => item.id !== pool.id));
    } catch (err) { alert(err.message); }
  }
  if (loading) return <p>Loading pools...</p>;
  return <div className="pickem-content"><button className="btn back-btn" onClick={goBack}>← Back</button><h2>Available pools</h2>
    <table className="pools-table"><thead><tr><th>Name</th><th>Conference</th><th>Scoring</th><th>Players</th><th>Limit</th><th>Action</th></tr></thead><tbody>{pools.map(item => <tr key={item.id}>
      <td>{item.name}</td><td>{item.conference}</td><td>{item.scoringType === "spread" ? "Against the spread" : "Straight up"}</td><td>{item.participants}/{item.limit ?? 10}</td><td>{item.limit ?? 10}</td><td>
        <button className="btn join-btn" onClick={() => join(item)} disabled={joiningId === item.id}>{joiningId === item.id ? "Joining..." : "Join"}</button><button className="btn picks-btn" onClick={() => openPicks(item)}>Make picks</button>{user?.role === "admin" && <button className="btn delete-pool-btn" onClick={() => deletePool(item)}>Delete</button>}
      </td></tr>)}</tbody></table>
  </div>;
}

function CreatePool({ goBack, openPicks }) {
  const [name, setName] = useState(""); const [scoringType, setScoringType] = useState("straight"); const [limit, setLimit] = useState("10"); const [conference, setConference] = useState("All"); const [conferences, setConferences] = useState([]); const [error, setError] = useState(null);
  useEffect(() => { fetch(`${API_BASE}/api/teams-by-conference`).then(res => res.ok ? res.json() : {}).then(data => setConferences(Object.keys(data).sort())).catch(() => {}); }, []);
  async function create(event) {
    event.preventDefault(); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/pools`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name, scoringType, conference, limit: limit ? Number(limit) : null }) });
      const created = await res.json(); if (!res.ok) throw new Error(created.message || "Failed to create pool"); openPicks({ id: created.id, name, conference, scoringType });
    } catch (err) { setError(err.message); }
  }
  return <div className="pickem-content"><button className="btn back-btn" onClick={goBack}>← Back</button><h2>Create a new pool</h2><form className="create-pool-form" onSubmit={create}>
    <label>Pool Name:<input value={name} onChange={e => setName(e.target.value)} required /></label>
    <label>Scoring Type:<select value={scoringType} onChange={e => setScoringType(e.target.value)}><option value="straight">Straight up</option><option value="spread">Against the spread</option></select></label>
    <label>Conference:<select value={conference} onChange={e => setConference(e.target.value)}><option value="All">All conferences</option>{conferences.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
    <label>Player limit:<input type="number" value={limit} onChange={e => setLimit(e.target.value)} min={1} /></label>
    {error && <p className="error-message">{error}</p>}<button type="submit" className="btn create-btn">Create Pool</button>
  </form></div>;
}

function WeeklyPicks({ pool, goBack }) {
  const [data, setData] = useState(null); const [choices, setChoices] = useState({}); const [leaderboard, setLeaderboard] = useState(null); const [error, setError] = useState(null); const [saving, setSaving] = useState(false); const [picksSaved, setPicksSaved] = useState(false);
  useEffect(() => { fetch(`${API_BASE}/api/pools/${pool.id}/picks/current`, { credentials: "include" }).then(readApiResponse).then(body => { setData(body); setChoices(body.picks || {}); setPicksSaved(body.games.length > 0 && body.games.every(game => body.picks?.[game.id])); }).catch(err => setError(err.message)); }, [pool.id]);
  useEffect(() => { fetch(`${API_BASE}/api/pools/${pool.id}/leaderboard/current`, { credentials: "include" }).then(readApiResponse).then(setLeaderboard).catch(() => {}); }, [pool.id]);
  async function save() {
    if (!data) return; if (data.games.some(game => !choices[game.id])) { setError("Choose a winner for every game before saving."); return; }
    setSaving(true); setError(null);
    try { const res = await fetch(`${API_BASE}/api/pools/${pool.id}/picks/current`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ picks: data.games.map(game => ({ gameId: game.id, pick: choices[game.id] })) }) }); await readApiResponse(res); setPicksSaved(true); const standings = await fetch(`${API_BASE}/api/pools/${pool.id}/leaderboard/current`, { credentials: "include" }); if (standings.ok) setLeaderboard(await readApiResponse(standings)); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  return <div className="pickem-content"><button className="btn back-btn" onClick={goBack}>← Back</button>{error && <p className="error-message">{error}</p>}{!data && !error && <p>Loading this week’s games...</p>}
    {data && <><p className="eyebrow">{data.pool.conference} · {data.season} season</p><h2>{data.pool.name} — Week {data.week}</h2>{data.games.length === 0 ? <p>No games are available for this week yet.</p> : picksSaved ? <div className="picks-confirmation"><span aria-hidden="true">✓</span><div><h3>Your picks are in.</h3><p>You picked every game for Week {data.week}. You can still update them before kickoff.</p></div><button className="btn picks-btn" onClick={() => setPicksSaved(false)}>Make changes</button></div> : <><p className="pick-help">Choose a winner for every game. You can update your selections until kickoff.</p><div className="weekly-games">{data.games.map(game => <article className="pick-game" key={game.id}><time>{new Date(game.startDate).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time><div className="pick-options"><button className={choices[game.id] === "away" ? "team-pick selected" : "team-pick"} onClick={() => setChoices({ ...choices, [game.id]: "away" })}>{game.awayTeam}</button><span>@</span><button className={choices[game.id] === "home" ? "team-pick selected" : "team-pick"} onClick={() => setChoices({ ...choices, [game.id]: "home" })}>{game.homeTeam}</button></div></article>)}</div><button className="btn create-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save this week's picks"}</button></>}<Leaderboard leaderboard={leaderboard} /></>}
  </div>;
}

function Leaderboard({ leaderboard }) {
  if (!leaderboard) return null;
  return <section className="weekly-leaderboard"><div><p className="eyebrow">Weekly leaderboard</p><h3>Week {leaderboard.week} standings</h3></div><p className="leaderboard-note">{leaderboard.completedGames} of {leaderboard.totalGames} games final</p><ol>{leaderboard.leaderboard.map(entry => <li key={entry.userId}><span className="leaderboard-rank">#{entry.rank}</span><strong>{entry.name}</strong><span>{entry.correct} correct</span></li>)}</ol></section>;
}
