import { Link } from "react-router-dom";
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
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/schedule">CFB Schedule</Link></li>
            <li><Link to="/pickem">Pick 'Em</Link></li>
            <li><Link to="/leaderboard">Leaderboard</Link></li>
            <li><Link to="/settings">Settings</Link></li>
            {user.role === "admin" && <li><Link to="/admin">Admin</Link></li>}
            <li><button className="logout-button" onClick={logout}>Log out</button></li>
          </>
        ) : null}
      </ul>
    </nav>
  );
};

export default Navbar;
