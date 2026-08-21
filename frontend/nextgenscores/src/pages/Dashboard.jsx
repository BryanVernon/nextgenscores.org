import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://nextgenscores-org.onrender.com";

export default function Dashboard() {
  const { user, logout, loading } = useContext(AuthContext);
  const [summaries, setSummaries] = useState({});
  const [editingTeams, setEditingTeams] = useState(false);

  useEffect(() => {
    if (!user?.favoriteTeams?.length) return;

    user.favoriteTeams.forEach(async (team) => {
      try {
        const res = await fetch(`${API_BASE}/api/team-summary?team=${encodeURIComponent(team)}`);
        if (!res.ok) return;
        const data = await res.json();
        setSummaries(prev => ({ ...prev, [team]: data }));
      } catch (err) {
        console.error(`Failed to load summary for ${team}`, err);
      }
    });
  }, [user]);

  if (loading) return <div className="page-message">Loading...</div>;
  if (!user) return <div className="page-message">Please log in</div>;

  return (
    <div className="dashboard-page">
      <p className="eyebrow">Your season hub</p>
      <h1>Welcome back, <span>{user.name}</span>.</h1>
      <p className="dashboard-lede">Keep your picks close and your Saturdays closer.</p>

      <section className="dashboard-grid">
        {user.favoriteTeams?.length ? (
          user.favoriteTeams.map(team => (
            <TeamPanel key={team} team={team} summary={summaries[team]} />
          ))
        ) : (
          <div className="dashboard-panel favorite-panel">
            <span className="panel-label">Favorite teams</span>
            <strong>Not set yet</strong>
            <p>Add a team to see their record and upcoming game here.</p>
          </div>
        )}

        <div className="dashboard-panel pools-panel">
          <span className="panel-label">Pick 'Em pools</span>
          <strong>Coming soon</strong>
          <p>Create a pool or join friends for the next slate.</p>
        </div>
      </section>

      <div className="dashboard-actions">
        <Link className="dashboard-link" to="/schedule">View schedule <span aria-hidden="true">→</span></Link>
        <button className="quiet-button" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}

function TeamPanel({ team, summary }) {
  if (!summary) {
    return (
      <div className="dashboard-panel favorite-panel">
        <span className="panel-label">{team}</span>
        <p>Loading...</p>
      </div>
    );
  }

  const { record, lastGame, nextGame } = summary;

  return (
    <div className="dashboard-panel favorite-panel">
      <span className="panel-label">{team}</span>
      <strong>{record.wins}-{record.losses}</strong>

      {lastGame && (
        <p>
          Last: {lastGame.isHome ? "vs" : "@"} {lastGame.opponent} — {lastGame.teamScore}-{lastGame.oppScore}
        </p>
      )}

      {nextGame && (
        <p>
          Next: {nextGame.isHome ? "vs" : "@"} {nextGame.opponent} on{" "}
          {new Date(nextGame.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      )}
    </div>
  );
}