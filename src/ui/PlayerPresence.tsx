import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { FONT_DISPLAY } from '../theme';

type Seat = { id: number | string; name?: string; isConnected?: boolean };
type Toast = { key: number; text: string; kind: 'left' | 'back' };

// Watches the per-seat connection info boardgame.io passes to the board and pops
// a toast when someone drops out of / rejoins the room. Rendered once, alongside
// every game board (see Client.tsx), so it also covers the pregame lobby.
const PlayerPresence = (props: any) => {
  const data: Seat[] | undefined = props.matchData || props.gameMetadata;
  const myId = props.playerID != null ? String(props.playerID) : null;

  const prev = useRef<Record<string, boolean> | null>(null);
  const everConnected = useRef<Set<string>>(new Set());
  const nextKey = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const nameFor = (id: string): string => {
    const gp =
      props.G && Array.isArray(props.G.players) ? props.G.players[Number(id)] : undefined;
    if (gp && typeof gp.name === 'string' && gp.name.trim()) return gp.name;
    const seat = Array.isArray(data) ? data.find((s) => String(s.id) === id) : undefined;
    if (seat && seat.name && seat.name.trim()) return seat.name;
    return `Player ${id}`;
  };

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) return;

    const current: Record<string, boolean> = {};
    data.forEach((s) => {
      current[String(s.id)] = !!s.isConnected;
    });

    // First observation: remember it, announce nothing.
    if (prev.current == null) {
      prev.current = current;
      return;
    }

    const fresh: Toast[] = [];
    Object.keys(current).forEach((id) => {
      const was = prev.current![id];
      const now = current[id];
      if (was === now || id === myId) return;
      if (was === true && now === false) {
        fresh.push({ key: nextKey.current++, text: `${nameFor(id)} left the room`, kind: 'left' });
      } else if (was === false && now === true && everConnected.current.has(id)) {
        // only "reconnected" if we saw them connected in an earlier frame
        fresh.push({ key: nextKey.current++, text: `${nameFor(id)} reconnected`, kind: 'back' });
      }
    });

    // fold the frame we just diffed against into "everConnected"
    Object.keys(prev.current).forEach((id) => {
      if (prev.current![id]) everConnected.current.add(id);
    });
    prev.current = current;

    if (fresh.length) {
      setToasts((t) => [...t, ...fresh]);
      fresh.forEach((toast) => {
        setTimeout(() => setToasts((t) => t.filter((x) => x.key !== toast.key)), 4500);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, myId]);

  if (!Array.isArray(data)) return null;

  return (
    <Root>
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastPill
            key={t.key}
            $kind={t.kind}
            initial={{ opacity: 0, y: -18, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={{ duration: 0.22 }}
          >
            <span role="img" aria-label={t.kind === 'left' ? 'wave' : 'plug'}>
              {t.kind === 'left' ? '👋' : '🔌'}
            </span>
            {t.text}
          </ToastPill>
        ))}
      </AnimatePresence>
    </Root>
  );
};

const Root = styled.div`
  position: fixed;
  top: max(14px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  z-index: 6000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: calc(100vw - 24px);
  pointer-events: none;
`;

const ToastPill = styled(motion.div)<{ $kind: 'left' | 'back' }>`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: 11pt;
  color: #fff;
  max-width: 100%;
  text-align: center;
  padding: 0.6em 1.15em;
  border-radius: 18px;
  border: 2px solid #fff;
  box-shadow: 0 7px 0 rgba(0, 0, 0, 0.28), 0 14px 30px rgba(0, 0, 0, 0.35);
  background: ${(p) =>
    p.$kind === 'left'
      ? 'linear-gradient(135deg, #ff6b6b, #c81d25)'
      : 'linear-gradient(135deg, #4ade80, #148f4b)'};

  & > span {
    font-size: 1.1em;
    line-height: 1;
  }
`;

export default PlayerPresence;
