import Navbar from "./Navbar.jsx";
import MobileNav from "./components/MobileNav.jsx";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
