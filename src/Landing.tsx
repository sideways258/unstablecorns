import { useState } from "react";
import { useHistory } from "react-router-dom";

// Shown at "/" (and any non-game URL). Also doubles as a deploy sanity check:
// if you can see this page, the front-end build is being served correctly.
const Landing = () => {
  const history = useHistory();
  const [matchID, setMatchID] = useState("hello-world");
  const [numPlayers, setNumPlayers] = useState("6");
  const [playerID, setPlayerID] = useState("0");

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    history.push(`/${encodeURIComponent(matchID || "hello-world")}/${numPlayers}/${playerID}`);
  };

  const shareBase = `${window.location.origin}/${matchID || "hello-world"}/${numPlayers}`;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560, margin: "10vh auto", padding: "0 20px", lineHeight: 1.5 }}>
      <h1>Unstable Unicorns</h1>
      <p>Enter a match name, pick the player count, and choose which seat you are (0-based).</p>
      <form onSubmit={go} style={{ display: "grid", gap: 12, margin: "24px 0" }}>
        <label>Match name
          <input value={matchID} onChange={e => setMatchID(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 4 }} />
        </label>
        <label>Number of players
          <select value={numPlayers} onChange={e => setNumPlayers(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 4 }}>
            {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Your player ID
          <select value={playerID} onChange={e => setPlayerID(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 4 }}>
            {Array.from({ length: parseInt(numPlayers, 10) }, (_, i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
        <button type="submit" style={{ padding: 10, cursor: "pointer" }}>Join game</button>
      </form>
      <p style={{ fontSize: 14, color: "#666" }}>
        Share with friends &mdash; each person opens the same link with a different player ID:<br />
        <code>{shareBase}/PLAYER_ID</code>
      </p>
    </div>
  );
};

export default Landing;
