import { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { FONT_DISPLAY } from '../theme';
import { playTick, useAudioSettings } from '../audio';

// How many seconds before zero the tick starts ramping up in volume.
const RAMP_SECS = 10;
const TICK_BASE_VOLUME = 0.25;
const TICK_MAX_VOLUME = 1;

// A clickable clock button (top-center) that the host uses to turn the turn
// timer on/off directly - no unlock requirement. Everyone sees the running
// countdown once it's on, and hears a ticking clock that gets gradually
// louder over the last 10 seconds. Any client whose countdown hits zero
// nudges the server (forceEndTurnOnTimeout) - the move is guarded, so
// duplicate nudges from several clients are harmless.
const TurnTimer = (props: any) => {
  const tt = props.G && props.G.turnTimer;
  const ctx = props.ctx;
  const isHost = String(props.playerID) === '0';
  const { volume: masterVolume, muted } = useAudioSettings();
  const [now, setNow] = useState(() => Date.now());
  const lastFire = useRef(0);

  const visible = !!tt && !!ctx && ctx.phase === 'main' && !ctx.gameover;
  const enabled = visible && tt.enabled === true && !!tt.turnStartedAt;

  useEffect(() => {
    if (!enabled) return;
    const tickOnce = () => {
      setNow(Date.now());
      if (muted || masterVolume <= 0) return;
      const remainingMs = tt.turnStartedAt + tt.durationSec * 1000 - Date.now();
      const secsLeft = Math.ceil(remainingMs / 1000);
      if (secsLeft <= 0) return;
      const ramp = Math.max(0, Math.min(1, (RAMP_SECS - secsLeft) / (RAMP_SECS - 1)));
      const tickVolume = (TICK_BASE_VOLUME + (TICK_MAX_VOLUME - TICK_BASE_VOLUME) * ramp) * masterVolume;
      playTick(tickVolume);
    };
    const id = setInterval(tickOnce, 1000);
    return () => clearInterval(id);
  }, [enabled, tt, masterVolume, muted]);

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, now, tt, props.moves]);

  if (!visible) return null;

  const toggle = () => {
    if (!isHost || !props.moves || !props.moves.setTurnTimer) return;
    props.moves.setTurnTimer({ enabled: !enabled });
  };

  if (!enabled) {
    return (
      <ClockButton
        type="button"
        disabled={!isHost}
        onClick={toggle}
        $interactive={isHost}
        title={isHost ? 'Start a turn timer' : undefined}
      >
        <span role="img" aria-label="clock">
          🕐
        </span>
      </ClockButton>
    );
  }

  const remaining = Math.max(0, tt.turnStartedAt + tt.durationSec * 1000 - now);
  const secs = Math.ceil(remaining / 1000);
  const mm = Math.floor(secs / 60);
  const ss = secs % 60;
  const danger = secs <= 20;

  return (
    <ClockButton
      type="button"
      disabled={!isHost}
      onClick={toggle}
      $interactive={isHost}
      $running
      $danger={danger}
      title={isHost ? 'Stop the turn timer' : undefined}
    >
      <span role="img" aria-label="clock">
        🕐
      </span>
      <b>
        {mm}:{ss < 10 ? '0' : ''}
        {ss}
      </b>
    </ClockButton>
  );
};

const pulse = keyframes`
  0%, 100% { transform: translateX(-50%) scale(1); }
  50%      { transform: translateX(-50%) scale(1.05); }
`;

const ClockButton = styled.button<{ $interactive?: boolean; $running?: boolean; $danger?: boolean }>`
  position: fixed;
  top: 54px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: ${(p) => (p.$running ? '0.4em 0.9em' : '0.5em')};
  border-radius: ${(p) => (p.$running ? '16px' : '999px')};
  border: 2px solid #fff;
  color: #fff;
  font-family: ${FONT_DISPLAY};
  cursor: ${(p) => (p.$interactive ? 'pointer' : 'default')};
  pointer-events: auto;
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.28), 0 12px 26px rgba(0, 0, 0, 0.35);
  background: ${(p) =>
    p.$danger
      ? 'linear-gradient(135deg, #ff6b6b, #c81d25)'
      : p.$running
      ? 'linear-gradient(135deg, #7c5cff, #4b2fb5)'
      : 'rgba(20, 12, 34, 0.72)'};
  animation: ${(p) => (p.$danger ? pulse : 'none')} 1s ease-in-out infinite;
  transition: background 0.15s ease, transform 0.08s ease;

  &:active {
    transform: ${(p) => (p.$interactive ? 'translateX(-50%) translateY(2px)' : 'translateX(-50%)')};
  }
  &:disabled {
    opacity: ${(p) => (p.$running ? 1 : 0.7)};
  }

  & > span[role='img'] {
    font-size: 1.2em;
    line-height: 1;
  }
  & b {
    font-size: 14pt;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
`;

export default TurnTimer;
