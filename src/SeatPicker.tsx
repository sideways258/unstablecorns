import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Screen, Panel, PanelTitle, PanelSubtitle, Button, CodeDisplay } from './ui/themed';
import BackButton from './ui/BackButton';
import { COLORS, FONT_DISPLAY, isValidLobbyCode, normalizeLobbyCode } from './theme';
import { getGameById } from './games/registry';

type RouteParam = { gameId?: string; matchID?: string; numPlayers?: string };

const SeatPicker = () => {
  const history = useHistory();
  const { gameId, matchID, numPlayers } = useParams<RouteParam>();
  const [copied, setCopied] = useState(false);

  const game = getGameById(gameId);
  const code = normalizeLobbyCode(matchID || '');
  const count = parseInt(numPlayers || '0', 10);

  useEffect(() => {
    if (game && matchID && matchID !== code && isValidLobbyCode(code)) {
      history.replace(`/${game.id}/${code}/${count}`);
    }
  }, [game, matchID, code, count, history]);

  const badLink =
    !game || !isValidLobbyCode(code) || !(count >= game.minPlayers && count <= game.maxPlayers);

  if (badLink) {
    return (
      <Screen>
        <BackButton />
        <Panel>
          <PanelTitle>Bad lobby link 🤔</PanelTitle>
          <p style={{ color: COLORS.textMuted }}>
            That game, lobby code or player count doesn&rsquo;t look right.
          </p>
          <Button onClick={() => history.push('/')}>Back to home</Button>
        </Panel>
      </Screen>
    );
  }

  const inviteLink = `${window.location.origin}/${game.id}/${code}/${count}`;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      /* clipboard blocked - the link is on screen anyway */
    }
  };

  return (
    <Screen>
      <BackButton />
      <Panel>
        <PanelTitle>
          {game.icon} {game.name}
        </PanelTitle>

        <PanelSubtitle>Lobby code</PanelSubtitle>
        <CodeDisplay>{code}</CodeDisplay>
        <Meta>{count} players · read the code out or share the link</Meta>
        <LinkBox>{inviteLink}</LinkBox>
        <Button $variant="ghost" onClick={copyInvite}>
          {copied ? '✓ Copied!' : 'Copy invite link'}
        </Button>

        <PanelSubtitle>Take a seat</PanelSubtitle>
        <Hint>Pick a free number. Seat 0 is the host. If two of you clash, one just picks again.</Hint>
        <Seats>
          {Array.from({ length: count }, (_, i) => {
            const isHostSeat = i === 0;
            return (
              <Seat
                key={i}
                type="button"
                disabled={isHostSeat}
                $host={isHostSeat}
                whileHover={isHostSeat ? undefined : { y: -4, scale: 1.06 }}
                whileTap={isHostSeat ? undefined : { scale: 0.92 }}
                onClick={() => history.push(`/${game.id}/${code}/${count}/${i}`)}
              >
                <SeatNum>{i}</SeatNum>
                <SeatTag>{isHostSeat ? 'HOST' : 'JOIN'}</SeatTag>
              </Seat>
            );
          })}
        </Seats>
      </Panel>
    </Screen>
  );
};

const Meta = styled.div`
  color: ${COLORS.textMuted};
  font-size: 10pt;
  margin: 8px 0 10px;
`;

const LinkBox = styled.div`
  font-family: 'Open Sans', monospace;
  font-size: 10.5pt;
  background: rgba(0, 0, 0, 0.25);
  border: 1.5px solid ${COLORS.panelBorder};
  padding: 0.7em 0.9em;
  border-radius: 10px;
  word-break: break-all;
  margin-bottom: 10px;
`;

const Hint = styled.p`
  color: ${COLORS.textMuted};
  font-size: 10.5pt;
  margin: 0 0 12px;
`;

const Seats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(76px, 1fr));
  gap: 12px;
`;

const Seat = styled(motion.button)<{ $host: boolean }>`
  aspect-ratio: 1 / 1;
  border-radius: 18px;
  border: 2px solid ${(p) => (p.$host ? 'rgba(255,255,255,0.3)' : '#fff')};
  background: ${(p) =>
    p.$host ? 'rgba(255,255,255,0.05)' : 'linear-gradient(150deg, rgba(124,92,255,0.35), rgba(34,211,238,0.25))'};
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: ${(p) => (p.$host ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$host ? 0.5 : 1)};
`;

const SeatNum = styled.span`
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: 20pt;
  line-height: 1;
`;

const SeatTag = styled.span`
  font-family: ${FONT_DISPLAY};
  font-size: 7pt;
  font-weight: 600;
  letter-spacing: 0.12em;
  opacity: 0.8;
`;

export default SeatPicker;
