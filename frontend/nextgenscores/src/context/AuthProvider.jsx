import { useEffect, useState } from "react";
import axios from "../api";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchUser() {
      if (localStorage.getItem("ngs-signed-out") === "true") {
        setLoading(false);
        return;
      }
      setLoading(true);
      setAuthError("");
      try {
        const res = await axios.get("/auth/me", { signal: controller.signal, timeout: 12000 });
        if (!controller.signal.aborted) setUser(res.data.user);
      } catch (error) {
        if (controller.signal.aborted) return;
        setUser(null);
        if (![401, 403].includes(error.response?.status)) {
          setAuthError("We couldn't check your account. Please try again, or browse the scores while we reconnect.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchUser();
    return () => controller.abort();
  }, [attempt]);

  const retryAuth = () => setAttempt(current => current + 1);
  const logout = async () => {
    // Keep a failed cookie-clearing request from signing this browser back in.
    localStorage.setItem("ngs-signed-out", "true");
    localStorage.removeItem("ngs_session_token");
    sessionStorage.removeItem("ngs_session_token");
    setUser(null);
    setAuthError("");
    try {
      await axios.post("/auth/logout", {}, { timeout: 12000 });
    } catch (error) {
      console.error("Unable to clear the server session", error);
    }
  };

  return <AuthContext.Provider value={{ user, setUser, logout, loading, authError, retryAuth }}>{children}</AuthContext.Provider>;
}
