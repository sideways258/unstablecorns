import { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { FONT_DISPLAY } from '../theme';

// Persistent countdown for the current turn, shown to everyone once the host has
// switched the turn timer on. Any client whose countdown hits zero nudges the
// server (forceEndTurnOnTimeout) - the move is guarded, so duplicate nudges from
// several clients are harmless.
const TurnTimer = (props: any) => {
  const tt = props.G && props.G.turnTimer;
  const ctx = props.ctx;
  const [now, setNow] = useState(() => Date.now());
  const lastFire = useRef(0);

  const active =
    !!tt &&
    tt.enabled === true &&
    !!tt.turnStartedAt &&
    !!ctx &&
    ctx.phase === 'main' &&
    !ctx.gameover;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const remaining = tt.turnStartedAt + tt.durationSec * 1000 - now;
    // Retry every few seconds until the turn actually flips (which moves
    // turnStartedAt forward and makes `remaining` positive again). The server
    // move is guarded, so an early / duplicate nudge is a harmless no-op.
    if (remaining <= 0 && Date.now() - lastFire.current > 4000) {
      lastFire.current = Date.now();
      try {
        if (props.moves && props.moves.forceEndTurnOnTimeout) {
          props.moves.forceEndTurnOnTimeout();
        }
      } catch (e) {
        /* another client got there first */
      }
    }
  }, [active, now, tt, props.moves]);

  if (!active) return null;

  const remaining = Math.max(0, tt.turnStartedAt + tt.durationSec * 1000 - now);
  const secs = Math.ceil(remaining / 1000);
  const mm = Math.floor(secs / 60);
  const ss = secs % 60;
  const danger = secs <= 20;

  return (
    <Pill $danger={danger}>
      <span role="img" aria-label="timer">
        ⏱
      </span>
      <b>
        {mm}:{ss < 10 ? '0' : ''}
        {ss}
      </b>
      <small>turn timer</small>
    </Pill>
  );
};

const pulse = keyframes`
  0%, 100% { transform: translateX(-50%) scale(1); }
  50%      { transform: translateX(-50%) scale(1.05); }
`;

const Pill = styled.div<{ $danger: boolean }>`
  position: fixed;
  top: 54px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.4em 0.9em;
  border-radius: 16px;
  border: 2px solid #fff;
  color: #fff;
  font-family: ${FONT_DISPLAY};
  pointer-events: none;
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.28), 0 12px 26px rgba(0, 0, 0, 0.35);
  background: ${(p) =>
    p.$danger
      ? 'linear-gradient(135deg, #ff6b6b, #c81d25)'
      : 'linear-gradient(135deg, #7c5cff, #4b2fb5)'};
  animation: ${(p) => (p.$danger ? pulse : 'none')} 1s ease-in-out infinite;

  & > span[role='img'] {
    font-size: 1.05em;
    line-height: 1;
  }
  & b {
    font-size: 14pt;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  & small {
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.85;
  }
`;

export default TurnTimer;
