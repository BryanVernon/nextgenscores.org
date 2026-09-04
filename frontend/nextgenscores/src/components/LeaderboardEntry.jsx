import "./LeaderboardEntry.css";

const resultLabels = {
  correct: "Correct",
  incorrect: "Incorrect",
  pending: "Pending",
  unpicked: "No pick",
  tie: "Tie — no point",
};

export default function LeaderboardEntry({ entry, week }) {
  const results = entry.results;
  const counts = (results || []).reduce((totals, game) => {
    totals[game.result] = (totals[game.result] || 0) + 1;
    return totals;
  }, {});

  return <li className="participant-entry">
    <details className={entry.rank === 1 ? "participant-details participant-leader" : "participant-details"}>
      <summary className="participant-summary" aria-label={`View ${entry.name}'s Week ${week} picks: ${entry.correct} correct`}>
        <span className="participant-rank">#{entry.rank}</span>
        <strong>{entry.name}</strong>
        <span className="participant-score">{entry.correct} correct</span>
        <span className="participant-toggle"><span className="participant-show">View picks</span><span className="participant-hide">Hide picks</span><span aria-hidden="true">⌄</span></span>
      </summary>
      <div className="participant-breakdown">
        <h4>{entry.name}'s Week {week} picks</h4>
        {!Array.isArray(results) ? <p>Pick details are unavailable. Refresh this page after the backend update.</p> : <>
          <p className="participant-totals">{counts.correct || 0} correct · {counts.incorrect || 0} incorrect · {counts.pending || 0} pending · {counts.unpicked || 0} not picked{counts.tie ? ` · ${counts.tie} tied` : ""}</p>
          {entry.picks === 0 && <p>No picks submitted for this week.</p>}
          {results.length === 0 ? <p>No games available for this week.</p> : <ul className="participant-games">
            {results.map(game => <PickResultCard game={game} key={game.gameId} />)}
          </ul>}
        </>}
      </div>
    </details>
  </li>;
}

function PickResultCard({ game }) {
  const hasScore = game.homePoints != null && game.awayPoints != null;
  const spread = game.spread == null || game.spread === "" ? null : Number(game.spread);
  const total = game.overUnder == null || game.overUnder === "" ? null : Number(game.overUnder);
  const hasSpread = spread != null && Number.isFinite(spread);
  const hasTotal = total != null && Number.isFinite(total);

  return <li className={`participant-game participant-game-${game.result || "pending"}`}>
    <div className="participant-game-header">
      <span className="participant-game-status">{hasScore ? "Score posted" : "Awaiting result"}</span>
      <span className={`participant-result participant-result-${game.result}`}>{resultLabels[game.result] || "Pending"}</span>
    </div>
    <div className="participant-scoreboard" aria-label={`${game.awayTeam} at ${game.homeTeam}`}>
      {["away", "home"].map(side => <div key={side} className={`participant-team ${game.pick === side ? "participant-team-picked" : ""}`}>
        {game[`${side}Logo`] && <img className="participant-team-logo" src={game[`${side}Logo`]} alt="" onError={event => { event.currentTarget.style.display = "none"; }} />}
        <div className="participant-team-label"><small>{side === "away" ? "Away" : "Home"}</small><strong>{game[`${side}Team`]}</strong></div>
        {game.pick === side && <span className="participant-picked-tag">Picked</span>}
        <span className="participant-team-score" aria-label={`${game[`${side}Team`]} score ${game[`${side}Points`] ?? "pending"}`}>{game[`${side}Points`] ?? "—"}</span>
      </div>)}
    </div>
    {!game.pick && <span className="participant-no-pick">No pick submitted</span>}
    <div className="participant-betting">
      <dl>
        <div><dt>Spread · home</dt><dd>{hasSpread ? `${game.homeTeam} ${spread === 0 ? "PK" : `${spread > 0 ? "+" : ""}${spread}`}` : "Unavailable"}</dd></div>
        <div><dt>Over / Under</dt><dd>{hasTotal ? total : "Unavailable"}</dd></div>
      </dl>
    </div>
  </li>;
}
