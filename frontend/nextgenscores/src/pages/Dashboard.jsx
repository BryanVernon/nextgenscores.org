import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;  // wait until user is fetched
  if (!user) return <div>Please log in</div>; // fallback just in case

  return (
    <div style={{ padding: 20 }}>
      <h1>Welcome, {user.name}!</h1>
      <p>Favorite team: {user.favoriteTeam}</p>

      <h2>Your PickEm Pools (example)</h2>
      <p>Coming soon...</p>

      <button onClick={logout}>Logout</button>
    </div>
  );
}
