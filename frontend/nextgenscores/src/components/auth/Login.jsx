import { useForm } from "react-hook-form";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import axios from "../../api";
import { useNavigate, Navigate, Link } from "react-router-dom";

export default function Login() {
  const { register, handleSubmit } = useForm();
  const { user, setUser, loading } = useContext(AuthContext);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Redirect if already logged in
  if (loading) return <div>Loading...</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (data) => {
    try {
      const res = await axios.post("/auth/login", data);
      setUser(res.data.user);  // store user in context
      navigate("/dashboard");  // go to dashboard
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input {...register("email", { required: true })} placeholder="Email" />
        <input type="password" {...register("password", { required: true })} placeholder="Password" />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p style={{ marginTop: "1rem" }}>
              Don't have an account? <Link to="/signup">Sign Up</Link>
            </p>
    </div>
  );
}
