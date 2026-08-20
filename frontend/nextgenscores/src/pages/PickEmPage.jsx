// PickEmPage.jsx
import React, { useState } from "react";
import "./PickEmPage.css"; // new CSS file for styling

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
  const [pools] = useState([
    { id: 1, name: "SEC Week 1 Pool", type: "Spread", participants: 5, limit: 10, visibility: "Public" },
    { id: 2, name: "ACC Friends Pool", type: "Standard", participants: 3, limit: null, visibility: "Private" },
  ]);

  return (
    <div className="pickem-content">
      <button className="btn back-btn" onClick={goBack}>← Back</button>
      <h2>Available pools</h2>
      <table className="pools-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Participants</th>
            <th>Limit</th>
            <th>Visibility</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {pools.map(pool => (
            <tr key={pool.id}>
              <td>{pool.name}</td>
              <td>{pool.type}</td>
              <td>{pool.participants}</td>
              <td>{pool.limit ?? "No limit"}</td>
              <td>{pool.visibility}</td>
              <td><button className="btn join-btn">Join</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Create Pool ----------------
function CreatePool({ goBack }) {
  const [type, setType] = useState("Standard");
  const [conference, setConference] = useState("All");
  const [limit, setLimit] = useState("");
  const [visibility, setVisibility] = useState("Public");

  const conferences = ['AP Top 25', 'SEC', 'ACC', 'Big 12', 'Big Ten', 'Mountain West', 'Pac-12', 'FBS Independents', 'Mid-American','Sun Belt', 'Ivy', 'Patriot'];

  const handleSubmit = (e) => {
    e.preventDefault();
    const newPool = { type, conference, limit, visibility };
    console.log("Creating pool:", newPool);
    goBack();
  };

  return (
    <div className="pickem-content">
      <button className="btn back-btn" onClick={goBack}>← Back</button>
      <h2>Create a new pool</h2>
      <form className="create-pool-form" onSubmit={handleSubmit}>
        <label>
          Pool Type:
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="Standard">Standard</option>
            <option value="Spread">Spread</option>
          </select>
        </label>

        <label>
          Conference:
          <select value={conference} onChange={e => setConference(e.target.value)}>
            <option value="All">All</option>
            {conferences.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label>
          Group Limit (optional):
          <input
            type="number"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            placeholder="No limit"
            min={1}
          />
        </label>

        <label>
          Visibility:
          <select value={visibility} onChange={e => setVisibility(e.target.value)}>
            <option value="Public">Public</option>
            <option value="Private">Private</option>
          </select>
        </label>

        <button type="submit" className="btn create-btn">Create Pool</button>
      </form>
    </div>
  );
}
