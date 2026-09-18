import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import axios from "../../api";
import "./Auth.css";

export default function ResetPassword() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const [params] = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = params.get("token");

  const onSubmit = async ({ password, confirmPassword }) => {
    setError("");
    setMessage("");
    if (password !== confirmPassword) return setError("Passwords do not match");
    try {
      const response = await axios.post("/auth/reset-password", { token, password }, { timeout: 20000 });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to reset password");
    }
  };

  if (!token) return <div className="auth-page"><div className="auth-panel"><p className="auth-error">This reset link is invalid.</p><p className="auth-switch"><Link to="/forgot-password">Request a new link</Link></p></div></div>;

  return <div className="auth-page"><div className="auth-panel">
    <p className="eyebrow">Account recovery</p><h1>Choose a new <span>password</span></h1>
    {!message && <form onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
      <label className="auth-field">New password<input {...register("password", { required: true })} type="password" autoComplete="new-password" minLength={8} aria-describedby="reset-password-help" required /></label>
      <p id="reset-password-help" className="auth-help">Use at least 8 characters.</p>
      <label className="auth-field">Confirm new password<input {...register("confirmPassword", { required: true })} type="password" autoComplete="new-password" minLength={8} required /></label>
      <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Updating..." : "Update password"}</button>
    </form>}
    {message && <p className="auth-success" role="status">{message} <Link to="/login">Log in</Link></p>}
    {error && <p className="auth-error" role="alert">{error} <Link to="/forgot-password">Request a new link</Link></p>}
    <p className="auth-switch"><Link to="/schedule">Browse scores</Link></p>
  </div></div>;
}
