import React, { useEffect, useMemo, useRef, useState } from 'react'
import "../App.css";
import { CONFERENCES, getTeamGroups } from "../teamOptions";

const API_URL = import.meta.env.MODE === "development"
  ? `${window.location.protocol}//${window.location.hostname}:3002/api/schedule`
  : "https://nextgenscores-org.onrender.com/api/schedule";

export default function App() {
  const [games, setGames] = useState([])
  const [week, setWeek] = useState(null)
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentWeek, setCurrentWeek] = useState(0)
  const [conference, setConference] = useState('AP Top 25')
  const [team, setTeam] = useState('')
  const [teams, setTeams] = useState([])
  const lastLoadedKey = useRef(null)
  const conferences = CONFERENCES

  useEffect(() => {
    let ignore = false;

    async function load() {
      const requestKey = `${week ?? "current"}|${conference}|${team}`;
      if (lastLoadedKey.current === requestKey) return;
      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams();
        if (week != null) query.set("week", week);
        if (conference) query.set("conference", conference);
        if (team) query.set("team", team);
        const res = await fetch(`${API_URL}?${query}`);
        if (!res.ok) throw new Error(`API request failed: ${res.status}`);
        const data = await res.json();

        if (ignore) return;

        setGames(data.games);
        setWeeks(data.weeks.map(item => item.week));
        setTeams(data.teams);
        setCurrentWeek(data.currentWeek);
        const loadedWeek = week ?? data.currentWeek;
        lastLoadedKey.current = `${loadedWeek}|${conference}|${team}`;
        if (week == null) setWeek(data.currentWeek);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => { ignore = true };
  }, [week, conference, team]);

  const teamGroups = useMemo(() => getTeamGroups(teams), [teams]);
  const sortedGames = games;

  function handleWeekChange(e) {
    setWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))
  }

  function handleConferenceChange(e) {
    setConference(e.target.value)
  }

  function handleTeamChange(e) {
    setTeam(e.target.value)
    if (e.target.value) {
      setConference('All')
    }
  }

  return (
    <>
      
    

    <div className="schedule-page">
      <header className="schedule-header">
        <div>
          <p className="eyebrow">Saturday is on the way</p>
          <h1>College Football <span>Schedule</span></h1>
          <p className="schedule-intro">Every matchup, kickoff, and line in one place.</p>
        </div>
        <div className="schedule-count">
          <strong>{sortedGames.length}</strong>
          <span>matchups</span>
        </div>
      </header>

      <div className="filter-container">
        <div className="filter-heading">
          <span className="filter-kicker">Browse the slate</span>
          <span className="filter-current">{team || (conference === 'All' ? 'All conferences' : conference)}</span>
        </div>
        <div className="filter">
          <label htmlFor="week-filter">Week</label>
          <select id="week-filter" value={week} onChange={handleWeekChange}>
            <option value="all">All</option>
            {weeks.map(w => (
              <option key={w} value={w}>
                {w === currentWeek ? `Current Week` : w}
              </option>
            ))}
          </select>

          <label htmlFor="conference-filter">Conference</label>
          <select id="conference-filter" value={conference} onChange={handleConferenceChange}>
            <option value="All">All</option>
            {conferences.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label htmlFor="team-filter">Team</label>
          <select id="team-filter" value={team} onChange={handleTeamChange}>
            <option value="">All teams</option>
            {teamGroups.top25.length > 0 && <optgroup label="AP Top 25">{teamGroups.top25.map(item => <option key={item.name} value={item.name}>#{item.rank} {item.name}</option>)}</optgroup>}
            {teamGroups.remaining.map(group => <optgroup key={group.name} label={group.name}>{group.teams.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</optgroup>)}
          </select>
        </div>
      </div>

      {loading && <div className="schedule-message">Loading games...</div>}
      {error && <div className="schedule-message error-message">{error}</div>}

        {!loading && !error && (
          <>
            {/* FIX: only show message if we have actually loaded once */}
            {week != null && sortedGames.length === 0 && (
              <div className="schedule-message">No games found for this selection.</div>
            )}

            <ul className="games-grid">
              {sortedGames.map(game => (
                <li key={game._id || game.id} className="game-card">
                  <GameCard game={game} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  )
}

// GameCard and TeamBlock remain unchanged


// GameCard and TeamBlock remain unchanged


function GameCard({ game }) {
  const start = new Date(game.startDate);

  // Format date → "Nov 6"
  const formattedDate = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });

  // Format time → "7:15 PM"
  const formattedTime = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });

  const homeScore = game.homePoints ?? "-";
  const awayScore = game.awayPoints ?? "-";

  const spread = game.spread ?? null;
  const overUnder = game.overUnder ?? null;

  return (
    <>
      <div className="game-card-content">
        {/* TOP RIGHT — small game info */}
        <div className="game-meta">
          <span className="meta-date">{formattedDate}</span><span className="meta-time">{formattedTime}</span>
        </div>

        {/* TEAMS FULL WIDTH */}
        <div className="teams-fullwidth">
          <TeamBlock name={game.awayTeam} score={awayScore} logo={game.awayLogo} rank={game.awayApRank} />
          <TeamBlock name={game.homeTeam} score={homeScore} logo={game.homeLogo} rank={game.homeApRank} />
        </div>
        {/* BOTTOM — BETTING INFO */}
        {(spread !== null || overUnder !== null) && (
          <div className="betting-card">
            {spread !== null && <p>Spread: {spread}</p>}
            {overUnder !== null && <p>O/U: {overUnder}</p>}
          </div>
        )}
      </div>
    </>
  );

}



function TeamBlock({ name, score, logo, rank }) {
  const fallback = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="28" fill="#6b7280">${name}</text>
    </svg>
  `)

  return (
    <div className="team-info">
      <div className="team-info-left">
        <div className="team-logo">
          <img src={logo || fallback} alt={`${name} logo`} onError={(e)=>{ e.currentTarget.src=fallback }} />
        </div>
        <div className="team-name">
          {rank != null && <span className="team-rank">#{rank}</span>} {name}
        </div>
      </div>
      <div className="team-info-right">
        <div className="small-score">{score}</div>
      </div>
    </div>
  )
}
