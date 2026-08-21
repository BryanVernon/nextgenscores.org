import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://nextgenscores-org.onrender.com";

const ALL_TEAMS = ["Ohio State", "Oregon", "Texas", "Alabama", "Georgia", "Michigan"]; // swap for a real team list/endpoint later

export default function Settings() {
  const { user, setUser } = useContext(AuthContext);
  const [selected, setSelected] = useState(user?.favoriteTeams || []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  function toggleTeam(team) {
    setSelected(prev =>
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
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
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setUser(data.user);
      setMessage("Saved!");
    } catch (err) {
      setMessage("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <p className="eyebrow">Your account</p>
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Favorite teams</h2>
        <p>Pick as many as you'd like — they'll show up on your dashboard.</p>

        <div className="team-checklist">
          {ALL_TEAMS.map(team => (
            <label key={team} className="team-checkbox">
              <input
                type="checkbox"
                checked={selected.includes(team)}
                onChange={() => toggleTeam(team)}
              />
              {team}
            </label>
          ))}
        </div>

        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
        {message && <p className="settings-message">{message}</p>}
      </section>
    </div>
  );
}