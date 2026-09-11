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
  position: fixed;
  top: 106px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5400;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.4em 0.9em;
  border-radius: 999px;
  border: 2px solid #fff;
  color: #fff;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: 11pt;
  white-space: nowrap;
  background: rgba(20, 12, 34, 0.72);
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.28), 0 12px 26px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  & b {
    font-variant-numeric: tabular-nums;
  }
`;

export default GameTimer;
