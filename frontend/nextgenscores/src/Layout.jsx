import Navbar from "./navbar.jsx";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
