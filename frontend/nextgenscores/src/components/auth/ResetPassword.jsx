import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import axios from "../../api";
import "./Auth.css";

export default function ResetPassword() {
  const { register, handleSubmit } = useForm();
  const [params] = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = params.get("token");

  const onSubmit = async ({ password, confirmPassword }) => {
    setError("");
    setMessage("");
    if (password !== confirmPassword) return setError("Passwords do not match");
    try {
      const response = await axios.post("/auth/reset-password", { token, password });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to reset password");
    }
  };

  if (!token) return <div className="auth-page"><div className="auth-panel"><p className="auth-error">This reset link is invalid.</p><p className="auth-switch"><Link to="/forgot-password">Request a new link</Link></p></div></div>;

  return <div className="auth-page"><div className="auth-panel">
    <p className="eyebrow">Account recovery</p><h1>Choose a new <span>password</span></h1>
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("password", { required: true })} type="password" autoComplete="new-password" minLength="8" placeholder="New password (8+ characters)" />
      <input {...register("confirmPassword", { required: true })} type="password" autoComplete="new-password" minLength="8" placeholder="Confirm new password" />
      <button className="auth-submit" type="submit">Update password</button>
    </form>
    {message && <p className="auth-success">{message} <Link to="/login">Log in</Link></p>}
    {error && <p className="auth-error">{error}</p>}
  </div></div>;
}
