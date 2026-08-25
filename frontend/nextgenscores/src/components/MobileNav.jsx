import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./MobileNav.css";

const items = [
  { to: "/", label: "Home", icon: "⌂", end: true },
  { to: "/schedule", label: "Schedule", icon: "◫" },
  { to: "/pickem", label: "Pick 'Em", icon: "✓" },
  { to: "/leaderboard", label: "Leaders", icon: "♜" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export default function MobileNav() {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  return (
    <nav className="mobile-nav" aria-label="Primary navigation">
      {items.map(({ to, label, icon, end }) => (
        <NavLink key={to} to={to} end={end} className="mobile-nav-link">
          <span className="mobile-nav-icon" aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
