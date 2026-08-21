import React, { useEffect, useMemo, useState } from 'react'
import "../App.css";
import { CONFERENCES, getTeamGroups } from "../teamOptions";

const API_URL = window.location.hostname === "localhost"
  ? "http://localhost:3002/api/games"
  : "https://nextgenscores-org.onrender.com/api/games";

export default function App() {
  const [games, setGames] = useState([])
  const [filteredGames, setFilteredGames] = useState([])
  const [week, setWeek] = useState(0)
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasLoaded, setHasLoaded] = useState(false);


  const [currentWeek, setCurrentWeek] = useState(0)
  const [conference, setConference] = useState('AP Top 25')
  const [team, setTeam] = useState('')
  const conferences = CONFERENCES

  // Fetch games
  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // --- Try reading from localStorage first ---
        const cached = localStorage.getItem("gamesCacheV3");
        let data = cached ? JSON.parse(cached) : null;

        const hasApRankings = Array.isArray(data) && data.some(game => (
          game.homeApRank != null || game.awayApRank != null
        ));

        if (!hasApRankings) data = null;

        // --- Fetch from API only if no cache ---
        if (!data) {
          const res = await fetch(API_URL);
          if (!res.ok) throw new Error(`API request failed: ${res.status}`);
          data = await res.json();

          // --- Save to localStorage ---
          localStorage.setItem("gamesCacheV3", JSON.stringify(data));
        }

        if (ignore) return;

        setGames(data);
        setHasLoaded(true);

        // --- Set weeks and current week as before ---
        const uniqueWeeks = Array.from(new Set(data.map(g => g.week))).sort((a,b)=>a-b)
        setWeeks(uniqueWeeks)

        const today = new Date();

// Find the first game date for each week
        const weekDates = uniqueWeeks
          .map(week => {
            const gamesForWeek = data
              .filter(g => Number(g.week) === Number(week))
              .map(g => new Date(g.startDate))
              .filter(date => !isNaN(date));

            if (gamesForWeek.length === 0) return null;

            return {
              week,
              date: new Date(
                Math.min(...gamesForWeek.map(d => d.getTime()))
              )
            };
          })
          .filter(Boolean);

        // Find the most recent week that has already started
        const previousWeek = weekDates
          .filter(w => w.date <= today)
          .sort((a, b) => b.date - a.date)[0];

        // Find the next upcoming week
        const nextWeek = weekDates
          .filter(w => w.date > today)
          .sort((a, b) => a.date - b.date)[0];

        // Before the season starts, show the first upcoming week.
        // During the season, show the most recently started week.
        const validWeek = previousWeek?.week ?? nextWeek?.week ?? Math.max(...uniqueWeeks);

        setCurrentWeek(validWeek);
        setWeek(validWeek);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => { ignore = true };
  }, []);


  const teamGroups = useMemo(() => getTeamGroups(games), [games]);

  // Filter games based on week, conference, and team
  useEffect(() => {
    let temp = games

    // Filter by week
    if (week !== 0) {
      temp = temp.filter(g => Number(g.week) === Number(week))
    }

    // Filter by conference
    if (conference === 'AP Top 25') {
      temp = temp.filter(g => g.homeApRank != null || g.awayApRank != null)
    } else if (conference !== 'All') {
      temp = temp.filter(g => g.homeConference === conference || g.awayConference === conference)
    }

    if (team) {
      temp = temp.filter(g => g.homeTeam === team || g.awayTeam === team)
    }

    setFilteredGames(temp)
  }, [games, week, conference, team])

  const sortedGames = useMemo(() => {
    return filteredGames.slice().sort((a,b) => new Date(a.startDate) - new Date(b.startDate))
  }, [filteredGames])

  function handleWeekChange(e) {
    setWeek(e.target.value === 'all' ? 0 : Number(e.target.value))
  }

  function handleConferenceChange(e) {
    setConference(e.target.value)
  }

  function handleTeamChange(e) {
    setTeam(e.target.value)
    if (e.target.value) {
      setConference('All')
      setWeek(0)
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
            {hasLoaded && sortedGames.length === 0 && (
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
