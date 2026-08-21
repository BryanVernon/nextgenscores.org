import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3002"
  : "https://nextgenscores-org.onrender.com";

const CONFERENCE_ORDER = [
  "SEC", "Big Ten", "ACC", "Big 12", "Pac-12", "American", "Mountain West",
  "Sun Belt", "Conference USA", "MAC", "Independent", "FBS Independents",
  "Pioneer", "UAC", "Ivy League",
];

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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/teams-by-conference`)
      .then(res => res.json())
      .then(setTeamsByConference)
      .catch(() => setMessage("Couldn't load team list."));
  }, []);

  function addTeam() {
    if (!teamChoice || selected.includes(teamChoice)) return;
    setSelected(prev => [...prev, teamChoice]);
    setTeamChoice("");
  }

  function removeTeam(team) {
    setSelected(prev => prev.filter(t => t !== team));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/favorite-teams`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ favoriteTeams: selected }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data.user);
      setMessage("Saved!");
    } catch {
      setMessage("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const conferenceOptions = sortConferences(Object.keys(teamsByConference));
  const teamOptions = conference ? teamsByConference[conference] || [] : [];

  return (
    <div className="settings-page">
      <p className="eyebrow">Your account</p>
      <h1>Settings</h1>
      <p className="settings-intro">Personalize the teams that power your dashboard and game updates.</p>

      <section className="settings-section">
        <div className="settings-section-heading"><span className="settings-icon" aria-hidden="true">★</span><div><h2>Favorite teams</h2>
        <p>Pick a conference, then a team, and add as many as you'd like.</p>
        </div></div>

        <div className="team-picker">
          <select value={conference} onChange={e => { setConference(e.target.value); setTeamChoice(""); }}>
            <option value="">Select conference...</option>
            {conferenceOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={teamChoice} onChange={e => setTeamChoice(e.target.value)} disabled={!conference}>
            <option value="">Select team...</option>
            {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <button className="btn" type="button" onClick={addTeam} disabled={!teamChoice}>Add</button>
        </div>

        {selected.length > 0 ? (
          <ul className="selected-teams">
            {selected.map(team => (
              <li key={team}>
                <span>{team}</span><button type="button" onClick={() => removeTeam(team)} aria-label={`Remove ${team}`}>×</button>
              </li>
            ))}
          </ul>
        ) : <p className="teams-empty">No favorites selected yet.</p>}

        <div className="settings-save-row"><button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
        {message && <p className="settings-message">{message}</p>}
        </div>
      </section>
    </div>
  );
}
