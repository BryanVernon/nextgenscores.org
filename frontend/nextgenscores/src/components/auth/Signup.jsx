import { useForm } from "react-hook-form";
import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import axios from "../../api";
import { useNavigate, Link } from "react-router-dom";
import { getTeamGroups } from "../../teamOptions";
import "./Auth.css";

const GAMES_URL = window.location.hostname === "localhost"
  ? "http://localhost:3002/api/games"
  : "https://nextgenscores-org.onrender.com/api/games";

export default function Signup() {
  const { register, handleSubmit } = useForm();
  const { setUser } = useContext(AuthContext);
  const [error, setError] = useState("");
  const [games, setGames] = useState([]);
  const navigate = useNavigate();
  const teamGroups = useMemo(() => getTeamGroups(games), [games]);

  useEffect(() => {
    fetch(GAMES_URL)
      .then(response => response.ok ? response.json() : [])
      .then(setGames)
      .catch(() => setGames([]));
  }, []);

  const onSubmit = async ({ firstName, lastName, favoriteTeam, ...data }) => {
    try {
      const res = await axios.post("/auth/signup", {
        ...data,
        firstName,
        lastName,
        favoriteTeams: favoriteTeam ? [favoriteTeam] : [],
      });
      setUser(res.data.user);
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Signup failed");
    }
  };

  return <div className="auth-page"><div className="auth-panel">
    <p className="eyebrow">Start your season</p><h1>Join <span>NextGenScores</span></h1>
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="name-fields"><input {...register("firstName", { required: true })} placeholder="First name" aria-label="First name" /><input {...register("lastName", { required: true })} placeholder="Last name" aria-label="Last name" /></div>
      <input {...register("email", { required: true })} placeholder="Email" />
      <input type="password" {...register("password", { required: true })} placeholder="Password" />
      <select {...register("favoriteTeam")} aria-label="Favorite team"><option value="">Favorite team (optional)</option>{teamGroups.top25.length > 0 && <optgroup label="AP Top 25">{teamGroups.top25.map(team => <option key={team.name} value={team.name}>#{team.rank} {team.name}</option>)}</optgroup>}{teamGroups.remaining.map(group => <optgroup key={group.name} label={group.name}>{group.teams.map(team => <option key={team.name} value={team.name}>{team.name}</option>)}</optgroup>)}</select>
      <button className="auth-submit" type="submit">Create account</button>
    </form>
    {error && <p className="auth-error">{error}</p>}
    <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
  </div></div>;
}
