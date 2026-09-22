import Navbar from "./Navbar.jsx";
import MobileNav from "./components/MobileNav.jsx";
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { resetScrollPosition } from "./scrollRestoration.js";

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    resetScrollPosition(window.scrollTo.bind(window));
  }, [pathname]);

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
