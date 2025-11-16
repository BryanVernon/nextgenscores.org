import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PickEmPage from "./pages/PickEmPage.jsx";
import Scoreboard from "./pages/Scoreboard.jsx";
import Signup from "./components/auth/Signup.jsx";
import Login from "./components/auth/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const router = createBrowserRouter([
  // Auth pages — no navbar
  { path: "/signup", element: <Signup /> },
  { path: "/login", element: <Login /> },

  // Main app pages — wrapped in Layout (navbar)
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },           // home page
      { path: "dashboard", element: 
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      },
      { path: "pickem", element: <PickEmPage /> },
      { path: "schedule", element: <Scoreboard /> },
      { path: "*", element: <div>404 Not Found</div> },
    ],
  },
]);


createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);