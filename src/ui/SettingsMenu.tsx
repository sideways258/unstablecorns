import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { COLORS, FONT_DISPLAY } from '../theme';
import { useAudioSettings } from '../audio';
import { useBoardTheme, BOARD_THEMES } from '../boardTheme';

type Props = {
  isHost: boolean;
  onEndGame: () => void;
  /** Tell the game this player has left (removes their turn, stable and pending
   *  actions) before navigating away. */
  onLeave?: () => void;
  /** Present only for games that support the host turn timer. On/off is
   *  controlled by the clock button on the board itself; this menu only
   *  adjusts the duration. */
  turnTimer?: { enabled: boolean; durationSec: number };
  onSetTurnTimer?: (patch: { enabled?: boolean; durationSec?: number }) => void;
};

// Gear button (top-right of the board) that opens an on-screen settings panel.
// Houses the master volume control, and - for the lobby host only - the
// "end game for everyone" action.
const SettingsMenu = ({ isHost, onEndGame, onLeave, turnTimer, onSetTurnTimer }: Props) => {
  const history = useHistory();
  const { volume, muted, tavernMuted, setVolume, toggleMuted, toggleTavernMuted } = useAudioSettings();
  const { themeID, setThemeID } = useBoardTheme();
  const [open, setOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const speaker = muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔈' : '🔊';

  return (
    <Root>
      <IconButton
        title="Settings"
        onClick={() => {
          setOpen((o) => !o);
          setConfirmEnd(false);
          setConfirmLeave(false);
        }}
      >
        ⚙
      </IconButton>

      {open && (
        <Panel>
          <Header>
            <span>Settings</span>
            <CloseButton onClick={() => setOpen(false)}>✕</CloseButton>
          </Header>

          <SectionTitle>Volume</SectionTitle>
          <VolumeRow>
            <MuteButton title={muted ? 'Unmute' : 'Mute'} onClick={toggleMuted}>
              {speaker}
            </MuteButton>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((muted ? 0 : volume) * 100)}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10) / 100;
                setVolume(v);
                if (v > 0 && muted) toggleMuted();
              }}
              style={{ flex: 1 }}
            />
            <Percent>{Math.round((muted ? 0 : volume) * 100)}%</Percent>
          </VolumeRow>
          <TavernRow>
            <span>Tavern sounds</span>
            <TavernToggle
              type="button"
              $on={!tavernMuted}
              onClick={toggleTavernMuted}
              title={tavernMuted ? 'Turn tavern sounds on' : 'Turn tavern sounds off'}
            >
              {tavernMuted ? 'Off' : 'On'}
            </TavernToggle>
          </TavernRow>

          <SectionTitle>Table color</SectionTitle>
          <SwatchRow>
            {BOARD_THEMES.map((t) => (
              <SwatchButton
                key={t.id}
                type="button"
                title={t.name}
                aria-label={t.name}
                $color={t.swatch}
                $active={t.id === themeID}
                onClick={() => setThemeID(t.id)}
              />
            ))}
          </SwatchRow>

          <SectionTitle>Leave</SectionTitle>
          {!confirmLeave ? (
            <GhostButton onClick={() => setConfirmLeave(true)}>Leave game</GhostButton>
          ) : (
            <>
              <ConfirmText>
                Leave this game for good? Your turn, stable and hand are removed and you can't rejoin.
              </ConfirmText>
              <ConfirmRow>
                <GhostButton onClick={() => setConfirmLeave(false)}>Cancel</GhostButton>
                <DangerButton
                  onClick={() => {
                    if (onLeave) onLeave();
                    history.push('/');
                  }}
                >
                  Leave
                </DangerButton>
              </ConfirmRow>
            </>
          )}

          {isHost && turnTimer && onSetTurnTimer && (
            <>
              <SectionTitle>Turn timer duration</SectionTitle>
              <TimerRow>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={Math.round(turnTimer.durationSec / 60)}
                  onChange={(e) =>
                    onSetTurnTimer({ durationSec: parseInt(e.target.value, 10) * 60 })
                  }
                  style={{ flex: 1 }}
                />
                <Percent>{Math.round(turnTimer.durationSec / 60)}m</Percent>
              </TimerRow>
              <ConfirmText>
                Click the 🕐 clock button on the board to start or stop the timer. A turn
                running past {Math.round(turnTimer.durationSec / 60)} min is ended automatically.
              </ConfirmText>
            </>
          )}

          {isHost && (
            <>
              <SectionTitle>Host controls</SectionTitle>
              {!confirmEnd ? (
                <DangerButton onClick={() => setConfirmEnd(true)}>End game for everyone</DangerButton>
              ) : (
                <>
                  <ConfirmText>End the game for all players? This can't be undone.</ConfirmText>
                  <ConfirmRow>
                    <GhostButton onClick={() => setConfirmEnd(false)}>Cancel</GhostButton>
                    <DangerButton onClick={onEndGame}>End game</DangerButton>
                  </ConfirmRow>
                </>
              )}
            </>
          )}
        </Panel>
      )}
    </Root>
  );
};

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(90deg); }
`;

const popIn = keyframes`
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Root = styled.div`
  position: fixed;
  top: max(14px, env(safe-area-inset-top));
  right: max(14px, env(safe-area-inset-right));
  z-index: 5000;
  font-family: ${FONT_DISPLAY};
`;

const IconButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  background: rgba(20, 12, 34, 0.62);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.4);
  transition: background 0.15s ease;
  &:hover {
    background: rgba(124, 92, 255, 0.45);
    animation: ${spin} 0.4s ease forwards;
  }
`;

const Panel = styled.div`
  position: absolute;
  top: 54px;
  right: 0;
  width: min(288px, calc(100vw - 28px));
  background: #241542;
  border: 1px solid ${COLORS.panelBorder};
  color: #fff;
  border-radius: 16px;
  padding: 16px 18px 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
  animation: ${popIn} 0.18s ease both;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: 14pt;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  font-size: 13pt;
  cursor: pointer;
`;

const SectionTitle = styled.div`
  margin: 14px 0 6px;
  font-size: 10pt;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${COLORS.textMuted};
`;

const VolumeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TavernRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  font-size: 10.5pt;
  color: #fff;
`;

const TavernToggle = styled.button<{ $on: boolean }>`
  min-width: 52px;
  padding: 0.4em 0.7em;
  border-radius: 8px;
  font-weight: 700;
  font-size: 10pt;
  cursor: pointer;
  border: 2px solid #fff;
  color: #fff;
  background: ${(p) => (p.$on ? 'linear-gradient(135deg, #37d9a0, #1f9c74)' : 'transparent')};
`;

const MuteButton = styled.button`
  background: transparent;
  border: none;
  font-size: 16pt;
  cursor: pointer;
  line-height: 1;
`;

const SwatchRow = styled.div`
  display: flex;
  gap: 8px;
`;

const SwatchButton = styled.button<{ $color: string; $active: boolean }>`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  background: ${(p) => p.$color};
  border: 3px solid ${(p) => (p.$active ? '#fff' : 'rgba(255,255,255,0.25)')};
  box-shadow: ${(p) => (p.$active ? '0 0 0 2px #37d9a0' : 'none')};
  transition: transform 0.12s ease, border-color 0.12s ease;
  &:hover {
    transform: scale(1.1);
  }
`;

const TimerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Percent = styled.span`
  width: 38px;
  text-align: right;
  font-size: 10pt;
  color: ${COLORS.textMuted};
`;

const baseBtn = `
  width: 100%;
  padding: 0.65em 1em;
  border-radius: 8px;
  font-weight: 700;
  font-size: 11pt;
  cursor: pointer;
  border: 2px solid #fff;
`;

const DangerButton = styled.button`
  ${baseBtn}
  background: ${COLORS.danger};
  color: #fff;
`;

const GhostButton = styled.button`
  ${baseBtn}
  background: transparent;
  color: #fff;
`;

const ConfirmText = styled.div`
  font-size: 10pt;
  margin-bottom: 8px;
  color: ${COLORS.textMuted};
`;

const ConfirmRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

export default SettingsMenu;
