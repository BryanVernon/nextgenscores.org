// src/components/ProtectedRoute.jsx
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import LoadingScreen from "./LoadingScreen";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <LoadingScreen />;
  if (!user) {
    const hasVisited = localStorage.getItem("ngs-returning-user") === "true";
    return <Navigate to={hasVisited ? "/login" : "/signup"} replace />;
  }

  return children;
}
