import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Screen, Panel, PanelTitle, Button, CodeDisplay } from './ui/themed';
import BackButton from './ui/BackButton';
import { COLORS, GRADIENTS, isValidLobbyCode, normalizeLobbyCode } from './theme';
import { GAMES } from './games/registry';

type RouteParam = { code?: string; matchID?: string };
type State = 'looking' | 'notfound' | 'full' | 'bad';

// Resolves a lobby code: finds which game it belongs to, then hands you the
// next free seat by order of joining. No seat picking.
const JoinResolver = () => {
  const history = useHistory();
  const params = useParams<RouteParam>();
  const code = normalizeLobbyCode(params.code || params.matchID || '');

  const [state, setState] = useState<State>(isValidLobbyCode(code) ? 'looking' : 'bad');
  const done = useRef(false);

  const lookup = useCallback(async () => {
    if (done.current) return;
    // tiny jitter so two people joining at the same instant are less likely to
    // read the same stale "free seat"
    await new Promise((r) => setTimeout(r, Math.random() * 600));
    if (done.current) return;

    for (const g of GAMES) {
      const serverName = g.bgGame && g.bgGame.name;
      if (!serverName) continue;
      try {
        const res = await fetch(
          `${window.location.origin}/games/${encodeURIComponent(serverName)}/${encodeURIComponent(code)}`
        );
        if (!res.ok) continue;
        const data = await res.json();
        const players: any[] = Array.isArray(data?.players) ? data.players : [];
        const count = players.length;
        if (!(count >= g.minPlayers && count <= g.maxPlayers)) continue;

        // lowest seat that nobody is currently connected to
        let seat = -1;
        for (let i = 0; i < count; i++) {
          const p = players.find((x) => String(x.id) === String(i));
          const taken = p ? p.isConnected === true : false;
          if (!taken) {
            seat = i;
            break;
          }
        }

        if (seat === -1) {
          setState('full');
          return;
        }
        done.current = true;
        history.replace(`/${g.id}/${code}/${count}/${seat}`);
        return;
      } catch (e) {
        /* try the next game */
      }
    }
    setState((s) => (s === 'full' ? s : 'notfound'));
  }, [code, history]);

  useEffect(() => {
    if (state === 'bad') return;
    lookup();
    const timer = setInterval(lookup, 3000);
    return () => clearInterval(timer);
  }, [state, lookup]);

  return (
    <Screen>
      <BackButton />
      <Panel>
        {state === 'bad' && (
          <>
            <PanelTitle>Bad lobby code 🤔</PanelTitle>
            <p style={{ color: COLORS.textMuted }}>That code doesn&rsquo;t look right.</p>
            <Button onClick={() => history.push('/')}>Back to home</Button>
          </>
        )}
        {state === 'looking' && (
          <>
            <PanelTitle>Joining lobby</PanelTitle>
            <CodeDisplay>{code}</CodeDisplay>
            <p style={{ color: COLORS.textMuted, textAlign: 'center' }}>Grabbing you a seat&hellip;</p>
            <Dots>
              <i />
              <i />
              <i />
            </Dots>
          </>
        )}
        {state === 'full' && (
          <>
            <PanelTitle>Lobby {code} is full</PanelTitle>
            <p style={{ color: COLORS.textMuted }}>Every seat is taken. This page keeps checking for an opening.</p>
            <Button $variant="ghost" onClick={lookup}>
              Check again now
            </Button>
          </>
        )}
        {state === 'notfound' && (
          <>
            <PanelTitle>Lobby {code} isn&rsquo;t open yet</PanelTitle>
            <p style={{ color: COLORS.textMuted }}>
              Ask the host to open it, or use their invite link. This page keeps checking automatically.
            </p>
            <Button $variant="ghost" onClick={lookup}>
              Check again now
            </Button>
          </>
        )}
      </Panel>
    </Screen>
  );
};

const bounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-10px); opacity: 1; }
`;

const Dots = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 22px 0 6px;

  i {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${GRADIENTS.hero};
    animation: ${bounce} 1.2s infinite ease-in-out;
  }
  i:nth-child(2) {
    animation-delay: 0.15s;
  }
  i:nth-child(3) {
    animation-delay: 0.3s;
  }
`;

export default JoinResolver;
