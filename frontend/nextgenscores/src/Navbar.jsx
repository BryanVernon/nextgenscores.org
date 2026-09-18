import { Link, NavLink, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { pathname } = useLocation();

  return (
    <nav className="site-nav" aria-label="Main navigation">
      <Link className="brand-mark" to="/">
        <span className="brand-dot" aria-hidden="true" />
        <span>NextGen<span>Scores</span></span>
      </Link>
      <ul className="nav-links">
        {user ? (
          <>
            <li><NavLink to="/dashboard">Dashboard</NavLink></li>
            <li><NavLink to="/schedule">Scores & Schedule</NavLink></li>
            <li><NavLink to="/pickem">Pick 'Em</NavLink></li>
            <li><NavLink to="/leaderboard">Leaderboard</NavLink></li>
            <li><NavLink to="/settings">Settings</NavLink></li>
            {user.role === "admin" && <li><NavLink to="/admin">Admin</NavLink></li>}
            <li><button className="logout-button" onClick={logout}>Log out</button></li>
          </>
        ) : <>
          <li><NavLink to="/schedule" className={({ isActive }) => isActive || pathname === "/" ? "active" : undefined}>Scores & Schedule</NavLink></li>
          <li><NavLink to="/login">Log in</NavLink></li>
          <li><Link className="nav-signup" to="/signup">Create account</Link></li>
        </>}
      </ul>
      {user && <div className="mobile-account-actions">{user.role === "admin" && <Link to="/admin">Admin</Link>}<button className="logout-button" onClick={logout}>Log out</button></div>}
    </nav>
  );
};

export default Navbar;
