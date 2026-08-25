import { Link, NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="site-nav">
      <Link className="brand-mark" to="/">
        <span className="brand-dot" aria-hidden="true" />
        <span>NextGen<span>Scores</span></span>
      </Link>
      <ul className="nav-links">
        {user ? (
          <>
            <li><NavLink to="/" end>Dashboard</NavLink></li>
            <li><NavLink to="/schedule">CFB Schedule</NavLink></li>
            <li><NavLink to="/pickem">Pick 'Em</NavLink></li>
            <li><NavLink to="/leaderboard">Leaderboard</NavLink></li>
            <li><NavLink to="/settings">Settings</NavLink></li>
            {user.role === "admin" && <li><NavLink to="/admin">Admin</NavLink></li>}
            <li><button className="logout-button" onClick={logout}>Log out</button></li>
          </>
        ) : null}
      </ul>
    </nav>
  );
};

export default Navbar;
