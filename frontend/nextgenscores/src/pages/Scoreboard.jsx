import React, { useEffect, useMemo, useState } from 'react'
import "../App.css";

export default function App() {
  const API_URL = 'https://nextgenscores-org.onrender.com/api/games'

  const [games, setGames] = useState([])
  const [filteredGames, setFilteredGames] = useState([])
  const [week, setWeek] = useState(0)
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [currentWeek, setCurrentWeek] = useState(0)
  const [conference, setConference] = useState('SEC')
  const conferences = ['AP Top 25', 'SEC', 'ACC', 'Big 12', 'Big Ten', 'Mountain West', 'Pac-12', 'FBS Independents', 'Mid-American','Sun Belt', 'Ivy', 'Patriot']

  // Fetch games
  useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(API_URL)
        if (!res.ok) throw new Error(`API request failed: ${res.status}`)
        const data = await res.json()
        if (ignore) return
        setGames(data)

        // Get unique weeks from API
        const uniqueWeeks = Array.from(new Set(data.map(g => g.week))).sort((a,b)=>a-b)
        setWeeks(uniqueWeeks)

        // --- Calculate current week based on season start ---
        const startOfSeason = new Date('2025-08-23') // replace with actual season start
        const today = new Date()
        const daysSinceStart = Math.floor((today - startOfSeason) / (1000*60*60*24))
        const calcWeek = Math.floor(daysSinceStart / 7) + 1
        const validWeek = uniqueWeeks.includes(calcWeek) ? calcWeek : Math.max(...uniqueWeeks)
        setCurrentWeek(validWeek)
        setWeek(validWeek) // default to current week

      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  // Filter games based on week and conference
  useEffect(() => {
    let temp = games

    // Filter by week
    if (week !== 0) {
      temp = temp.filter(g => Number(g.week) === Number(week))
    }

    // Filter by conference
    if (conference !== 'All') {
      temp = temp.filter(g => g.homeConference === conference || g.awayConference === conference)
    }

    setFilteredGames(temp)
  }, [games, week, conference])

  const sortedGames = useMemo(() => {
    return filteredGames.slice().sort((a,b) => new Date(a.startDate) - new Date(b.startDate))
  }, [filteredGames])

  function handleWeekChange(e) {
    setWeek(e.target.value === 'all' ? 0 : Number(e.target.value))
  }

  function handleConferenceChange(e) {
    setConference(e.target.value)
  }

  return (
    <>
      
    

    <div className="game-list">
      <header className="filter-container">
        <h1>NextGenScores - College Football</h1>
        <div className="filter">
          <label>Week</label>
          <select value={week} onChange={handleWeekChange}>
            <option value="all">All</option>
            {weeks.map(w => (
              <option key={w} value={w}>
                {w === currentWeek ? `Current Week` : w}
              </option>
            ))}
          </select>

          <label>Conference</label>
          <select value={conference} onChange={handleConferenceChange}>
            <option value="All">All</option>
            {conferences.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        
      </header>

      {loading && <div className="text-center py-8">Loading games...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <>
          {sortedGames.length === 0 && (
            <div className="text-center">No games found for this selection.</div>
          )}
          <ul>
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
      <div className="game-info">

        {/* LEFT SIDE — TEAMS */}
        <div className="game-details-left">
          <TeamBlock name={game.awayTeam} score={awayScore} logo={game.awayLogo} />
          <TeamBlock name={game.homeTeam} score={homeScore} logo={game.homeLogo} />
        </div>

        {/* RIGHT SIDE — GAME DETAILS */}
        <div className="game-details-right">
          <div className="detail-line">{formattedDate}</div>
          <div className="detail-line">{formattedTime}</div>
          <div className="detail-line">{game.venue ?? "TBD"}</div>
        </div>
      </div>

      {/* BOTTOM — BETTING INFO */}
      {(spread !== null || overUnder !== null) && (
        <div className="betting-card">
          {spread !== null && <p>Spread: {spread}</p>}
          {overUnder !== null && <p>O/U: {overUnder}</p>}
        </div>
      )}
    </>
  );
}



function TeamBlock({ name, score, logo }) {
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
        <div className="team-name">{name}</div>
      </div>
      <div className="team-info-right">
        <div className="small-score">{score}</div>
      </div>
    </div>
  )
}
