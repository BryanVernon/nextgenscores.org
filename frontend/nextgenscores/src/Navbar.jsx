import "./Navbar.css";

const navbar = () => {
  return (
    <nav>
        <h1>NextGenScores</h1>
        <ul>
            <li><a href="/">Dashboard</a></li>
            <li><a href="/schedule">CFB Schedule</a></li>
            <li><a href="/pickem">Pick 'Em</a></li>
            <li><a href="/contact">Leaderboard</a></li>
            <li><a href="/signup">Sign Up</a></li>
            <li><a href="/login">Login</a></li>
        </ul>
    </nav>
  );
}
export default navbar;