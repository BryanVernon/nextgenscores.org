import { NavLink, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "./MobileNav.css";

const items = [
  { to: "/dashboard", label: "Home", icon: "⌂" },
  { to: "/schedule", label: "Scores", icon: "◫" },
  { to: "/pickem", label: "Pick 'Em", icon: "✓" },
  { to: "/leaderboard", label: "Leaders", icon: "♜" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export default function MobileNav() {
  const { user } = useContext(AuthContext);
  const { pathname } = useLocation();
  const navigationItems = user ? items : [
    { to: "/schedule", label: "Scores", icon: "◫" },
    { to: "/login", label: "Log in", icon: "→" },
    { to: "/signup", label: "Join free", icon: "+" },
  ];

  return (
    <nav className={`mobile-nav${user ? "" : " mobile-nav-guest"}`} aria-label="Mobile navigation">
      {navigationItems.map(({ to, label, icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-link${isActive || (to === "/schedule" && pathname === "/") ? " active" : ""}`}>
          <span className="mobile-nav-icon" aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
