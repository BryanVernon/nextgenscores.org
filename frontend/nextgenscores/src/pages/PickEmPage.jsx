import React, { useEffect, useState } from "react";
import "./PickEmPage.css";
import { CONFERENCES } from "../teamOptions";
import { FEATURED_LINEUP, lineupSettings, lineupLabel } from "../gameLineup";
import authFetch from "../authFetch";
import LeaderboardEntry from "../components/LeaderboardEntry";
import { pickLocked, savedPickSummary } from "../pickState";
import { poolPickStatus } from "../poolPickStatus";
import useTimeZone from "../useTimeZone";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.MODE === "development" ? `${window.location.protocol}//${window.location.hostname}:3002` : "https://nextgenscores-org.onrender.com";

async function readApiResponse(response) {
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { throw new Error("We couldn't reach the pool service. Please try again."); }
  if (!response.ok) throw new Error(body.message || body.error || "Request failed");
  return body;
}

export default function PickEmPage() {
  const [view, setView] = useState("home");
  const [pool, setPool] = useState(null);
  const [myPools, setMyPools] = useState([]);
  const [myPoolsLoading, setMyPoolsLoading] = useState(true);
  const [myPoolsError, setMyPoolsError] = useState(null);
  const [myPoolsAttempt, setMyPoolsAttempt] = useState(0);
  const openPicks = selectedPool => { setPool(selectedPool); setView("picks"); };
  const joinPool = joinedPool => {
    setMyPools(current => [joinedPool, ...current.filter(item => item.id !== joinedPool.id)]);
    setMyPoolsError(null);
    openPicks(joinedPool);
  };

  useEffect(() => {
    const controller = new AbortController();
    const poolId = new URLSearchParams(window.location.search).get("pool");
    authFetch(`${API_BASE}/api/pools/mine`, { signal: controller.signal })
      .then(readApiResponse)
      .then(pools => {
        if (!Array.isArray(pools)) throw new Error("Couldn't load your pools. Please try again.");
        if (controller.signal.aborted) return;
        setMyPools(pools);
        const selectedPool = pools.find(item => item.id === poolId);
        if (selectedPool) openPicks(selectedPool);
      })
      .catch(error => { if (!controller.signal.aborted) setMyPoolsError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setMyPoolsLoading(false); });
    return () => controller.abort();
  }, [myPoolsAttempt]);

  function retryMyPools() {
    setMyPoolsError(null);
    setMyPoolsLoading(true);
    setMyPoolsAttempt(value => value + 1);
  }

  return <div className="pickem-page">
    <p className="eyebrow">Compete with your people</p><h1>Pick 'Em <span>Pools</span></h1><p className="pickem-intro">Make your calls, track the field, and see who knows college football best.</p>
    {view === "home" && <>
      <section className="pickem-next-step" aria-labelledby="pickem-next-step-title">
        <p className="eyebrow">Your next step</p>
        <h2 id="pickem-next-step-title">Make your picks</h2>
        <p>Choose one of your pools below. We’ll show exactly how many game picks you still need to submit.</p>
      </section>
      <div className="home-buttons"><button className="btn" onClick={() => setView("create")}>Create Pool</button></div>
      <section className="my-pools-section"><div><p className="eyebrow">Your pools</p><h2>Pick a pool to get started</h2></div>{myPoolsLoading ? <p role="status">Loading your pools...</p> : myPoolsError ? <div><p className="error-message" role="alert">{myPoolsError}</p><button className="btn" onClick={retryMyPools}>Try again</button></div> : myPools.length === 0 ? <p className="my-pools-empty">You have not joined any pools yet. Browse the available pools below to get started.</p> : <div className="my-pools-list">{myPools.map(item => <PoolPickCard key={item.id} pool={item} onOpen={() => openPicks(item)} />)}</div>}</section>{!myPoolsLoading && !myPoolsError && <JoinPool joinedPoolIds={myPools.map(item => item.id)} onJoined={joinPool} />}</>}

    {view === "create" && <CreatePool goBack={() => setView("home")} openPicks={joinPool} />}
    {view === "picks" && <WeeklyPicks pool={pool} goBack={() => setView("home")} />}
  </div>;
}

function PoolPickCard({ pool, onOpen }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    authFetch(`${API_BASE}/api/pools/${pool.id}/picks/current`, { signal: controller.signal })
      .then(readApiResponse)
      .then(body => {
        if (!Array.isArray(body?.games)) throw new Error("Missing games");
        if (!controller.signal.aborted) setStatus(poolPickStatus(body.games, body.picks || {}));
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus({ complete: false, message: "Open this pool to check this week’s picks", action: "Open pool" });
      });
    return () => controller.abort();
  }, [pool.id]);

  return <article className="my-pool-card">
    <div>
      <strong>{pool.name}</strong>
      <small>{lineupLabel(pool)} · {pool.participants}/{pool.limit ?? 10} players{pool.visibility === "private" ? " · Private" : ""}</small>
      {pool.inviteCode && <small>Invite: {pool.id} / {pool.inviteCode}</small>}
      {status ? <p className={status.complete ? "pool-pick-status complete" : "pool-pick-status"}>{status.message}</p> : <p className="pool-pick-status loading">Checking your picks...</p>}
    </div>
    <button className="btn make-picks-btn" onClick={onOpen}>{status?.action || "Make picks"} <span aria-hidden="true">→</span></button>
  </article>;
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
  const [creating, setCreating] = useState(false);
  const { conference, gameSelection } = lineupSettings(lineup);
  async function create(event) {
    event.preventDefault();
    if (creating) return;
    if (!name.trim()) { setError("Enter a name for your pool."); return; }
    setError(null);
    setCreating(true);
    try {
      const created = await readApiResponse(await authFetch(`${API_BASE}/api/pools`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), scoringType, conference, limit: Number(limit), gameSelection, visibility, poolPassword }) }));
      openPicks(created);
    } catch (requestError) { setError(requestError.message); }
    finally { setCreating(false); }
  }
  return <div className="pickem-content"><button className="btn back-btn" onClick={goBack} disabled={creating}>← Back</button><h2>Create a new pool</h2><p className="pool-section-note">If any game in your opening lineup has started, your pool begins with the next unstarted week.</p><form className="create-pool-form" onSubmit={create}><label>Pool Name:<input value={name} onChange={event => setName(event.target.value)} disabled={creating} required /></label><label>Scoring Type:<select value={scoringType} onChange={event => setScoringType(event.target.value)} disabled={creating}><option value="straight">Straight up</option><option value="spread">Against the spread</option></select></label><label>Game lineup:<select value={lineup} onChange={event => setLineup(event.target.value)} disabled={creating}><option value={FEATURED_LINEUP}>Featured 10 matchups</option>{CONFERENCES.map(item => <option key={item} value={item}>{item}</option>)}</select></label><label>Player limit:<input type="number" value={limit} onChange={event => setLimit(event.target.value)} min={1} step={1} disabled={creating} required /></label><label>Visibility:<select value={visibility} onChange={event => setVisibility(event.target.value)} disabled={creating}><option value="public">Public</option><option value="private">Private</option></select></label>{visibility === "private" && <label>Pool password:<input type="password" value={poolPassword} onChange={event => setPoolPassword(event.target.value)} minLength="4" disabled={creating} required /></label>}{error && <p className="error-message" role="alert">{error}</p>}<button type="submit" className="btn create-btn" disabled={creating}>{creating ? "Creating pool..." : "Create Pool"}</button></form></div>;
}

function WeeklyPicks({ pool, goBack }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const [data, setData] = useState(null);
  const [choices, setChoices] = useState({});
  const [savedChoices, setSavedChoices] = useState({});
  const [leaderboard, setLeaderboard] = useState(null);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [picksSaved, setPicksSaved] = useState(false);
  const [viewingPicks, setViewingPicks] = useState(false);
  const [picksAttempt, setPicksAttempt] = useState(0);
  const [leaderboardAttempt, setLeaderboardAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    authFetch(`${API_BASE}/api/pools/${pool.id}/picks/current`, { signal: controller.signal })
      .then(readApiResponse)
      .then(body => {
        if (!Array.isArray(body?.games) || !body.pool) throw new Error("Couldn't load this week's games. Please try again.");
        if (controller.signal.aborted) return;
        setData(body);
        setChoices(body.picks || {});
        setSavedChoices(body.picks || {});
        setPicksSaved(savedPickSummary(body.games, body.picks || {}).ready);
      })
      .catch(requestError => { if (!controller.signal.aborted) setError(requestError.message); });
    return () => controller.abort();
  }, [pool.id, picksAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    authFetch(`${API_BASE}/api/pools/${pool.id}/leaderboard/current`, { signal: controller.signal })
      .then(readApiResponse)
      .then(body => {
        if (!Array.isArray(body?.leaderboard)) throw new Error("Couldn't load the standings. Please try again.");
        if (!controller.signal.aborted) setLeaderboard(body);
      })
      .catch(requestError => { if (!controller.signal.aborted) setLeaderboardError(requestError.message); });
    return () => controller.abort();
  }, [pool.id, leaderboardAttempt]);

  const againstSpread = (data?.pool || pool).scoringType === "spread";
  const games = data?.games || [];
  const unlocked = games.filter(game => !pickLocked(game, now));
  const selected = unlocked.filter(game => choices[game.id]).length;
  const savedSummary = savedPickSummary(games, savedChoices, now);

  function refreshStandings() {
    setLeaderboardError(null);
    setLeaderboard(null);
    setLeaderboardAttempt(value => value + 1);
  }

  async function save() {
    if (!data || saving) return;
    const editableGames = data.games.filter(game => !pickLocked(game));
    if (!editableGames.length) { setError("All games have locked. Only picks saved before kickoff will count."); return; }
    if (editableGames.some(game => !choices[game.id])) {
      setError(againstSpread ? "Choose a team to cover the spread for every unlocked game before saving." : "Choose a winner for every unlocked game before saving.");
      return;
    }
    const submittedPicks = editableGames.map(game => ({ gameId: game.id, pick: choices[game.id] }));
    setSaving(true);
    setError(null);
    try {
      await readApiResponse(await authFetch(`${API_BASE}/api/pools/${pool.id}/picks/current`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season: data.season, week: data.week, picks: submittedPicks }),
      }));
      const updatedPicks = { ...savedChoices, ...Object.fromEntries(submittedPicks.map(item => [item.gameId, item.pick])) };
      setSavedChoices(updatedPicks);
      setChoices(updatedPicks);
      setPicksSaved(true);
      refreshStandings();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  return <div className="pickem-content">
    <button className="btn back-btn" onClick={goBack} disabled={saving}>← Back</button>
    {error && <div><p className="error-message" role="alert">{error}</p>{!data && <button className="btn" onClick={() => { setError(null); setPicksAttempt(value => value + 1); }}>Try again</button>}</div>}
    {!data && !error && <p role="status">Loading this week's games...</p>}
    {data && <>
      <p className="eyebrow">{lineupLabel(data.pool)} · {data.season} season</p><h2>{data.pool.name} — Week {data.week}</h2>
      {data.startsLater && <p className="spread-guide" role="status">Your picks begin Week {data.week} of the {data.season} season. Earlier games will not count toward your entry.</p>}
      <p className="spread-guide">{againstSpread ? "Against the spread: choose the team that will cover its line. Add the displayed home spread to the home team's final score to determine the winner. An adjusted tie is a push and earns no point. Games without a line remain pending." : "Straight up: choose the team you think will win. Each correct pick earns one point; betting lines do not affect scoring."}</p>
      {games.length === 0 ? <p>No games are available for this week yet.</p> : picksSaved ? <>
        {viewingPicks && <><div className="picks-review-heading"><h3>Your Week {data.week} picks</h3></div><div className="weekly-games">{games.map(game => <PickGame key={game.id} game={game} choice={savedChoices[game.id]} readOnly locked={pickLocked(game, now)} />)}</div></>}
        <div className="picks-confirmation" role="status"><span aria-hidden="true">✓</span><div><h3>{savedSummary.saved} of {games.length} picks saved.</h3><p>{unlocked.length ? "Picks lock individually at kickoff. Unstarted games can still be updated." : "All games have locked for this week."}{savedSummary.missed > 0 && ` ${savedSummary.missed} locked ${savedSummary.missed === 1 ? "game has" : "games have"} no submitted pick.`}</p></div><div className="picks-actions"><button className="btn picks-btn" onClick={() => setViewingPicks(value => !value)}>{viewingPicks ? "Hide picks" : "View picks"}</button>{unlocked.length > 0 && <button className="btn picks-btn" onClick={() => { setViewingPicks(false); setPicksSaved(false); }}>Make changes</button>}</div></div>
      </> : <>
        <p className="pick-help">{unlocked.length === 0 ? "All games have locked. Only picks saved before kickoff will count." : againstSpread ? "Choose a team to cover the spread for each unlocked game, then save your picks." : "Choose a winner for each unlocked game, then save your picks."}</p>
        {unlocked.length > 0 && <p className="pick-progress">{selected} of {unlocked.length} unlocked games selected · {savedSummary.saved} of {games.length} picks saved</p>}
        <div className="weekly-games">{games.map(game => {
          const locked = pickLocked(game, now);
          return <PickGame key={game.id} game={game} choice={locked ? savedChoices[game.id] : choices[game.id]} readOnly={saving} locked={locked} onPick={pick => { setError(null); setChoices(current => ({ ...current, [game.id]: pick })); }} />;
        })}</div>
        <button className="btn create-btn" onClick={save} disabled={saving || unlocked.length === 0}>{saving ? "Saving..." : "Save this week's picks"}</button>
      </>}
      <Leaderboard leaderboard={leaderboard} error={leaderboardError} onRetry={refreshStandings} scoringType={data.pool.scoringType} />
      <Link className="dashboard-link" to="/leaderboard">View season totals and past weeks →</Link>
    </>}
  </div>;
}

function PickGame({ game, choice, onPick, readOnly = false, locked = false }) {
  const timeZone = useTimeZone();
  const kickoff = game.startDate ? new Date(game.startDate) : null;
  const kickoffKnown = kickoff && Number.isFinite(kickoff.getTime());
  const spread = game.spread == null || game.spread === "" ? null : Number(game.spread);
  const hasSpread = spread != null && Number.isFinite(spread);
  return <article className="pick-game">
    <time dateTime={kickoffKnown ? kickoff.toISOString() : undefined}>{kickoffKnown ? kickoff.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" }) : "Kickoff time to be announced"}</time>
    {locked && <p className="pick-lock-note">{kickoffKnown ? "Locked at kickoff" : "Picks unavailable until kickoff is scheduled"}{!choice ? " · No pick submitted" : ""}</p>}
    <div className="pick-options">
      <button className={choice === "away" ? "team-pick selected" : "team-pick"} aria-pressed={choice === "away"} onClick={() => onPick?.("away")} disabled={readOnly || locked}>{game.awayLogo && <img src={game.awayLogo} alt="" />}<span>{game.awayApRank != null && <b className="pick-rank">#{game.awayApRank}</b>}{game.awayTeam}</span></button>
      <span className="at-symbol">@</span>
      <button className={choice === "home" ? "team-pick selected" : "team-pick"} aria-pressed={choice === "home"} onClick={() => onPick?.("home")} disabled={readOnly || locked}>{game.homeLogo && <img src={game.homeLogo} alt="" />}<span>{game.homeApRank != null && <b className="pick-rank">#{game.homeApRank}</b>}{game.homeTeam}</span></button>
    </div>
    {(hasSpread || game.overUnder != null) && <div className="pick-lines">{hasSpread && <span>{game.homeTeam} {spread === 0 ? "PK" : `${spread > 0 ? "+" : ""}${spread}`}</span>}{game.overUnder != null && <span>O/U: {game.overUnder}</span>}</div>}
  </article>;
}

function Leaderboard({ leaderboard, error, onRetry, scoringType }) {
  if (error) return <section className="weekly-leaderboard"><h3>Weekly standings</h3><p className="error-message" role="alert">{error}</p><button className="btn" onClick={onRetry}>Retry standings</button></section>;
  if (!leaderboard) return <p role="status">Loading standings...</p>;
  return <section className="weekly-leaderboard"><div><p className="eyebrow">Weekly leaderboard</p><h3>Week {leaderboard.week} standings</h3></div><p className="leaderboard-note">{leaderboard.completedGames} of {leaderboard.totalGames} games final</p><ol className="participant-list">{leaderboard.leaderboard.map(entry => <LeaderboardEntry key={entry.userId} entry={entry} week={leaderboard.week} scoringType={scoringType} />)}</ol></section>;
}
