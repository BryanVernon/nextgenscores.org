// src/components/ProtectedRoute.jsx
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate, Link, useLocation } from "react-router-dom";
import LoadingScreen from "./LoadingScreen";

export default function ProtectedRoute({ children }) {
  const { user, loading, authError, retryAuth } = useContext(AuthContext);
  const location = useLocation();
  const state = { from: `${location.pathname}${location.search}${location.hash}` };

  if (loading) return <LoadingScreen />;
  if (!user) {
    if (authError) return <div className="page-message" role="alert"><h1>Let's reconnect</h1><p>{authError}</p><div className="session-recovery-actions"><button className="auth-submit" onClick={retryAuth}>Try again</button><Link to="/login" state={state}>Log in</Link><Link to="/schedule">Browse scores</Link></div></div>;
    const hasVisited = localStorage.getItem("ngs-returning-user") === "true";
    return <Navigate to={hasVisited ? "/login" : "/signup"} state={state} replace />;
  }

  return children;
}
