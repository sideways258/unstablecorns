import { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Screen, Panel, PanelTitle, Button } from './ui/themed';
import BackButton from './ui/BackButton';
import { COLORS, isValidLobbyCode, normalizeLobbyCode } from './theme';
import { GAMES } from './games/registry';

type RouteParam = { code?: string };
type State = 'looking' | 'notfound' | 'bad';

// "/join/:code" - finds which game the lobby belongs to and how many players it
// has by querying the boardgame.io lobby REST API for each registered game, then
// forwards to that game's seat picker. Retries until the host opens the lobby.
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
    // The host may open the lobby a moment after the joiner - keep checking.
    const timer = setInterval(lookup, 3000);
    return () => clearInterval(timer);
  }, [state, lookup]);

  return (
    <Screen>
      <BackButton />
      <Panel>
        {state === 'bad' && (
          <>
            <PanelTitle>Bad lobby code</PanelTitle>
            <p style={{ color: COLORS.textMuted }}>That code doesn&rsquo;t look right.</p>
            <Button onClick={() => history.push('/')}>Back to home</Button>
          </>
        )}
        {state === 'looking' && (
          <>
            <PanelTitle>Joining {code}&hellip;</PanelTitle>
            <p style={{ color: COLORS.textMuted }}>Finding the lobby.</p>
          </>
        )}
        {state === 'notfound' && (
          <>
            <PanelTitle>Lobby {code} isn&rsquo;t open yet</PanelTitle>
            <p style={{ color: COLORS.textMuted }}>
              Ask the host to open it, or use their invite link. This page keeps checking automatically.
            </p>
            <Button $variant="ghost" onClick={lookup}>
              Try again now
            </Button>
          </>
        )}
      </Panel>
    </Screen>
  );
};

export default JoinResolver;
