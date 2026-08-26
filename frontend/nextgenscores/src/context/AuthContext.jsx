import { createContext, useState, useEffect } from "react";
import axios from "../api"; // Axios instance with { withCredentials: true }

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // loading while checking login

  // On app load, check if user is already logged in
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await axios.get("/auth/me");
        setUser(res.data.user);
      } catch (_error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await axios.post("/auth/logout");
      localStorage.removeItem("ngs_session_token");
      sessionStorage.removeItem("ngs_session_token");
      setUser(null);
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
