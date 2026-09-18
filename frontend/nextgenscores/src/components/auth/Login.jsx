import { useForm } from "react-hook-form";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import axios from "../../api";
import { useNavigate, Navigate, Link, useLocation } from "react-router-dom";
import LoadingScreen from "../LoadingScreen";
import "./Auth.css";
import { authDestination } from "./authDestination";

export default function Login() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const { user, setUser, loading } = useContext(AuthContext);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const destination = authDestination(location.state);

  // Redirect if already logged in
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={destination} replace />;

  const onSubmit = async (data) => {
    setError("");
    try {
      const res = await axios.post("/auth/login", { ...data, email: data.email.trim().toLowerCase() }, { timeout: 15000 });
      
      // Update context with user returned from backend
      localStorage.setItem("ngs-returning-user", "true");
      localStorage.setItem("ngs_session_token", res.data.token);
      localStorage.removeItem("ngs-signed-out");
      setUser(res.data.user);

      // Redirect to dashboard or schedule
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't log you in. Check your connection and try again.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <p className="eyebrow">Welcome back</p>
        <h1>Log in to <span>NextGenScores</span></h1>
      <form onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
        <label className="auth-field" htmlFor="login-email">Email</label>
        <input
          id="login-email"
          {...register("email", { required: true })}
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="email"
          enterKeyHint="next"
          placeholder="Email"
          required
        />
        <label className="auth-field" htmlFor="login-password">Password</label>
        <input
          id="login-password"
          {...register("password", { required: true })}
          type="password"
          autoComplete="current-password"
          enterKeyHint="go"
          placeholder="Password"
          required
        />
        <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Logging in..." : "Log in"}</button>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <p className="auth-switch"><Link to="/forgot-password" state={location.state}>Forgot your password?</Link></p>
      <p className="auth-switch">
        Don't have an account? <Link to="/signup" state={location.state}>Sign up</Link>
      </p>
      <p className="auth-switch"><Link to="/schedule">Browse scores without an account</Link></p>
      </div>
    </div>
  );
}
