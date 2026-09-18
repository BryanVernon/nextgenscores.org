import { useForm } from "react-hook-form";
import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import axios from "../../api";
import { useNavigate, Link, Navigate, useLocation } from "react-router-dom";
import { getTeamGroups } from "../../teamOptions";
import "./Auth.css";
import LoadingScreen from "../LoadingScreen";
import { authDestination } from "./authDestination";

const GAMES_URL = import.meta.env.MODE === "development"
  ? `${window.location.protocol}//${window.location.hostname}:3002/api/games`
  : "https://nextgenscores-org.onrender.com/api/games";

export default function Signup() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const { user, loading, setUser } = useContext(AuthContext);
  const [error, setError] = useState("");
  const [games, setGames] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const destination = authDestination(location.state);
  const teamGroups = useMemo(() => getTeamGroups(games), [games]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(GAMES_URL, { signal: controller.signal })
      .then(response => response.ok ? response.json() : [])
      .then(setGames)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const onSubmit = async ({ firstName, lastName, favoriteTeam, ...data }) => {
    setError("");
    try {
      const res = await axios.post("/auth/signup", {
        ...data,
        email: data.email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        favoriteTeams: favoriteTeam ? [favoriteTeam] : [],
      }, { timeout: 20000 });
      localStorage.setItem("ngs-returning-user", "true");
      localStorage.setItem("ngs_session_token", res.data.token);
      localStorage.removeItem("ngs-signed-out");
      setUser(res.data.user);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't create your account. Check your connection and try again.");
    }
  };

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={destination} replace />;

  return <div className="auth-page"><div className="auth-panel">
    <p className="eyebrow">Start your season</p><h1>Join <span>NextGenScores</span></h1>
    <p className="auth-intro">Save your favorite teams and compete with friends in Pick 'Em pools.</p>
    <form onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
      <div className="name-fields"><label className="auth-field">First name<input {...register("firstName", { required: true })} autoComplete="given-name" required /></label><label className="auth-field">Last name<input {...register("lastName", { required: true })} autoComplete="family-name" required /></label></div>
      <label className="auth-field">Email<input {...register("email", { required: true })} type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" inputMode="email" required /></label>
      <label className="auth-field">Password<input type="password" autoComplete="new-password" minLength={8} aria-describedby="signup-password-help" {...register("password", { required: true })} required /></label>
      <p id="signup-password-help" className="auth-help">Use at least 8 characters.</p>
      <label className="auth-field">Favorite team (optional)<select {...register("favoriteTeam")}><option value="">Choose a team</option>{teamGroups.top25.length > 0 && <optgroup label="AP Top 25">{teamGroups.top25.map(team => <option key={team.name} value={team.name}>#{team.rank} {team.name}</option>)}</optgroup>}{teamGroups.remaining.map(group => <optgroup key={group.name} label={group.name}>{group.teams.map(team => <option key={team.name} value={team.name}>{team.name}</option>)}</optgroup>)}</select></label>
      <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating account..." : "Create account"}</button>
    </form>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <p className="auth-switch">Already have an account? <Link to="/login" state={location.state}>Log in</Link></p>
    <p className="auth-switch"><Link to="/schedule">Browse scores without an account</Link></p>
  </div></div>;
}
