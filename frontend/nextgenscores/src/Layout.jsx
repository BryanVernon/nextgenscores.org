import Navbar from "./Navbar.jsx";
import MobileNav from "./components/MobileNav.jsx";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar />
      <main className="app-main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
