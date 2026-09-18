import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Link } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./context/AuthProvider";
import Layout from "./Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PickEmPage from "./pages/PickEmPage.jsx";
import Scoreboard from "./pages/Scoreboard.jsx";
import Signup from "./components/auth/Signup.jsx";
import Login from "./components/auth/Login.jsx";
import ForgotPassword from "./components/auth/ForgotPassword.jsx";
import ResetPassword from "./components/auth/ResetPassword.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Settings from "./pages/Settings.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import ThemeApplier from "./components/ThemeApplier.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Landing from "./components/Landing.jsx";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
const router = createBrowserRouter([
  // Auth pages — login/signup
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },

  // Main app pages
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Landing /> },
      { path: "dashboard", element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
      { path: "pickem", element: <ProtectedRoute><PickEmPage /></ProtectedRoute> },
      { path: "schedule", element: <Scoreboard /> },
      { path: "*", element: <div className="page-message"><h1>Page not found</h1><p>Let's get you back to the games.</p><Link to="/schedule">Browse scores</Link></div> },
      { path: "settings", element: <ProtectedRoute><Settings /></ProtectedRoute> },
      { path: "leaderboard", element: <ProtectedRoute><Leaderboard /></ProtectedRoute> },
      { path: "admin", element: <ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute> },
    ],
  }

]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ThemeApplier>
        <RouterProvider router={router} />
      </ThemeApplier>
    </AuthProvider>
  </StrictMode>
);
