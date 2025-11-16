import { useForm } from "react-hook-form";
import { useState } from "react";

export default function Signup() {
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm();

  const onSubmit = async (data) => {
    setServerError("");

    try {
      const res = await fetch("http://localhost:3002/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (!res.ok) {
        setServerError(result.message || "Signup failed");
        return;
      }

      alert("Signup successful! You can now login.");
    } catch (error) {
      setServerError("Server error, try again later.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Create Account</h2>

      {serverError && (
        <p className="text-red-500 mb-3">{serverError}</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* Name */}
        <div className="mb-4">
          <label className="block mb-1">Name</label>
          <input
            className="w-full border p-2 rounded"
            {...register("name", { required: "Name is required" })}
            placeholder="Your full name"
          />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block mb-1">Email</label>
          <input
            className="w-full border p-2 rounded"
            {...register("email", {
              required: "Email is required",
              pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email format" }
            })}
            placeholder="you@example.com"
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        {/* Favorite Team */}
        <div className="mb-4">
          <label className="block mb-1">Favorite Team</label>
          <select
            className="w-full border p-2 rounded"
            {...register("favoriteTeam", { required: "Select a team" })}
          >
            <option value="">-- Choose your team --</option>
            <option value="Texas">Texas</option>
            <option value="Alabama">Alabama</option>
            <option value="Ohio State">Ohio State</option>
            <option value="Georgia">Georgia</option>
            {/* Add all teams later */}
          </select>
          {errors.favoriteTeam && <p className="text-red-500 text-sm">{errors.favoriteTeam.message}</p>}
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block mb-1">Password</label>
          <input
            type="password"
            className="w-full border p-2 rounded"
            {...register("password", {
              required: "Password required",
              minLength: { value: 6, message: "Minimum 6 characters" }
            })}
            placeholder="Enter password"
          />
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div className="mb-6">
          <label className="block mb-1">Confirm Password</label>
          <input
            type="password"
            className="w-full border p-2 rounded"
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: value =>
                value === watch("password") || "Passwords do not match"
            })}
            placeholder="Re-enter password"
          />
          {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>}
        </div>

        <button
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {isSubmitting ? "Signing up..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
}
