// PickEmPage.jsx
import React, { useState } from "react";
import "./PickEmPage.css"; // new CSS file for styling
import { useEffect } from "react";
const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://nextgenscores-org.onrender.com";
export default function PickEmPage() {
  const [view, setView] = useState("home"); // home | create | join

  return (
    <div className="pickem-page">
      <p className="eyebrow">Compete with your people</p>
      <h1>Pick 'Em <span>Pools</span></h1>
      <p className="pickem-intro">Make your calls, track the field, and see who knows college football best.</p>

      {view === "home" && (
        <div className="home-buttons">
          <button className="btn" onClick={() => setView("create")}>Create Pool</button>
          <button className="btn" onClick={() => setView("join")}>Join Pool</button>
        </div>
      )}

      {view === "join" && <JoinPool goBack={() => setView("home")} />}
      {view === "create" && <CreatePool goBack={() => setView("home")} />}
    </div>
  );
}

// ---------------- Join Pool ----------------
function JoinPool({ goBack }) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/pools`)
      .then(res => res.json())
      .then(setPools)
      .finally(() => setLoading(false));
  }, []);

  async function handleJoin(id) {
    setJoiningId(id);
    try {
      const res = await fetch(`${API_BASE}/api/pools/${id}/join`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      alert("Joined!"); // swap for a nicer toast later
    } catch {
      alert("Failed to join pool");
    } finally {
      setJoiningId(null);
    }
  }

  if (loading) return <p>Loading pools...</p>;

  return (
    <div className="pickem-content">
      <button className="btn back-btn" onClick={goBack}>← Back</button>
      <h2>Available pools</h2>
      <table className="pools-table">
        <thead>
          <tr><th>Name</th><th>Scoring</th><th>Participants</th><th>Limit</th><th>Action</th></tr>
        </thead>
        <tbody>
          {pools.map(pool => (
            <tr key={pool.id}>
              <td>{pool.name}</td>
              <td>{pool.scoringType === "spread" ? "Against the spread" : "Straight up"}</td>
              <td>{pool.participants}</td>
              <td>{pool.limit ?? "No limit"}</td>
              <td>
                <button className="btn join-btn" onClick={() => handleJoin(pool.id)} disabled={joiningId === pool.id}>
                  {joiningId === pool.id ? "Joining..." : "Join"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreatePool({ goBack }) {
  const [name, setName] = useState("");
  const [scoringType, setScoringType] = useState("straight");
  const [limit, setLimit] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/pools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, scoringType, limit: limit ? Number(limit) : null }),
      });
      if (!res.ok) throw new Error();
      goBack();
    } catch {
      setError("Failed to create pool. Try again.");
    }
  }

  return (
    <div className="pickem-content">
      <button className="btn back-btn" onClick={goBack}>← Back</button>
      <h2>Create a new pool</h2>
      <form className="create-pool-form" onSubmit={handleSubmit}>
        <label>
          Pool Name:
          <input type="text" value={name} onChange={e => setName(e.target.value)} required />
        </label>
        <label>
          Scoring Type:
          <select value={scoringType} onChange={e => setScoringType(e.target.value)}>
            <option value="straight">Straight up</option>
            <option value="spread">Against the spread</option>
          </select>
        </label>
        <label>
          Group Limit (optional):
          <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="No limit" min={1} />
        </label>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="btn create-btn">Create Pool</button>
      </form>
    </div>
  );
}