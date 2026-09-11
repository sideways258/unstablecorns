import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FONT_DISPLAY } from '../theme';

type Props = {
  gameStartedAt?: number;
};

// Always-on "how long has this game been going" clock, ticking up from the
// moment the match actually left the lobby (G.gameStartedAt, stamped once in
// initializeGame - the same server timestamp every viewer's clock is anchored
// to, same pattern as TurnTimer, so it doesn't drift out of sync).
//
// Rendered inside Board's own Wrapper (absolutely positioned, right above the
// TurnOrderPanel/neigh-count column) rather than as a top-level fixed overlay
// - that keeps it correctly aligned with that column even when the board is
// scaled down (mobile), which a viewport-fixed element can't guarantee.
const GameTimer = ({ gameStartedAt }: Props) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!gameStartedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [gameStartedAt]);

  if (!gameStartedAt) return null;

  const elapsed = Math.max(0, Math.floor((now - gameStartedAt) / 1000));
  const hh = Math.floor(elapsed / 3600);
  const mm = Math.floor((elapsed % 3600) / 60);
  const ss = elapsed % 60;
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  const display = hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;

  return (
    <Pill title="How long this game has been going">
      <span role="img" aria-label="stopwatch">
        ⏱️
      </span>
      <b>{display}</b>
    </Pill>
  );
};

const Pill = styled.div`
  position: absolute;
  top: 60px;
  right: 6px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0.35em 0.6em;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.6);
  color: #fff;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: 9.5pt;
  white-space: nowrap;
  background: rgba(20, 12, 34, 0.72);
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.28), 0 8px 18px rgba(0, 0, 0, 0.3);

  & b {
    font-variant-numeric: tabular-nums;
  }
`;

export default GameTimer;
