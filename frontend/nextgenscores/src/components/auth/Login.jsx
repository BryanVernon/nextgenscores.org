import { useForm } from "react-hook-form";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import axios from "../../api";
import { useNavigate, Navigate, Link } from "react-router-dom";
import "./Auth.css";

export default function Login() {
  const { register, handleSubmit } = useForm();
  const { user, setUser, loading } = useContext(AuthContext);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Redirect if already logged in
  if (loading) return <div className="page-message">Loading...</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (data) => {
    try {
      const res = await axios.post("/auth/login", data, { withCredentials: true });
      
      // Update context with user returned from backend
      localStorage.setItem("ngs-returning-user", "true");
      sessionStorage.setItem("ngs_session_token", res.data.token);
      setUser(res.data.user);

      // Redirect to dashboard or schedule
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <p className="eyebrow">Welcome back</p>
        <h1>Log in to <span>NextGenScores</span></h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input {...register("email", { required: true })} placeholder="Email" />
        <input type="password" {...register("password", { required: true })} placeholder="Password" />
        <button className="auth-submit" type="submit">Log in</button>
      </form>
      {error && <p className="auth-error">{error}</p>}
      <p className="auth-switch">
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </p>
      </div>
    </div>
  );
}
