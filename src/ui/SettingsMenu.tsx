import { useState } from 'react';
import styled from 'styled-components';
import { COLORS } from '../theme';
import { useAudioSettings } from '../audio';

type Props = {
  isHost: boolean;
  onEndGame: () => void;
};

// Gear button (top-right of the board) that opens an on-screen settings panel.
// Houses the master volume control, and - for the lobby host only - the
// "end game for everyone" action.
const SettingsMenu = ({ isHost, onEndGame }: Props) => {
  const { volume, muted, setVolume, toggleMuted } = useAudioSettings();
  const [open, setOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const speaker = muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔈' : '🔊';

  return (
    <Root>
      <IconButton
        title="Settings"
        onClick={() => {
          setOpen((o) => !o);
          setConfirmEnd(false);
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

const Root = styled.div`
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 5000;
  font-family: 'Open Sans', sans-serif;
`;

const IconButton = styled.button`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: ${COLORS.panel};
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  &:hover {
    filter: brightness(1.1);
  }
`;

const Panel = styled.div`
  position: absolute;
  top: 50px;
  right: 0;
  width: 280px;
  background: ${COLORS.panel};
  color: #fff;
  border-radius: 12px;
  padding: 14px 16px 18px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
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

const MuteButton = styled.button`
  background: transparent;
  border: none;
  font-size: 16pt;
  cursor: pointer;
  line-height: 1;
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
