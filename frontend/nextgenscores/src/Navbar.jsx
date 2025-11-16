import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav>
      <h1>NextGenScores</h1>
      <ul>
        {user ? (
          <>
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/schedule">CFB Schedule</Link></li>
            <li><Link to="/pickem">Pick 'Em</Link></li>
            <li><Link to="/contact">Leaderboard</Link></li>
            <li><button onClick={logout}>Logout</button></li>
          </>
        ) : null}
      </ul>
    </nav>
  );
};

export default Navbar;
