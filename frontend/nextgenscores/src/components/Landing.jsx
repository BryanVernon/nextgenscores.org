import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Scoreboard from "../pages/Scoreboard";

export default function Landing() {
  const { user } = useContext(AuthContext);
  return user ? <Navigate to="/dashboard" replace /> : <Scoreboard />;
}
