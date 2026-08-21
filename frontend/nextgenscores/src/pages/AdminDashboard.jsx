import { useEffect, useState } from "react";
import "./AdminDashboard.css";

const API_BASE = import.meta.env.MODE === "development" ? "http://localhost:3002" : "https://nextgenscores-org.onrender.com";

async function readResponse(response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Request failed");
  return body;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function loadDashboard() {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/api/admin/overview`, { credentials: "include" });
      setData(await readResponse(response));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  async function remove(resource, item) {
    const label = resource === "users" ? `${item.name} (${item.email})` : item.name;
    const detail = resource === "users"
      ? "This also removes their picks, removes them from other pools, and deletes pools they own."
      : "This also deletes every pick saved in this pool.";
    if (!window.confirm(`Delete ${label}?\n\n${detail}\n\nThis cannot be undone.`)) return;

    setBusyId(`${resource}-${item.id}`);
    try {
      const response = await fetch(`${API_BASE}/api/admin/${resource}/${item.id}`, { method: "DELETE", credentials: "include" });
      await readResponse(response);
      await loadDashboard();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyId(null);
    }
  }

  return <div className="admin-page">
    <p className="eyebrow">Administration</p><h1>Admin <span>Dashboard</span></h1>
    <p className="admin-intro">Manage accounts and Pick 'Em pools from one protected workspace.</p>
    {error && <p className="admin-error">{error}</p>}
    {!data && !error && <p className="admin-loading">Loading admin data...</p>}
    {data && <>
      <section className="admin-stats" aria-label="Site totals">
        <article><span>Users</span><strong>{data.counts.users}</strong></article>
        <article><span>Pools</span><strong>{data.counts.pools}</strong></article>
        <article><span>Saved picks</span><strong>{data.counts.picks}</strong></article>
      </section>
      <section className="admin-section"><div><p className="eyebrow">Accounts</p><h2>Users</h2></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Role</th><th>Favorites</th><th>Joined</th><th aria-label="Actions" /></tr></thead><tbody>{data.users.map(user => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email}</small></td><td><span className={`role-badge ${user.role}`}>{user.role}</span></td><td>{user.favoriteTeams?.join(", ") || "—"}</td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td><button className="admin-delete" onClick={() => remove("users", user)} disabled={busyId === `users-${user.id}` || user.role === "admin"}>{busyId === `users-${user.id}` ? "Deleting..." : user.role === "admin" ? "Protected" : "Delete user"}</button></td></tr>)}</tbody></table></div>
      </section>
      <section className="admin-section"><div><p className="eyebrow">Competition</p><h2>Pick 'Em pools</h2></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Pool</th><th>Conference</th><th>Scoring</th><th>Players</th><th>Created</th><th aria-label="Actions" /></tr></thead><tbody>{data.pools.map(pool => <tr key={pool.id}><td><strong>{pool.name}</strong></td><td>{pool.conference}</td><td>{pool.scoringType === "spread" ? "Against the spread" : "Straight up"}</td><td>{pool.participants}</td><td>{new Date(pool.createdAt).toLocaleDateString()}</td><td><button className="admin-delete" onClick={() => remove("pools", pool)} disabled={busyId === `pools-${pool.id}`}>{busyId === `pools-${pool.id}` ? "Deleting..." : "Delete pool"}</button></td></tr>)}</tbody></table></div>
      </section>
    </>}
  </div>;
}
