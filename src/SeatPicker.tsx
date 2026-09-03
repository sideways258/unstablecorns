import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Screen, Panel, PanelTitle, PanelSubtitle, Button } from './ui/themed';
import BackButton from './ui/BackButton';
import { COLORS, isValidLobbyCode, normalizeLobbyCode } from './theme';

type RouteParam = { matchID?: string; numPlayers?: string };

// Shown at "/:code/:numPlayers" - pick which seat you are before entering the
// pregame lobby. The host shares "<origin>/<code>/<numPlayers>" and each player
// opens it and taps a different number.
const SeatPicker = () => {
  const history = useHistory();
  const { matchID, numPlayers } = useParams<RouteParam>();
  const [copied, setCopied] = useState(false);

  const code = normalizeLobbyCode(matchID || '');
  const count = parseInt(numPlayers || '0', 10);

  // Keep everyone on the same canonical (upper-case) code.
  useEffect(() => {
    if (matchID && matchID !== code && isValidLobbyCode(code)) {
      history.replace(`/${code}/${count}`);
    }
  }, [matchID, code, count, history]);

  if (!isValidLobbyCode(code) || !(count >= 2 && count <= 8)) {
    return (
      <Screen>
        <BackButton />
        <Panel>
          <PanelTitle>Bad lobby link</PanelTitle>
          <p style={{ color: COLORS.textMuted }}>That lobby code or player count doesn't look right.</p>
          <Button onClick={() => history.push('/')}>Back to home</Button>
        </Panel>
      </Screen>
    );
  }

  const inviteLink = `${window.location.origin}/${code}/${count}`;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      /* clipboard blocked - the link is on screen anyway */
    }
  };

  return (
    <Screen>
      <BackButton />
      <Panel>
        <PanelTitle>Lobby {code}</PanelTitle>
        <p style={{ color: COLORS.textMuted, margin: '0 0 0.4em' }}>
          Share the code <strong style={{ color: COLORS.text }}>{code}</strong> ({count} players), or send the invite
          link:
        </p>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '11pt',
            background: COLORS.inputBg,
            padding: '0.7em 0.9em',
            borderRadius: 8,
            wordBreak: 'break-all',
            marginBottom: '0.6em',
          }}
        >
          {inviteLink}
        </div>
        <Button $variant="ghost" onClick={copyInvite}>
          {copied ? 'Copied!' : 'Copy invite link'}
        </Button>

        <PanelSubtitle>Take a seat</PanelSubtitle>
        <p style={{ color: COLORS.textMuted, marginTop: 0, fontSize: '11pt' }}>
          Pick a free number. Seat 0 is the host. If two of you clash, one just picks again.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {Array.from({ length: count }, (_, i) => {
            const isHostSeat = i === 0;
            return (
              <button
                key={i}
                disabled={isHostSeat}
                onClick={() => history.push(`/${code}/${count}/${i}`)}
                style={{
                  padding: '1em 0',
                  borderRadius: 10,
                  border: `2px solid ${COLORS.text}`,
                  background: 'transparent',
                  color: COLORS.text,
                  fontWeight: 800,
                  fontSize: '16pt',
                  cursor: isHostSeat ? 'not-allowed' : 'pointer',
                  opacity: isHostSeat ? 0.45 : 1,
                }}
              >
                {i}
                {isHostSeat && <div style={{ fontSize: '8pt', fontWeight: 700 }}>HOST</div>}
              </button>
            );
          })}
        </div>
      </Panel>
    </Screen>
  );
};

export default SeatPicker;
