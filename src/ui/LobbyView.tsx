import { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import BackButton from './BackButton';
import { Panel, PanelSubtitle, Field, Button, CodeDisplay } from './themed';
import { COLORS, FONT_DISPLAY, GRADIENTS } from '../theme';
import type { RosterEntry } from './lobbyRoster';

type Props = {
  gameName: string;
  matchID?: string;
  gameId?: string;
  numPlayers: number;
  backTo: string;

  players: RosterEntry[];
  readyCount: number;

  nameValue: string;
  onNameChange: (v: string) => void;
  onSaveName: () => void;
  nameSaved?: boolean;

  isReady: boolean;
  onReadyClick: () => void;
  readyDisabled?: boolean;
  readyHint?: string;

  /** Game-specific section (e.g. Unstable Unicorns baby-unicorn picker). */
  children?: ReactNode;
};

const LobbyView = (props: Props) => {
  const inviteLink =
    props.gameId && props.matchID
      ? `${window.location.origin}/${props.gameId}/${props.matchID}/${props.numPlayers}`
      : '';

  const copyInvite = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(
      () => {},
      () => {}
    );
  };

  return (
    <Wrapper>
      <BackButton to={props.backTo} />
      <LobbyPanel>
        <Title>{props.gameName}</Title>

        {props.matchID && (
          <>
            <PanelSubtitle>Lobby code</PanelSubtitle>
            <CodeDisplay>{props.matchID}</CodeDisplay>
            {inviteLink && (
              <InviteRow>
                <LinkBox>{inviteLink}</LinkBox>
                <Button $variant="ghost" onClick={copyInvite} style={{ width: 'auto' }}>
                  Copy link
                </Button>
              </InviteRow>
            )}
          </>
        )}

        <PanelSubtitle>
          Players &middot; {props.readyCount}/{props.numPlayers} ready
        </PanelSubtitle>
        <Roster>
          {props.players.map((p) => {
            const tone: 'ready' | 'wait' | 'idle' = p.ready ? 'ready' : p.note ? 'wait' : 'idle';
            const label = p.ready ? 'Ready' : p.note || 'Not ready';
            return (
              <RosterRow key={p.id}>
                <Dot $on={p.connected} />
                <RName>
                  {p.name}
                  {p.isMe && <MeTag>you</MeTag>}
                </RName>
                <StatusPill $tone={tone}>
                  {tone === 'ready' ? '✓ ' : ''}
                  {label}
                </StatusPill>
              </RosterRow>
            );
          })}
          {props.players.length < props.numPlayers && (
            <Waiting>
              Waiting for {props.numPlayers - props.players.length} more player
              {props.numPlayers - props.players.length === 1 ? '' : 's'} to join&hellip;
            </Waiting>
          )}
        </Roster>

        <PanelSubtitle>Your name</PanelSubtitle>
        <InviteRow>
          <Field
            value={props.nameValue}
            onChange={(e) => props.onNameChange(e.target.value)}
            maxLength={24}
            placeholder="Your name"
            style={{ letterSpacing: 'normal' }}
          />
          <Button $variant="ghost" onClick={props.onSaveName} style={{ width: 'auto' }}>
            {props.nameSaved ? '✓ Saved' : 'Save'}
          </Button>
        </InviteRow>

        {props.children}

        {props.readyHint && <Hint>{props.readyHint}</Hint>}
        <ReadyButton
          $ready={props.isReady}
          disabled={props.readyDisabled}
          onClick={props.onReadyClick}
        >
          {props.isReady ? 'Waiting for others…' : "I'm ready!"}
        </ReadyButton>
      </LobbyPanel>
    </Wrapper>
  );
};

// --- styles --------------------------------------------------------------

const Wrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: ${GRADIENTS.page};
  position: relative;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  padding: 72px 16px 40px;
  box-sizing: border-box;
  font-family: 'Open Sans', sans-serif;
`;

const LobbyPanel = styled(Panel)`
  max-width: 720px;
`;

const Title = styled.h1`
  margin: 0 0 0.3em;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: clamp(23px, 6.5vw, 32px);
`;

const InviteRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: stretch;
  flex-wrap: wrap;
  margin-top: 8px;

  & > * {
    min-height: 46px;
  }
  & > *:first-child {
    flex: 1 1 min(220px, 100%);
  }
`;

const LinkBox = styled.div`
  font-family: 'Open Sans', monospace;
  font-size: 10.5pt;
  background: rgba(0, 0, 0, 0.25);
  border: 1.5px solid ${COLORS.panelBorder};
  padding: 0.75em 0.9em;
  border-radius: 12px;
  word-break: break-all;
  display: flex;
  align-items: center;
`;

const Hint = styled.p`
  color: ${COLORS.textMuted};
  font-size: 10.5pt;
  margin: 12px 0 0;
`;

const Roster = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
`;

const RosterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.55em 0.8em;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid ${COLORS.panelBorder};
`;

const Dot = styled.span<{ $on: boolean }>`
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${(p) => (p.$on ? '#37d9a0' : 'rgba(255,255,255,0.3)')};
  box-shadow: ${(p) => (p.$on ? '0 0 8px #37d9a0' : 'none')};
`;

const RName = styled.span`
  flex: 1;
  min-width: 0;
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: 12pt;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MeTag = styled.span`
  margin-left: 6px;
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${COLORS.accentC};
`;

const StatusPill = styled.span<{ $tone: 'ready' | 'wait' | 'idle' }>`
  flex: none;
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: 9.5pt;
  padding: 3px 10px;
  border-radius: 999px;
  color: #fff;
  background: ${(p) =>
    p.$tone === 'ready'
      ? 'linear-gradient(135deg, #4ade80, #148f4b)'
      : p.$tone === 'wait'
      ? 'linear-gradient(135deg, #ffcf5c, #e0961a)'
      : 'rgba(255,255,255,0.16)'};
`;

const Waiting = styled.div`
  font-size: 9.5pt;
  color: ${COLORS.textMuted};
  padding: 0.3em 0.2em 0;
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 8px 0 rgba(0,0,0,0.28), 0 0 0 0 rgba(55,217,160,0.5); }
  50% { box-shadow: 0 8px 0 rgba(0,0,0,0.28), 0 0 0 12px rgba(55,217,160,0); }
`;

const ReadyButton = styled.button<{ $ready: boolean }>`
  display: block;
  width: 100%;
  min-height: 52px;
  margin-top: 18px;
  padding: 0.95em 1em;
  border: none;
  border-radius: 14px;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: 15pt;
  color: #fff;
  cursor: pointer;
  background: ${(p) => (p.$ready ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg, #37d9a0, #1f9c74)')};
  box-shadow: 0 8px 0 rgba(0, 0, 0, 0.28);
  animation: ${(p) => (p.$ready ? 'none' : pulse)} 1.8s ease-in-out infinite;
  transition: transform 0.08s ease;

  &:active {
    transform: translateY(6px);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.28);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    animation: none;
    transform: none;
  }
`;

export default LobbyView;
