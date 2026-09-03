import { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Screen, Panel, PanelTitle, Button } from './ui/themed';
import BackButton from './ui/BackButton';
import { COLORS, isValidLobbyCode, normalizeLobbyCode } from './theme';

// Must match UnstableUnicorns.name in ./game/game.
const GAME_NAME = 'unstable_unicorns';

type RouteParam = { code?: string };
type State = 'looking' | 'notfound' | 'bad';

// "/join/:code" - asks the server how many players the lobby has (the joiner
// never sets that) via the boardgame.io lobby REST API, then forwards to the
// seat picker. Retries until the host has opened the lobby.
const JoinResolver = () => {
  const history = useHistory();
  const { code: rawCode } = useParams<RouteParam>();
  const code = normalizeLobbyCode(rawCode || '');

  const [state, setState] = useState<State>(isValidLobbyCode(code) ? 'looking' : 'bad');

  const lookup = useCallback(async () => {
    try {
      const res = await fetch(`${window.location.origin}/games/${GAME_NAME}/${encodeURIComponent(code)}`);
      if (!res.ok) {
        setState('notfound');
        return;
      }
      const data = await res.json();
      const count = Array.isArray(data?.players) ? data.players.length : 0;
      if (count >= 2 && count <= 8) {
        history.replace(`/${code}/${count}`);
        return;
      }
      setState('notfound');
    } catch (e) {
      setState('notfound');
    }
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
            <p style={{ color: COLORS.textMuted }}>Looking up the lobby.</p>
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
