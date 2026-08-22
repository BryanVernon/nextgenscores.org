export default function LoadingScreen({ message = "Getting your scores ready" }) {
  return (
    <main className="loading-screen" aria-live="polite" aria-busy="true">
      <div className="loading-card">
        <span className="loading-mark" aria-hidden="true"><i /></span>
        <p className="eyebrow">NextGenScores</p>
        <h1>{message}</h1>
        <p>Loading your game day experience.</p>
      </div>
    </main>
  );
}
