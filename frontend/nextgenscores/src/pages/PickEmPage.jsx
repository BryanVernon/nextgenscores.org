import React, { useEffect, useState } from "react";
import "./PickEmPage.css";
import { CONFERENCES } from "../teamOptions";
import authFetch from "../authFetch";

const API_BASE = import.meta.env.MODE === "development" ? `${window.location.protocol}//${window.location.hostname}:3002` : "https://nextgenscores-org.onrender.com";

async function readApiResponse(response) {
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { message: "The backend returned an HTML error page. It may need to be redeployed." }; }
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
    authFetch(`${API_BASE}/api/pools/mine`).then(response => response.ok ? response.json() : []).then(setMyPools).finally(() => setMyPoolsLoading(false));
  }, []);
  useEffect(() => {
    const poolId = new URLSearchParams(window.location.search).get("pool");
    if (!poolId) return;
    authFetch(`${API_BASE}/api/pools/mine`).then(response => response.ok ? response.json() : []).then(pools => {
      const selectedPool = pools.find(item => item.id === poolId);
      if (selectedPool) openPicks(selectedPool);
    }).catch(() => {});
  }, []);

  return <div className="pickem-page">
    <p className="eyebrow">Compete with your people</p><h1>Pick 'Em <span>Pools</span></h1><p className="pickem-intro">Make your calls, track the field, and see who knows college football best.</p>
    {view === "home" && <><div className="home-buttons"><button className="btn" onClick={() => setView("create")}>Create Pool</button><button className="btn" onClick={() => setView("join")}>Join Pool</button></div><section className="my-pools-section"><div><p className="eyebrow">Your pools</p><h2>Ready for this week</h2></div>{myPoolsLoading ? <p>Loading your pools...</p> : myPools.length === 0 ? <p className="my-pools-empty">You have not joined any pools yet. Choose <strong>Join Pool</strong> to find one.</p> : <div className="my-pools-list">{myPools.map(item => <button className="my-pool-card" key={item.id} onClick={() => openPicks(item)}><span><strong>{item.name}</strong><small>{item.conference} · {item.participants}/{item.limit ?? 10} players{item.visibility === "private" ? " · Private" : ""}</small>{item.inviteCode && <small>Invite: {item.id} / {item.inviteCode}</small>}</span><span aria-hidden="true">→</span></button>)}</div>}</section></>}
    {view === "join" && <JoinPool goBack={() => setView("home")} openPicks={openPicks} />}
    {view === "create" && <CreatePool goBack={() => setView("home")} openPicks={openPicks} />}
    {view === "picks" && <WeeklyPicks pool={pool} goBack={() => setView("home")} />}
  </div>;
}

function JoinPool({ goBack, openPicks }) {
  const [pools, setPools] = useState([]); const [loading, setLoading] = useState(true); const [joiningId, setJoiningId] = useState(null); const [search, setSearch] = useState(""); const [passwords, setPasswords] = useState({});
  useEffect(() => { const timer = setTimeout(() => { setLoading(true); fetch(`${API_BASE}/api/pools?q=${encodeURIComponent(search)}`).then(response => response.json()).then(setPools).finally(() => setLoading(false)); }, 200); return () => clearTimeout(timer); }, [search]);
  async function join(pool) { if (pool.visibility === "private" && !passwords[pool.id]) return alert("Enter this pool's password to join."); setJoiningId(pool.id); try { await readApiResponse(await authFetch(`${API_BASE}/api/pools/${pool.id}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: passwords[pool.id] || "" }) })); openPicks(pool); } catch (error) { alert(error.message); } finally { setJoiningId(null); } }
  if (loading) return <p>Loading pools...</p>;
  return <div className="pickem-content"><button className="btn back-btn" onClick={goBack}>← Back</button><h2>Available pools</h2><p className="pool-section-note">Open public pools appear first. Private pools require the password from their owner.</p><input className="pool-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search pool names" aria-label="Search pool names" /><table className="pools-table"><thead><tr><th>Name</th><th>Type</th><th>Conference</th><th>Scoring</th><th>Players</th><th>Action</th></tr></thead><tbody>{pools.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.visibility === "private" ? "Private" : "Public"}</td><td>{item.conference}</td><td>{item.scoringType === "spread" ? "Against the spread" : "Straight up"}</td><td>{item.participants}/{item.limit ?? 10}</td><td>{item.visibility === "private" && <input className="pool-password" type="password" value={passwords[item.id] || ""} onChange={event => setPasswords({ ...passwords, [item.id]: event.target.value })} placeholder="Pool password" />}<button className="btn join-btn" onClick={() => join(item)} disabled={joiningId === item.id}>{joiningId === item.id ? "Joining..." : "Join"}</button></td></tr>)}</tbody></table><div className="available-pool-cards">{pools.map(item => <article className="available-pool-card" key={item.id}><div><h3>{item.name}</h3><p>{item.visibility === "private" ? "Private pool" : "Public pool"} · {item.conference}</p></div><dl><div><dt>Scoring</dt><dd>{item.scoringType === "spread" ? "Against the spread" : "Straight up"}</dd></div><div><dt>Players</dt><dd>{item.participants}/{item.limit ?? 10}</dd></div></dl>{item.visibility === "private" && <input className="pool-password" type="password" value={passwords[item.id] || ""} onChange={event => setPasswords({ ...passwords, [item.id]: event.target.value })} placeholder="Pool password" />}<button className="btn join-btn" onClick={() => join(item)} disabled={joiningId === item.id}>{joiningId === item.id ? "Joining..." : "Join pool"}</button></article>)}</div></div>;
}

function CreatePool({ goBack, openPicks }) {
  const [name, setName] = useState(""); const [scoringType, setScoringType] = useState("straight"); const [limit, setLimit] = useState("10"); const [conference, setConference] = useState("AP Top 25"); const [gameSelection, setGameSelection] = useState("all"); const [visibility, setVisibility] = useState("public"); const [poolPassword, setPoolPassword] = useState(""); const [error, setError] = useState(null);
  async function create(event) { event.preventDefault(); setError(null); try { const created = await readApiResponse(await authFetch(`${API_BASE}/api/pools`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, scoringType, conference, limit: Number(limit), gameSelection, visibility, poolPassword }) })); openPicks({ id: created.id, name, conference, scoringType, gameSelection, visibility: created.visibility }); } catch (requestError) { setError(requestError.message); } }
  return <div className="pickem-content"><button className="btn back-btn" onClick={goBack}>← Back</button><h2>Create a new pool</h2><form className="create-pool-form" onSubmit={create}><label>Pool Name:<input value={name} onChange={event => setName(event.target.value)} required /></label><label>Scoring Type:<select value={scoringType} onChange={event => setScoringType(event.target.value)}><option value="straight">Straight up</option><option value="spread">Against the spread</option></select></label><label>Conference:<select value={conference} onChange={event => setConference(event.target.value)}>{CONFERENCES.map(item => <option key={item} value={item}>{item}</option>)}</select></label><label>Game selection:<select value={gameSelection} onChange={event => setGameSelection(event.target.value)}><option value="all">All eligible games</option><option value="competitive-ten">Competitive 10 — closest spreads</option></select></label><label>Player limit:<input type="number" value={limit} onChange={event => setLimit(event.target.value)} min={1} /></label><label>Visibility:<select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="public">Public — anyone can join</option><option value="private">Private — password required</option></select></label>{visibility === "private" && <label>Pool password:<input type="password" value={poolPassword} onChange={event => setPoolPassword(event.target.value)} minLength="4" required /></label>}{error && <p className="error-message">{error}</p>}<button type="submit" className="btn create-btn">Create Pool</button></form></div>;
}

function WeeklyPicks({ pool, goBack }) {
  const [data, setData] = useState(null); const [choices, setChoices] = useState({}); const [leaderboard, setLeaderboard] = useState(null); const [error, setError] = useState(null); const [saving, setSaving] = useState(false); const [picksSaved, setPicksSaved] = useState(false); const [viewingPicks, setViewingPicks] = useState(false);
  useEffect(() => { authFetch(`${API_BASE}/api/pools/${pool.id}/picks/current`).then(readApiResponse).then(body => { setData(body); setChoices(body.picks || {}); setPicksSaved(body.games.length > 0 && body.games.every(game => body.picks?.[game.id])); }).catch(requestError => setError(requestError.message)); }, [pool.id]);
  useEffect(() => { authFetch(`${API_BASE}/api/pools/${pool.id}/leaderboard/current`).then(readApiResponse).then(setLeaderboard).catch(() => {}); }, [pool.id]);
  async function save() { if (!data) return; if (data.games.some(game => !choices[game.id])) { setError("Choose a winner for every game before saving."); return; } setSaving(true); setError(null); try { await readApiResponse(await authFetch(`${API_BASE}/api/pools/${pool.id}/picks/current`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ picks: data.games.map(game => ({ gameId: game.id, pick: choices[game.id] })) }) })); setPicksSaved(true); const standings = await authFetch(`${API_BASE}/api/pools/${pool.id}/leaderboard/current`); if (standings.ok) setLeaderboard(await readApiResponse(standings)); } catch (requestError) { setError(requestError.message); } finally { setSaving(false); } }
  return <div className="pickem-content"><button className="btn back-btn" onClick={goBack}>← Back</button>{error && <p className="error-message">{error}</p>}{!data && !error && <p>Loading this week's games...</p>}{data && <><p className="eyebrow">{data.pool.conference} · {data.season} season</p><h2>{data.pool.name} — Week {data.week}</h2>{data.games.length === 0 ? <p>No games are available for this week yet.</p> : picksSaved ? <>{viewingPicks && <><div className="picks-review-heading"><h3>Your Week {data.week} picks</h3></div><div className="weekly-games">{data.games.map(game => <PickGame key={game.id} game={game} choice={choices[game.id]} readOnly />)}</div></>}<div className="picks-confirmation"><span aria-hidden="true">✓</span><div><h3>Your picks are in.</h3><p>You picked every game for Week {data.week}. You can still update them before kickoff.</p></div><div className="picks-actions"><button className="btn picks-btn" onClick={() => setViewingPicks(value => !value)}>{viewingPicks ? "Hide picks" : "View picks"}</button><button className="btn picks-btn" onClick={() => { setViewingPicks(false); setPicksSaved(false); }}>Make changes</button></div></div></> : <><p className="pick-help">Choose a winner for every game. You can update your selections until kickoff.</p><div className="weekly-games">{data.games.map(game => <PickGame key={game.id} game={game} choice={choices[game.id]} onPick={pick => setChoices({ ...choices, [game.id]: pick })} />)}</div><button className="btn create-btn" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save this week's picks"}</button></>}<Leaderboard leaderboard={leaderboard} /></>}</div>;
}

function PickGame({ game, choice, onPick, readOnly = false }) {
  return <article className="pick-game"><time>{new Date(game.startDate).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time><div className="pick-options"><button className={choice === "away" ? "team-pick selected" : "team-pick"} onClick={() => onPick?.("away")} disabled={readOnly}>{game.awayLogo && <img src={game.awayLogo} alt="" />}<span>{game.awayApRank != null && <b className="pick-rank">#{game.awayApRank}</b>}{game.awayTeam}</span></button><span className="at-symbol">@</span><button className={choice === "home" ? "team-pick selected" : "team-pick"} onClick={() => onPick?.("home")} disabled={readOnly}>{game.homeLogo && <img src={game.homeLogo} alt="" />}<span>{game.homeApRank != null && <b className="pick-rank">#{game.homeApRank}</b>}{game.homeTeam}</span></button></div>{(game.spread != null || game.overUnder != null) && <div className="pick-lines">{game.spread != null && <span>Spread: {game.spread}</span>}{game.overUnder != null && <span>O/U: {game.overUnder}</span>}</div>}</article>;
}

function Leaderboard({ leaderboard }) { if (!leaderboard) return null; return <section className="weekly-leaderboard"><div><p className="eyebrow">Weekly leaderboard</p><h3>Week {leaderboard.week} standings</h3></div><p className="leaderboard-note">{leaderboard.completedGames} of {leaderboard.totalGames} games final</p><ol>{leaderboard.leaderboard.map(entry => <li key={entry.userId}><span className="leaderboard-rank">#{entry.rank}</span><strong>{entry.name}</strong><span>{entry.correct} correct</span></li>)}</ol></section>; }
