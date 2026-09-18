import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import authFetch from "../authFetch";
import { COMMON_TIME_ZONES, DEFAULT_TIME_ZONE, formatDateTime } from "../timeZone";

const API_BASE = import.meta.env.MODE === "development"
  ? `${window.location.protocol}//${window.location.hostname}:3002`
  : "https://nextgenscores-org.onrender.com";

const CONFERENCE_ORDER = ["SEC", "Big Ten", "ACC", "Big 12", "Pac-12", "American", "Mountain West", "Sun Belt", "Conference USA", "MAC", "Independent", "FBS Independents", "Pioneer", "UAC", "Ivy League"];

function sortConferences(conferences) {
  return [...conferences].sort((a, b) => {
    const aIndex = CONFERENCE_ORDER.indexOf(a);
    const bIndex = CONFERENCE_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

export default function Settings() {
  const { user, setUser } = useContext(AuthContext);
  const [teamsByConference, setTeamsByConference] = useState({});
  const [conference, setConference] = useState("");
  const [teamChoice, setTeamChoice] = useState("");
  const [selected, setSelected] = useState(user?.favoriteTeams || []);
  const [themeMode, setThemeMode] = useState(user?.theme?.mode || "default");
  const [themeTeam, setThemeTeam] = useState(user?.theme?.team || "");
  const [timeZone, setTimeZone] = useState(user?.timeZone || DEFAULT_TIME_ZONE);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/teams-by-conference`).then(res => {
      if (!res.ok) throw new Error("Couldn't load team list.");
      return res.json();
    }).then(setTeamsByConference).catch(error => { setMessage(error.message); setSaveError(true); });
  }, []);

  function addTeam() {
    if (!teamChoice || selected.includes(teamChoice)) return;
    setSelected(current => [...current, teamChoice]);
    setTeamChoice("");
  }

  function removeTeam(team) {
    setSelected(current => current.filter(item => item !== team));
    if (themeTeam === team) {
      setThemeTeam("");
      setThemeMode("default");
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setSaveError(false);
    try {
      const res = await authFetch(`${API_BASE}/api/auth/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteTeams: selected, theme: { mode: themeMode, team: themeMode === "team" ? themeTeam : null }, timeZone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong. Try again.");
      setUser(data.user);
      setMessage("Saved!");
    } catch (error) {
      setSaveError(true);
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  const conferenceOptions = sortConferences(Object.keys(teamsByConference));
  const teamOptions = conference ? teamsByConference[conference] || [] : [];
  const otherTimeZones = (Intl.supportedValuesOf?.("timeZone") || []).filter(zone => !COMMON_TIME_ZONES.some(([value]) => value === zone));

  return <div className="settings-page">
    <p className="eyebrow">Your account</p><h1>Settings</h1>
    <p className="settings-intro">Personalize the teams, updates, and colors that make the app feel like yours.</p>

    <section className="settings-section">
      <div className="settings-section-heading"><span className="settings-icon" aria-hidden="true">★</span><div><h2>Favorite teams</h2><p>Pick a conference, then a team, and add as many as you'd like.</p></div></div>
      <div className="team-picker">
        <label className="sr-only" htmlFor="favorite-conference">Conference</label><select id="favorite-conference" value={conference} onChange={event => { setConference(event.target.value); setTeamChoice(""); }}><option value="">Select conference...</option>{conferenceOptions.map(item => <option key={item} value={item}>{item}</option>)}</select>
        <label className="sr-only" htmlFor="favorite-team">Team</label><select id="favorite-team" value={teamChoice} onChange={event => setTeamChoice(event.target.value)} disabled={!conference}><option value="">Select team...</option>{teamOptions.map(item => <option key={item} value={item}>{item}</option>)}</select>
        <button className="btn" type="button" onClick={addTeam} disabled={!teamChoice}>Add</button>
      </div>
      {selected.length > 0 ? <ul className="selected-teams">{selected.map(team => <li key={team}><span>{team}</span><button type="button" onClick={() => removeTeam(team)} aria-label={`Remove ${team}`}>×</button></li>)}</ul> : <p className="teams-empty">No favorites selected yet.</p>}
    </section>

    <section className="settings-section appearance-section">
      <div className="settings-section-heading"><span className="settings-icon" aria-hidden="true">●</span><div><h2>Color theme</h2><p>Keep the default NextGenScores colors, or use one favorite team's colors across the app.</p></div></div>
      <div className="theme-options">
        <label className="theme-option"><input type="radio" name="theme" checked={themeMode === "default"} onChange={() => setThemeMode("default")} /><span><strong>Default colors</strong><small>The current green NextGenScores palette.</small></span></label>
        <label className="theme-option"><input type="radio" name="theme" checked={themeMode === "team"} onChange={() => { setThemeMode("team"); setThemeTeam(current => current || selected[0] || ""); }} disabled={selected.length === 0} /><span><strong>Favorite team colors</strong><small>{selected.length ? "Choose which favorite team to use." : "Add a favorite team first."}</small></span></label>
      </div>
      {themeMode === "team" && selected.length > 0 && <label className="theme-team-select">Team color palette<select value={themeTeam} onChange={event => setThemeTeam(event.target.value)}>{selected.map(team => <option key={team} value={team}>{team}</option>)}</select></label>}
    </section>

    <section className="settings-section appearance-section">
      <div className="settings-section-heading"><div><h2>Timezone</h2><p>Use this timezone for kickoffs, schedule dates, and email reminders. Daylight saving time adjusts automatically.</p></div></div>
      <label className="theme-team-select" htmlFor="time-zone">Display times in
        <select id="time-zone" value={timeZone} onChange={event => setTimeZone(event.target.value)}>
          <optgroup label="US timezones">{COMMON_TIME_ZONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</optgroup>
          <optgroup label="Other timezones">{otherTimeZones.map(zone => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}</optgroup>
        </select>
      </label>
      <p className="settings-time-preview">Current time: {formatDateTime(new Date(), timeZone, { weekday: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</p>
      <p className="settings-time-preview">Missing-pick reminders arrive on Fridays starting at 9 a.m. in this timezone.</p>
    </section>
    <div className="settings-save-row"><button className="btn" onClick={handleSave} disabled={saving || (themeMode === "team" && !themeTeam)}>{saving ? "Saving..." : "Save changes"}</button>{message && <p className={`settings-message${saveError ? " settings-error" : ""}`} role={saveError ? "alert" : "status"}>{message}</p>}</div>
  </div>;
}
