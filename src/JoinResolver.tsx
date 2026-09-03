import { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Screen, Panel, PanelTitle, Button, CodeDisplay } from './ui/themed';
import BackButton from './ui/BackButton';
import { COLORS, GRADIENTS, isValidLobbyCode, normalizeLobbyCode } from './theme';
import { GAMES } from './games/registry';

type RouteParam = { code?: string };
type State = 'looking' | 'notfound' | 'bad';

const JoinResolver = () => {
  const history = useHistory();
  const { code: rawCode } = useParams<RouteParam>();
  const code = normalizeLobbyCode(rawCode || '');

  const [state, setState] = useState<State>(isValidLobbyCode(code) ? 'looking' : 'bad');

  const lookup = useCallback(async () => {
    for (const g of GAMES) {
      const serverName = g.bgGame && g.bgGame.name;
      if (!serverName) continue;
      try {
        const res = await fetch(
          `${window.location.origin}/games/${encodeURIComponent(serverName)}/${encodeURIComponent(code)}`
        );
        if (!res.ok) continue;
        const data = await res.json();
        const count = Array.isArray(data?.players) ? data.players.length : 0;
        if (count >= g.minPlayers && count <= g.maxPlayers) {
          history.replace(`/${g.id}/${code}/${count}`);
          return;
        }
      } catch (e) {
        /* try the next game */
      }
    }
    setState('notfound');
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
            <PanelTitle>Finding your lobby</PanelTitle>
            <CodeDisplay>{code}</CodeDisplay>
            <Dots>
              <i />
              <i />
              <i />
            </Dots>
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
