// src/Layout.jsx
import Navbar from "./Navbar.jsx";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div>
      <Navbar />
      <main className="p-4">
        <Outlet /> {/* This is where each page will load */}
      </main>
    </div>
  );
}
