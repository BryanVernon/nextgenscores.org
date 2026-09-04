import React, { useEffect, useState } from "react";
import "./PickEmPage.css";
import { CONFERENCES } from "../teamOptions";
import { FEATURED_LINEUP, lineupSettings, lineupLabel } from "../gameLineup";
import authFetch from "../authFetch";
import LeaderboardEntry from "../components/LeaderboardEntry";

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
  const joinPool = joinedPool => {
    setMyPools(current => current.some(item => item.id === joinedPool.id) ? current : [joinedPool, ...current]);
    openPicks(joinedPool);
  };

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
    {view === "home" && <><div className="home-buttons"><button className="btn" onClick={() => setView("create")}>Create Pool</button></div><section className="my-pools-section"><div><p className="eyebrow">Your pools</p><h2>Ready for this week</h2></div>{myPoolsLoading ? <p>Loading your pools...</p> : myPools.length === 0 ? <p className="my-pools-empty">You have not joined any pools yet. Browse the available pools below to get started.</p> : <div className="my-pools-list">{myPools.map(item => <button className="my-pool-card" key={item.id} onClick={() => openPicks(item)}><span><strong>{item.name}</strong><small>{lineupLabel(item)} · {item.participants}/{item.limit ?? 10} players{item.visibility === "private" ? " · Private" : ""}</small>{item.inviteCode && <small>Invite: {item.id} / {item.inviteCode}</small>}</span><span aria-hidden="true">→</span></button>)}</div>}</section>{!myPoolsLoading && <JoinPool joinedPoolIds={myPools.map(item => item.id)} onJoined={joinPool} />}</>}
    {view === "create" && <CreatePool goBack={() => setView("home")} openPicks={openPicks} />}
    {view === "picks" && <WeeklyPicks pool={pool} goBack={() => setView("home")} />}
  </div>;
}

function JoinPool({ joinedPoolIds, onJoined }) {
  const [pools, setPools] = useState([]); const [loading, setLoading] = useState(true); const [joiningId, setJoiningId] = useState(null); const [search, setSearch] = useState(""); const [passwords, setPasswords] = useState({}); const [error, setError] = useState(null);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => { setLoading(true); setError(null); fetch(`${API_BASE}/api/pools?q=${encodeURIComponent(search)}`, { signal: controller.signal }).then(readApiResponse).then(setPools).catch(requestError => { if (requestError.name !== "AbortError") { setPools([]); setError(requestError.message); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); }, 200); return () => { clearTimeout(timer); controller.abort(); }; }, [search]);
  async function join(pool) { if (pool.visibility === "private" && !passwords[pool.id]) return alert("Enter this pool's password to join."); setJoiningId(pool.id); try { await readApiResponse(await authFetch(`${API_BASE}/api/pools/${pool.id}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: passwords[pool.id] || "" }) })); onJoined({ ...pool, participants: pool.participants + 1 }); } catch (requestError) { alert(requestError.message); } finally { setJoiningId(null); } }
  const availablePools = pools.filter(item => !joinedPoolIds.includes(item.id));
  return <section className="pickem-content available-pools-section"><h2>Available pools</h2><p className="pool-section-note">Open public pools appear first. Private pools require the password from their owner.</p><input className="pool-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search pool names" aria-label="Search pool names" />{loading ? <p className="available-pools-status">Loading available pools...</p> : error ? <p className="error-message">{error}</p> : availablePools.length === 0 ? <p className="available-pools-status">{search ? "No available pools match your search." : "There are no other pools available to join right now."}</p> : <><table className="pools-table"><thead><tr><th>Name</th><th>Type</th><th>Game lineup</th><th>Scoring</th><th>Players</th><th>Action</th></tr></thead><tbody>{availablePools.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.visibility === "private" ? "Private" : "Public"}</td><td>{lineupLabel(item)}</td><td>{item.scoringType === "spread" ? "Against the spread" : "Straight up"}</td><td>{item.participants}/{item.limit ?? 10}</td><td>{item.visibility === "private" && <input className="pool-password" type="password" value={passwords[item.id] || ""} onChange={event => setPasswords({ ...passwords, [item.id]: event.target.value })} placeholder="Pool password" />}<button className="btn join-btn" onClick={() => join(item)} disabled={joiningId === item.id}>{joiningId === item.id ? "Joining..." : "Join"}</button></td></tr>)}</tbody></table><div className="available-pool-cards">{availablePools.map(item => <article className="available-pool-card" key={item.id}><div><h3>{item.name}</h3><p>{item.visibility === "private" ? "Private pool" : "Public pool"} · {lineupLabel(item)}</p></div><dl><div><dt>Scoring</dt><dd>{item.scoringType === "spread" ? "Against the spread" : "Straight up"}</dd></div><div><dt>Players</dt><dd>{item.participants}/{item.limit ?? 10}</dd></div></dl>{item.visibility === "private" && <input className="pool-password" type="password" value={passwords[item.id] || ""} onChange={event => setPasswords({ ...passwords, [item.id]: event.target.value })} placeholder="Pool password" />}<button className="btn join-btn" onClick={() => join(item)} disabled={joiningId === item.id}>{joiningId === item.id ? "Joining..." : "Join pool"}</button></article>)}</div></>}</section>;
}

function CreatePool({ goBack, openPicks }) {
  const [name, setName] = useState(""); const [scoringType, setScoringType] = useState("straight"); const [limit, setLimit] = useState("10"); const [lineup, setLineup] = useState(FEATURED_LINEUP); const [visibility, setVisibility] = useState("public"); const [poolPassword, setPoolPassword] = useState(""); const [error, setError] = useState(null);
  const { conference, gameSelection } = lineupSettings(lineup);
  async function create(event) { event.preventDefault(); setError(null); try { const created = await readApiResponse(await authFetch(`${API_BASE}/api/pools`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, scoringType, conference, limit: Number(limit), gameSelection, visibility, poolPassword }) })); openPicks({ id: created.id, name, conference, scoringType, gameSelection, visibility: created.visibility }); } catch (requestError) { setError(requestError.message); } }
  return <div className="pickem-content"><button className="btn back-btn" onClick={goBack}>← Back</button><h2>Create a new pool</h2><p className="pool-section-note">If any game in your opening lineup has started, your pool begins with the next unstarted week.</p><form className="create-pool-form" onSubmit={create}><label>Pool Name:<input value={name} onChange={event => setName(event.target.value)} required /></label><label>Scoring Type:<select value={scoringType} onChange={event => setScoringType(event.target.value)}><option value="straight">Straight up</option><option value="spread">Against the spread</option></select></label><label>Game lineup:<select value={lineup} onChange={event => setLineup(event.target.value)}><option value={FEATURED_LINEUP}>Featured 10 matchups</option>{CONFERENCES.map(item => <option key={item} value={item}>{item}</option>)}</select></label><label>Player limit:<input type="number" value={limit} onChange={event => setLimit(event.target.value)} min={1} /></label><label>Visibility:<select value={visibility} onChange={event => setVisibility(event.target.value)}><option value="public">Public</option><option value="private">Private</option></select></label>{visibility === "private" && <label>Pool password:<input type="password" value={poolPassword} onChange={event => setPoolPassword(event.target.value)} minLength="4" required /></label>}{error && <p className="error-message">{error}</p>}<button type="submit" className="btn create-btn">Create Pool</button></form></div>;
}

function pickLocked(game, now = Date.now()) {
  const kickoff = game.startDate ? new Date(game.startDate).getTime() : NaN;
  return game.locked || !Number.isFinite(kickoff) || kickoff <= now;
}

function WeeklyPicks({ pool, goBack }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const [data, setData] = useState(null); const [choices, setChoices] = useState({}); const [leaderboard, setLeaderboard] = useState(null); const [error, setError] = useState(null); const [saving, setSaving] = useState(false); const [picksSaved, setPicksSaved] = useState(false); const [viewingPicks, setViewingPicks] = useState(false);
  useEffect(() => { authFetch(`${API_BASE}/api/pools/${pool.id}/picks/current`).then(readApiResponse).then(body => { setData(body); setChoices(body.picks || {}); setPicksSaved(body.games.length > 0 && body.games.every(game => pickLocked(game) || body.picks?.[game.id])); }).catch(requestError => setError(requestError.message)); }, [pool.id]);
  useEffect(() => { authFetch(`${API_BASE}/api/pools/${pool.id}/leaderboard/current`).then(readApiResponse).then(setLeaderboard).catch(() => {}); }, [pool.id]);
  async function save() { if (!data) return; if (data.games.some(game => !pickLocked(game) && !choices[game.id])) { setError("Choose a winner for every unlocked game before saving."); return; } setSaving(true); setError(null); try { await readApiResponse(await authFetch(`${API_BASE}/api/pools/${pool.id}/picks/current`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ season: data.season, week: data.week, picks: data.games.filter(game => !pickLocked(game)).map(game => ({ gameId: game.id, pick: choices[game.id] })) }) })); setPicksSaved(true); const standings = await authFetch(`${API_BASE}/api/pools/${pool.id}/leaderboard/current`); if (standings.ok) setLeaderboard(await readApiResponse(standings)); } catch (requestError) { setError(requestError.message); } finally { setSaving(false); } }
  return <div className="pickem-content"><button className="btn back-btn" onClick={goBack}>← Back</button>{error && <p className="error-message">{error}</p>}{!data && !error && <p>Loading this week's games...</p>}{data && <><p className="eyebrow">{lineupLabel(data.pool)} · {data.season} season</p><h2>{data.pool.name} — Week {data.week}</h2>{data.startsLater && <p className="spread-guide" role="status">Your picks begin Week {data.week} of the {data.season} season. Earlier games will not count toward your entry.</p>}<p className="spread-guide">Negative spread favors the home team (right); positive favors the away team (left).</p>{data.games.length === 0 ? <p>No games are available for this week yet.</p> : picksSaved ? <>{viewingPicks && <><div className="picks-review-heading"><h3>Your Week {data.week} picks</h3></div><div className="weekly-games">{data.games.map(game => <PickGame key={game.id} game={game} choice={choices[game.id]} readOnly locked={pickLocked(game, now)} />)}</div></>}<div className="picks-confirmation"><span aria-hidden="true">✓</span><div><h3>Your picks are saved.</h3><p>Week {data.week} picks lock individually at kickoff. Unstarted games can still be updated.</p></div><div className="picks-actions"><button className="btn picks-btn" onClick={() => setViewingPicks(value => !value)}>{viewingPicks ? "Hide picks" : "View picks"}</button><button className="btn picks-btn" onClick={() => { setViewingPicks(false); setPicksSaved(false); }}>Make changes</button></div></div></> : <><p className="pick-help">Choose a winner for each unlocked game. Games that have started are locked.</p><div className="weekly-games">{data.games.map(game => <PickGame key={game.id} game={game} choice={choices[game.id]} locked={pickLocked(game, now)} onPick={pick => setChoices({ ...choices, [game.id]: pick })} />)}</div><button className="btn create-btn" onClick={save} disabled={saving || data.games.every(game => pickLocked(game, now))}>{saving ? "Saving..." : "Save this week's picks"}</button></>}<Leaderboard leaderboard={leaderboard} /></>}</div>;
}

function PickGame({ game, choice, onPick, readOnly = false, locked = false }) {
  return <article className="pick-game"><time>{new Date(game.startDate).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>{locked && <p className="pick-lock-note">Locked at kickoff{!choice ? " · No pick submitted" : ""}</p>}<div className="pick-options"><button className={choice === "away" ? "team-pick selected" : "team-pick"} onClick={() => onPick?.("away")} disabled={readOnly || locked}>{game.awayLogo && <img src={game.awayLogo} alt="" />}<span>{game.awayApRank != null && <b className="pick-rank">#{game.awayApRank}</b>}{game.awayTeam}</span></button><span className="at-symbol">@</span><button className={choice === "home" ? "team-pick selected" : "team-pick"} onClick={() => onPick?.("home")} disabled={readOnly || locked}>{game.homeLogo && <img src={game.homeLogo} alt="" />}<span>{game.homeApRank != null && <b className="pick-rank">#{game.homeApRank}</b>}{game.homeTeam}</span></button></div>{(game.spread != null || game.overUnder != null) && <div className="pick-lines">{game.spread != null && <span>Spread: {game.spread}</span>}{game.overUnder != null && <span>O/U: {game.overUnder}</span>}</div>}</article>;
}

function Leaderboard({ leaderboard }) { if (!leaderboard) return null; return <section className="weekly-leaderboard"><div><p className="eyebrow">Weekly leaderboard</p><h3>Week {leaderboard.week} standings</h3></div><p className="leaderboard-note">{leaderboard.completedGames} of {leaderboard.totalGames} games final</p><ol className="participant-list">{leaderboard.leaderboard.map(entry => <LeaderboardEntry key={entry.userId} entry={entry} week={leaderboard.week} />)}</ol></section>; }
