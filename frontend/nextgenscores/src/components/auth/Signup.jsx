// src/components/auth/Signup.jsx
import { useForm } from "react-hook-form";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import axios from "../../api";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";

export default function Signup() {
  const { register, handleSubmit } = useForm();
  const { setUser } = useContext(AuthContext);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const res = await axios.post("/auth/signup", data);
      setUser(res.data.user); // store user in context
      navigate("/dashboard"); // go to dashboard
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-panel">
      <p className="eyebrow">Start your season</p>
      <h1>Join <span>NextGenScores</span></h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input
          {...register("name", { required: true })}
          placeholder="Full Name"
        />
        <input
          {...register("email", { required: true })}
          placeholder="Email"
        />
        <input
          type="password"
          {...register("password", { required: true })}
          placeholder="Password"
        />
        <input
          {...register("favoriteTeam")}
          placeholder="Favorite Team (optional)"
        />
        <button className="auth-submit" type="submit">Create account</button>
      </form>

      {error && <p className="auth-error">{error}</p>}

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
      </div>
    </div>
  );
}
