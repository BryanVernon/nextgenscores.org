import { useForm } from "react-hook-form";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import axios from "../../api";
import "./Auth.css";

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async ({ email }) => {
    setError("");
    setMessage("");
    try {
      const response = await axios.post("/auth/forgot-password", { email: email.trim().toLowerCase() }, { timeout: 20000 });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send a reset email");
    }
  };

  return <div className="auth-page"><div className="auth-panel">
    <p className="eyebrow">Account recovery</p><h1>Reset your <span>password</span></h1>
    <p className="auth-switch">Enter your email and we’ll send a one-hour reset link.</p>
    <form onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
      <label className="auth-field">Email<input {...register("email", { required: true })} type="email" autoComplete="email" autoCapitalize="none" inputMode="email" required /></label>
      <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send reset link"}</button>
    </form>
    {message && <p className="auth-success" role="status">{message}</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    <p className="auth-switch"><Link to="/login" state={location.state}>Back to log in</Link></p>
    <p className="auth-switch"><Link to="/schedule">Browse scores</Link></p>
  </div></div>;
}
