import { StrictMode, useContext } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import Layout from "./Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PickEmPage from "./pages/PickEmPage.jsx";
import Scoreboard from "./pages/Scoreboard.jsx";
import Signup from "./components/auth/Signup.jsx";
import Login from "./components/auth/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Landing component must use AuthContext
function Landing() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;
  return user ? <Navigate to="/dashboard" replace /> : <Signup />;
}

const router = createBrowserRouter([
  // Auth pages — login/signup
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },

  // Main app pages
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Landing /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "pickem", element: <PickEmPage /> },
      { path: "schedule", element: <Scoreboard /> },
      { path: "*", element: <div>404 Not Found</div> },
    ],
  }

]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} /> {/* ← pass the router object */}
    </AuthProvider>
  </StrictMode>
);
