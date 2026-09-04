import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { FONT_DISPLAY, COLORS } from '../theme';
import { highlightNames } from './highlightNames';

export type LogEntry = {
  id: string;
  round: number;
  turn: number;
  playerID: string;
  playerName: string;
  text: string;
  ts: number;
};

// Round counter + a shared, read-only history window that every player can open.
const AuditLog = (props: any) => {
  const G = props.G;
  const round: number = G && typeof G.round === 'number' ? G.round : 1;
  const entries: LogEntry[] = G && Array.isArray(G.auditLog) ? G.auditLog : [];
  const names: string[] = G && Array.isArray(G.players) ? G.players.map((p: any) => p.name) : [];

  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // keep the newest entry in view while the window is open
  useLayoutEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, entries.length]);

  // Only render for games that actually keep a log (UU), and not in the lobby.
  if (!G || !Array.isArray(G.auditLog)) return null;
  if (props.ctx && props.ctx.phase === 'pregame') return null;

  let lastRound = -1;

  return createPortal(
    <>
      <Dock>
        <RoundChip>
          Round <b>{round}</b>
        </RoundChip>
        <LogButton onClick={() => setOpen((o) => !o)} $open={open}>
          📜 Log{entries.length ? ` · ${entries.length}` : ''}
        </LogButton>
      </Dock>

      {open && (
        <Panel>
          <Header>
            <span>Game log</span>
            <CloseButton onClick={() => setOpen(false)}>✕</CloseButton>
          </Header>
          <List ref={listRef}>
            {entries.length === 0 && <Empty>Nothing has happened yet.</Empty>}
            {entries.map((e) => {
              const showDivider = e.round !== lastRound;
              lastRound = e.round;
              return (
                <div key={e.id}>
                  {showDivider && <RoundDivider>Round {e.round}</RoundDivider>}
                  <Row>
                    <Who>{highlightNames(e.playerName, names)}</Who>{' '}
                    <What>{highlightNames(e.text, names)}</What>
                  </Row>
                </div>
              );
            })}
          </List>
        </Panel>
      )}
    </>,
    document.body
  );
};

const Dock = styled.div`
  position: fixed;
  left: max(12px, env(safe-area-inset-left));
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 11700;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  font-family: ${FONT_DISPLAY};
`;

const RoundChip = styled.div`
  padding: 0.3em 0.7em;
  border-radius: 10px;
  font-size: 10pt;
  color: #fff;
  background: rgba(20, 12, 34, 0.72);
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  & b {
    font-size: 12pt;
  }
`;

const LogButton = styled.button<{ $open: boolean }>`
  padding: 0.45em 0.9em;
  border-radius: 12px;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: 10.5pt;
  color: #fff;
  cursor: pointer;
  border: 2px solid #fff;
  background: ${(p) =>
    p.$open ? 'linear-gradient(135deg, #7c5cff, #4b2fb5)' : 'rgba(20, 12, 34, 0.72)'};
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.28);
  &:active {
    transform: translateY(3px);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.28);
  }
`;

const Panel = styled.div`
  position: fixed;
  left: max(12px, env(safe-area-inset-left));
  bottom: 92px;
  z-index: 11750;
  width: min(360px, calc(100vw - 24px));
  max-height: min(60vh, 520px);
  display: flex;
  flex-direction: column;
  background: #241542;
  border: 1px solid ${COLORS.panelBorder};
  border-radius: 16px;
  color: #fff;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  overflow: hidden;
  font-family: ${FONT_DISPLAY};
`;

const Header = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  font-weight: 700;
  font-size: 12pt;
  border-bottom: 1px solid ${COLORS.panelBorder};
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  font-size: 12pt;
  cursor: pointer;
`;

const List = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 12px 14px;
  font-family: 'Open Sans', sans-serif;
`;

const Empty = styled.div`
  color: ${COLORS.textMuted};
  font-size: 10pt;
  padding: 8px 2px;
`;

const RoundDivider = styled.div`
  margin: 12px 0 6px;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${COLORS.textMuted};
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 8px;

  &:first-child {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
  }
`;

const Row = styled.div`
  font-size: 10pt;
  line-height: 1.55;
  padding: 2px 0;
`;

const Who = styled.span`
  font-weight: 700;
`;

const What = styled.span`
  color: rgba(255, 255, 255, 0.9);
`;

export default AuditLog;
