import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useState } from "react";
import axios from "../../api";
import "./Auth.css";

export default function ForgotPassword() {
  const { register, handleSubmit } = useForm();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async ({ email }) => {
    setError("");
    setMessage("");
    try {
      const response = await axios.post("/auth/forgot-password", { email });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send a reset email");
    }
  };

  return <div className="auth-page"><div className="auth-panel">
    <p className="eyebrow">Account recovery</p><h1>Reset your <span>password</span></h1>
    <p className="auth-switch">Enter your email and we’ll send a one-hour reset link.</p>
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email", { required: true })} type="email" autoComplete="email" autoCapitalize="none" inputMode="email" placeholder="Email" />
      <button className="auth-submit" type="submit">Send reset link</button>
    </form>
    {message && <p className="auth-success">{message}</p>}
    {error && <p className="auth-error">{error}</p>}
    <p className="auth-switch"><Link to="/login">Back to log in</Link></p>
  </div></div>;
}
