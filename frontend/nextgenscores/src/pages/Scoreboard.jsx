import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StaticFilterPicker from "../components/StaticFilterPicker.jsx";
import "../App.css";
import { CONFERENCES, filterTeamGroups, getTeamGroups } from "../teamOptions";
import { gameDateLabel, gameStatus, groupGamesByDate, latestUpdate, spreadLabel, teamScheduleFilters, teamScheduleHref } from "../scheduleUtils";
import { defaultScheduleConference } from "../scheduleFilters";
import { effectiveScheduleConferences, scheduleConferenceGames } from "../schedulePreferences";
import { AuthContext } from "../context/AuthContext";
import useTimeZone from "../useTimeZone";

const API_URL = import.meta.env.MODE === "development"
  ? `${window.location.protocol}//${window.location.hostname}:3002/api/schedule`
  : "https://nextgenscores-org.onrender.com/api/schedule";

export default function Scoreboard() {
  const { user } = useContext(AuthContext);
  const displayTimeZone = useTimeZone();
  const [params, setParams] = useSearchParams();
  const requestedWeek = params.get("week");
  const week = requestedWeek === "all" || /^\d+$/.test(requestedWeek || "") ? requestedWeek : "current";
  const conference = params.get("conference") || defaultScheduleConference;
  const team = params.get("team") || "";
  const [data, setData] = useState({ games: [], weeks: [], teams: [], currentWeek: null });
  const [loadedKey, setLoadedKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [checkedAt, setCheckedAt] = useState(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);
  const teamTriggerRef = useRef(null);
  const requestKey = `${week}|${conference}|${team}`;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let inFlight = false;
    let timeout;

    async function load() {
      if (inFlight) return;
      inFlight = true;
      setLoading(true);
      setError("");
      timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const query = new URLSearchParams({ conference: conference === "Featured games" ? "All" : conference });
        if (week !== "current") query.set("week", week);
        if (team) query.set("team", team);
        const response = await fetch(`${API_URL}?${query}`, { signal: controller.signal, cache: "no-cache" });
        if (!response.ok) throw new Error("Schedule unavailable");
        const next = await response.json();
        if (!Array.isArray(next.games) || !Array.isArray(next.weeks) || !Array.isArray(next.teams)) {
          throw new Error("Invalid schedule");
        }
        if (!active) return;
        setData(next);
        setLoadedKey(requestKey);
        setCheckedAt(new Date());
      } catch {
        if (active) setError("We couldn’t update the schedule. Check your connection and try again.");
      } finally {
        clearTimeout(timeout);
        inFlight = false;
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [week, conference, team, requestKey, refresh]);

  const teamGroups = useMemo(() => getTeamGroups(data.teams), [data.teams]);
  const filteredTeamGroups = useMemo(() => filterTeamGroups(teamGroups, teamSearch), [teamGroups, teamSearch]);
  const selectedConferences = effectiveScheduleConferences(user?.scheduleConferences, user?.favoriteTeams, data.teams);
  const hasMatchingData = loadedKey === requestKey;
  const loadedGames = hasMatchingData ? data.games : [];
  const games = team ? loadedGames : scheduleConferenceGames(loadedGames, conference, selectedConferences);
  const groups = groupGamesByDate(games, displayTimeZone);
  const updatedAt = latestUpdate(games);
  const weeks = data.weeks.map(item => item.week);
  const selectedWeek = week === "current" ? data.currentWeek : Number(week);
  const weekIndex = weeks.indexOf(selectedWeek);
  const timeZone = new Intl.DateTimeFormat("en-US", { timeZoneName: "long", timeZone: displayTimeZone }).formatToParts(new Date())
    .find(part => part.type === "timeZoneName")?.value || "your local time";

  function changeFilters(changes) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      Object.entries(changes).forEach(([key, value]) => {
        if (value == null || value === "" || (key === "week" && value === "current")) next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    });
  }

  function closeTeamPicker() {
    setTeamMenuOpen(false);
    requestAnimationFrame(() => teamTriggerRef.current?.focus());
  }

  function selectTeam(value) {
    changeFilters(value ? teamScheduleFilters(value) : { team: "", conference: "All" });
    setTeamSearch("");
    closeTeamPicker();
  }

  return (
    <div className="schedule-page">
      <header className="schedule-header">
        <div>
          <p className="eyebrow">Your college football Saturday starts here</p>
          <h1>Scores &amp; <span>Schedule</span></h1>
          <p className="schedule-intro">Find your team. Catch the kickoff. Know where to watch.</p>
        </div>
        <div className="schedule-count" aria-label={hasMatchingData ? `${games.length} matchups` : "Loading matchups"}>
          <strong>{hasMatchingData ? games.length : "—"}</strong><span>matchups</span>
        </div>
      </header>

      <section className="filter-container" aria-label="Schedule filters">
        <div className="filter-heading">
          <span className="filter-kicker">Browse the slate</span>
          <span className="filter-current">{team || (conference === "All" ? `${selectedConferences.length} selected conferences` : conference)}</span>
        </div>
        <div className="filter">
          <StaticFilterPicker label="Week" value={week} options={[
            { value: "current", label: `Current week${data.currentWeek != null ? ` (${data.currentWeek})` : ""}` },
            { value: "all", label: "All weeks" },
            ...weeks.map(value => ({ value: String(value), label: `Week ${value}` })),
          ]} onSelect={value => changeFilters({ week: value })} />
          <StaticFilterPicker label="Conference" value={conference} options={[
            { value: "All", label: "My selected conferences" },
            ...CONFERENCES.map(value => ({ value, label: value })),
          ]} onSelect={value => changeFilters({ conference: value, team: "" })} />
          <label id="team-filter-label">Team</label>
          <div className="team-picker">
            <button ref={teamTriggerRef} type="button" className="team-picker-trigger" aria-labelledby="team-filter-label" aria-haspopup="dialog" aria-expanded={teamMenuOpen} aria-controls="team-picker-menu" onClick={() => setTeamMenuOpen(open => !open)}>{team || "All teams"}<span className="filter-picker-chevron" aria-hidden="true" /></button>
            {teamMenuOpen && <div id="team-picker-menu" className="team-picker-menu" role="dialog" aria-labelledby="team-filter-label" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); closeTeamPicker(); } }}>
              <label className="sr-only" htmlFor="team-picker-search">Search teams</label>
              <input id="team-picker-search" type="search" value={teamSearch} onChange={event => setTeamSearch(event.target.value)} placeholder="Search teams" autoFocus />
              <div className="team-picker-options" aria-live="polite">
                <button type="button" className={team ? "" : "selected"} aria-pressed={!team} onClick={() => selectTeam("")}>All teams</button>
                {filteredTeamGroups.top25.length > 0 && <section aria-label="AP Top 25"><p>AP Top 25</p>{filteredTeamGroups.top25.map(item => <button key={item.name} type="button" className={team === item.name ? "selected" : ""} aria-pressed={team === item.name} onClick={() => selectTeam(item.name)}>#{item.rank} {item.name}</button>)}</section>}
                {filteredTeamGroups.remaining.map(group => <section key={group.name} aria-label={group.name}><p>{group.name}</p>{group.teams.map(item => <button key={item.name} type="button" className={team === item.name ? "selected" : ""} aria-pressed={team === item.name} onClick={() => selectTeam(item.name)}>{item.name}</button>)}</section>)}
                {teamSearch.trim() && filteredTeamGroups.top25.length === 0 && filteredTeamGroups.remaining.length === 0 && <p className="team-picker-empty">No teams found</p>}
              </div>
            </div>}
          </div>
        </div>
      </section>

      <div className="schedule-toolbar">
        <div className="week-navigation" role="group" aria-label="Browse weeks">
          <button type="button" className="schedule-button" disabled={week === "all" || weekIndex <= 0} onClick={() => changeFilters({ week: weeks[weekIndex - 1] })} aria-label="Previous week">← <span>Previous</span></button>
          <span className="week-caption">{week === "all" ? "All weeks" : selectedWeek != null ? `Week ${selectedWeek}` : "Current week"}</span>
          <button type="button" className="schedule-button" disabled={week === "all" || weekIndex < 0 || weekIndex >= weeks.length - 1} onClick={() => changeFilters({ week: weeks[weekIndex + 1] })} aria-label="Next week"><span>Next</span> →</button>
        </div>
        <button type="button" className="schedule-button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>{loading ? "Checking…" : "Refresh scores"}</button>
      </div>
      <p className="schedule-data-note">All kickoff times in {timeZone}. Scores may be delayed.
        {updatedAt && <> Data updated {updatedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone: displayTimeZone })}.</>}
        {checkedAt && hasMatchingData && <> Last checked {checkedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: displayTimeZone })}.</>}
      </p>

      {error && <div className="schedule-message error-message" role="alert">
        <p>{error}{hasMatchingData ? " Your last loaded scores are still shown below." : ""}</p>
        <button type="button" className="schedule-button" onClick={() => setRefresh(value => value + 1)}>Try again</button>
      </div>}
      <div role="status" className="sr-only">{loading ? "Loading games" : error || `${games.length} matchups loaded`}</div>
      {loading && !hasMatchingData && <div className="schedule-skeleton" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <div key={index} />)}</div>}
      {!loading && !error && hasMatchingData && games.length === 0 && <div className="schedule-message schedule-empty">
        <h2>No games in this selection</h2>
        <p>Try another week, choose a conference, or update your selected conferences in Settings.</p>
        <button type="button" className="schedule-button" onClick={() => changeFilters({ conference: "All", team: "" })}>Show my selected conferences</button>
        {week !== "current" && <button type="button" className="schedule-button" onClick={() => changeFilters({ week: "current" })}>Go to current week</button>}
      </div>}
      <div className="schedule-days" aria-busy={loading}>
        {groups.map(group => <section key={group.label} className="schedule-day" aria-label={group.label}>
          <h2 className="schedule-date-heading">{group.label}<span>{group.games.length} {group.games.length === 1 ? "game" : "games"}</span></h2>
          <ul className="games-grid">{group.games.map(game => <li key={game._id || game.id} className="game-card"><GameCard game={game} showDate /></li>)}</ul>
        </section>)}
      </div>
    </div>
  );
}

export function GameCard({ game, showDate = false }) {
  const timeZone = useTimeZone();
  const status = gameStatus(game);
  const start = game.startDate ? new Date(game.startDate) : null;
  const dateLabel = showDate ? gameDateLabel(game.startDate, timeZone) : null;
  const time = !game.startTimeTBD && start && Number.isFinite(start.getTime())
    ? start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" }) : "Time TBD";
  const spread = spreadLabel(game);
  const hasScores = game.homePoints != null && game.awayPoints != null;
  const isFinal = game.completed === true && hasScores;

  return <article className="game-card-content" aria-label={`${game.awayTeam} at ${game.homeTeam}`}>
    <div className="game-meta"><span className={`game-status status-${status.kind}`}>{status.label}</span>{dateLabel && <span className="meta-date">{dateLabel}</span>}<span className="meta-time">{time}</span></div>
    <div className="teams-fullwidth">
      <TeamBlock name={game.awayTeam} record={game.awayRecord} score={game.awayPoints} logo={game.awayLogo} rank={game.awayApRank} winner={isFinal && game.awayPoints > game.homePoints} />
      <TeamBlock name={game.homeTeam} record={game.homeRecord} score={game.homePoints} logo={game.homeLogo} rank={game.homeApRank} winner={isFinal && game.homePoints > game.awayPoints} />
    </div>
    <div className="game-watch"><span><span className="game-detail-label">Watch</span> {game.outlet || "TV to be announced"}</span>{game.venue && <span className="game-venue">{game.venue}</span>}</div>
    {(spread || game.overUnder != null) && <div className="betting-card">
      {spread && <p><span>Spread</span> {spread}</p>}
      {game.overUnder != null && <p><span>Total</span> {game.overUnder}</p>}
    </div>}
  </article>;
}

function TeamBlock({ name, record, score, logo, rank, winner }) {
  const [failedLogo, setFailedLogo] = useState(null);
  return <div className={`team-info${winner ? " team-winner" : ""}`}>
    <div className="team-info-left">
      <div className="team-logo" aria-hidden="true">{logo && failedLogo !== logo
        ? <img src={logo} alt="" loading="lazy" onError={() => setFailedLogo(logo)} />
        : <span className="team-initials">{name?.slice(0, 2).toUpperCase()}</span>}</div>
      <Link className="team-name" to={teamScheduleHref(name)}>{rank != null && <span className="team-rank">#{rank} </span>}{name}{record && <span className="team-record">{record}</span>}{winner && <span className="sr-only">, winner</span>}</Link>
    </div>
    <div className="small-score" aria-label={score != null ? `${score} points` : "No score yet"}>{score ?? "—"}</div>
  </div>;
}
