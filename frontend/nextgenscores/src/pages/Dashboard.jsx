import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user, logout, loading } = useContext(AuthContext);

  if (loading) return <div className="page-message">Loading...</div>;
  if (!user) return <div className="page-message">Please log in</div>;

  return (
    <div className="dashboard-page">
      <p className="eyebrow">Your season hub</p>
      <h1>Welcome back, <span>{user.name}</span>.</h1>
      <p className="dashboard-lede">Keep your picks close and your Saturdays closer.</p>

      <section className="dashboard-grid">
        <div className="dashboard-panel favorite-panel">
          <span className="panel-label">Favorite team</span>
          <strong>{user.favoriteTeam || "Not set yet"}</strong>
          <p>Your personalized game view will live here.</p>
        </div>
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
