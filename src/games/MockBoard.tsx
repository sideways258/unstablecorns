import { useState } from 'react';
import styled from 'styled-components';
import { BOARD_BG, COLORS, FONT_DISPLAY, GRADIENTS } from '../theme';
import { MOCK_KIND_COLORS } from './mockCards';
import type { MockGameState } from './mockGame';
import GameEnded from '../ui/GameEnded';
import LobbyView from '../ui/LobbyView';
import { buildRoster } from '../ui/lobbyRoster';

type Props = {
  G: MockGameState;
  ctx: any;
  moves: any;
  playerID: string | null;
  matchID?: string;
  gameId?: string;
  gameName?: string;
  matchData?: any[];
  gameMetadata?: any[];
};

// Generic board shared by every mock game. A real game ships its own board;
// this one just renders hands / table / log so the plumbing is visible.
const MockBoard = (props: Props) => {
  const { G, ctx, moves, playerID, matchID, gameId } = props;
  const [copied, setCopied] = useState(false);
  const [lobbyName, setLobbyName] = useState('');
  const [nameSaved, setNameSaved] = useState(false);

  if (ctx.gameover) {
    const winner = ctx.gameover.winner;
    return (
      <GameEnded
        icon={winner !== undefined ? '🏆' : '🚪'}
        title={winner !== undefined ? `Player ${winner} wins!` : 'Game over'}
        message={winner !== undefined ? 'They emptied their hand first.' : 'The host ended the game.'}
      />
    );
  }

  // --- Lobby phase: name + ready-up, same shape as Unstable Unicorns ---
  if (ctx.phase === 'lobby') {
    const matchData = props.matchData || props.gameMetadata;
    const seatIds = Object.keys(G.ready);
    const readyCount = seatIds.filter((id) => G.ready[id] === true).length;
    const roster = buildRoster({
      seatIds,
      playerID,
      matchData,
      nameFor: (id) => (G.names[id] && G.names[id].trim() ? G.names[id] : undefined),
      readyFor: (id) => G.ready[id] === true,
    });
    const isReady = playerID != null && G.ready[playerID] === true;

    return (
      <LobbyView
        gameName={props.gameName || 'Game'}
        matchID={matchID}
        gameId={gameId}
        numPlayers={ctx.numPlayers}
        backTo={
          playerID === '0' || !(gameId && matchID) ? '/' : `/${gameId}/${matchID}/${ctx.numPlayers}`
        }
        players={roster}
        readyCount={readyCount}
        nameValue={lobbyName}
        onNameChange={(v) => {
          setLobbyName(v);
          setNameSaved(false);
        }}
        onSaveName={() => {
          moves.setName(lobbyName);
          setNameSaved(true);
        }}
        nameSaved={nameSaved}
        isReady={isReady}
        onReadyClick={() => moves.toggleReady()}
        readyHint={
          isReady
            ? 'Tap again to unready. The game starts once everyone is ready.'
            : 'The game starts once everyone is ready.'
        }
      />
    );
  }

  const isMyTurn = playerID != null && ctx.currentPlayer === playerID;
  const myHand = playerID != null ? G.hands[playerID] || [] : [];
  const seats = Object.keys(G.hands);

  const inviteLink =
    gameId && matchID ? `${window.location.origin}/${gameId}/${matchID}/${seats.length}` : '';

  const copyInvite = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {}
    );
  };

  return (
    <Screen>
      <TopBar>
        {matchID && (
          <Chip>
            Lobby <b>{matchID}</b>
          </Chip>
        )}
        {inviteLink && (
          <Chip as="button" onClick={copyInvite}>
            {copied ? 'Link copied' : 'Copy invite link'}
          </Chip>
        )}
        <Chip>Draw pile: {G.drawPile.length}</Chip>
        <TurnPill $me={isMyTurn}>{isMyTurn ? 'Your turn' : `Player ${ctx.currentPlayer}'s turn`}</TurnPill>
      </TopBar>

      <Middle>
        <TableArea>
          <SectionLabel>Play area</SectionLabel>
          <CardRow>
            {G.table.length === 0 && <Empty>No cards played yet.</Empty>}
            {G.table.map((entry, idx) => (
              <MiniCard key={idx} card={G.cards[entry.cardId]} footer={`by P${entry.by}`} />
            ))}
          </CardRow>

          <SeatRow>
            {seats.map((s) => (
              <Seat key={s} $current={s === ctx.currentPlayer}>
                P{s}
                <span>{G.hands[s].length} cards</span>
              </Seat>
            ))}
          </SeatRow>
        </TableArea>

        <LogArea>
          <SectionLabel>Log</SectionLabel>
          {G.log.length === 0 && <Empty>Nothing yet.</Empty>}
          {G.log.slice(0, 12).map((line, i) => (
            <LogLine key={i}>{line}</LogLine>
          ))}
        </LogArea>
      </Middle>

      <HandArea>
        <SectionLabel>
          {playerID != null ? `Your hand (P${playerID})` : 'Spectating'}
        </SectionLabel>
        <CardRow>
          {myHand.length === 0 && <Empty>Empty hand.</Empty>}
          {myHand.map((cardId, idx) => (
            <PlayCard
              key={`${cardId}-${idx}`}
              card={G.cards[cardId]}
              disabled={!isMyTurn}
              onClick={() => isMyTurn && moves.playCard(cardId)}
            />
          ))}
        </CardRow>
        <Actions>
          <ActionButton disabled={!isMyTurn || G.drawPile.length === 0} onClick={() => moves.drawCard()}>
            Draw card
          </ActionButton>
          <ActionButton disabled={!isMyTurn} onClick={() => moves.endTurn()}>
            End turn
          </ActionButton>
        </Actions>
      </HandArea>
    </Screen>
  );
};

// --- card renderers ---------------------------------------------------------

const kindColor = (card: any): string =>
  card ? MOCK_KIND_COLORS[card.kind as keyof typeof MOCK_KIND_COLORS] || '#888' : '#888';

const cardInner = (card: any) => (
  <>
    <CardKind style={{ background: kindColor(card) }}>{card ? card.kind : '?'}</CardKind>
    <CardTitle>{card ? card.title : 'Unknown'}</CardTitle>
    <CardText>{card ? card.text : ''}</CardText>
  </>
);

const MiniCard = ({ card, footer }: { card: any; footer?: string }) => (
  <DisplayCard style={{ borderColor: kindColor(card) }}>
    {cardInner(card)}
    {footer && <CardFooter>{footer}</CardFooter>}
  </DisplayCard>
);

const PlayCard = ({ card, disabled, onClick }: { card: any; disabled?: boolean; onClick: () => void }) => (
  <HandCard disabled={disabled} onClick={onClick} style={{ borderColor: kindColor(card) }}>
    {cardInner(card)}
  </HandCard>
);

// --- styles ---------------------------------------------------------------

const Screen = styled.div`
  min-height: 100vh;
  width: 100%;
  box-sizing: border-box;
  background: ${GRADIENTS.page};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: clamp(56px, 15vw, 68px) clamp(10px, 4vw, 16px) 24px;
  padding-left: max(clamp(10px, 4vw, 16px), env(safe-area-inset-left));
  padding-right: max(clamp(10px, 4vw, 16px), env(safe-area-inset-right));
  font-family: 'Open Sans', sans-serif;
  color: #fff;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url(${BOARD_BG});
    background-size: cover;
    opacity: 0.05;
    mix-blend-mode: overlay;
    pointer-events: none;
  }
`;

const TopBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: center;
`;

const Chip = styled.div`
  background: ${COLORS.panel};
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 999px;
  padding: 0.4em 0.9em;
  font-size: 10pt;
  color: #fff;
  cursor: default;
`;

const TurnPill = styled.div<{ $me: boolean }>`
  border-radius: 999px;
  padding: 0.45em 1em;
  font-weight: 800;
  font-size: 10pt;
  background: ${(p) => (p.$me ? '#fff' : 'transparent')};
  color: ${(p) => (p.$me ? COLORS.panelSolid : '#fff')};
  border: 2px solid #fff;
`;

const Middle = styled.div`
  display: flex;
  gap: 18px;
  width: 100%;
  max-width: 1100px;
  flex-wrap: wrap;
`;

const panel = `
  position: relative;
  background: ${COLORS.panel};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid ${COLORS.panelBorder};
  border-radius: 18px;
  padding: 1.2em;
  box-shadow: 0 18px 50px rgba(0,0,0,0.4);
`;

const TableArea = styled.div`
  ${panel}
  flex: 1 1 320px;
  min-width: 0;
`;

const LogArea = styled.div`
  ${panel}
  flex: 1 1 220px;
  min-width: 0;
  max-width: 320px;

  @media (max-width: 720px) {
    max-width: none;
  }
`;

const HandArea = styled.div`
  ${panel}
  width: 100%;
  max-width: 1100px;
`;

const SectionLabel = styled.div`
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 9pt;
  opacity: 0.8;
  margin-bottom: 0.7em;
`;

const CardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const cardBase = `
  width: clamp(124px, 42vw, 150px);
  min-height: 120px;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid #888;
  border-radius: 12px;
  padding: 0.7em;
  text-align: left;
  color: #fff;
  font: inherit;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DisplayCard = styled.div`
  ${cardBase}
`;

const HandCard = styled.button`
  ${cardBase}
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
  &:not(:disabled):hover {
    transform: translateY(-8px) rotate(-1deg);
    background: rgba(255, 255, 255, 0.16);
    box-shadow: 0 16px 30px rgba(0, 0, 0, 0.4);
  }
  &:not(:disabled):active {
    transform: translateY(-2px);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const CardKind = styled.span`
  align-self: flex-start;
  text-transform: uppercase;
  font-size: 7pt;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: 6px;
  color: #fff;
`;

const CardTitle = styled.div`
  font-weight: 800;
  font-size: 10pt;
`;

const CardText = styled.div`
  font-size: 8.5pt;
  opacity: 0.85;
  flex: 1;
`;

const CardFooter = styled.div`
  font-size: 7.5pt;
  opacity: 0.7;
`;

const SeatRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 1em;
`;

const Seat = styled.div<{ $current: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid ${(p) => (p.$current ? '#fff' : 'rgba(255,255,255,0.35)')};
  border-radius: 10px;
  padding: 0.4em 0.8em;
  font-weight: 800;
  font-size: 10pt;
  span {
    font-weight: 400;
    font-size: 8pt;
    opacity: 0.8;
  }
`;

const LogLine = styled.div`
  font-size: 9pt;
  padding: 2px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
`;

const Empty = styled.div`
  font-size: 9pt;
  opacity: 0.6;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 1em;
`;

const ActionButton = styled.button`
  padding: 0.7em 1.4em;
  border-radius: 12px;
  border: none;
  background: ${GRADIENTS.hero};
  color: #fff;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: 11pt;
  cursor: pointer;
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.28);
  transition: transform 0.08s ease, box-shadow 0.1s ease;
  &:not(:disabled):active {
    transform: translateY(4px);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.28);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export default MockBoard;
