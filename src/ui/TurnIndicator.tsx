import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { FONT_DISPLAY } from '../theme';

type Props = {
  currentName: string;
  isYou: boolean;
};

// Always-on "whose turn" banner. Portalled to <body> so it stays full-size and
// pinned to the top of the viewport (the board itself is scaled).
const TurnIndicator = ({ currentName, isYou }: Props) =>
  createPortal(
    <Pill $you={isYou}>
      <span role="img" aria-label="dice">
        🎲
      </span>
      {isYou ? 'Your turn!' : <><Who>{currentName}</Who>&rsquo;s turn</>}
    </Pill>,
    document.body
  );

const Who = styled.b`
  font-weight: 800;
  background: rgba(255, 255, 255, 0.22);
  padding: 1px 7px;
  border-radius: 6px;
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 6px 0 rgba(0,0,0,0.28), 0 0 0 0 rgba(55,217,160,0.5); }
  50%      { box-shadow: 0 6px 0 rgba(0,0,0,0.28), 0 0 0 10px rgba(55,217,160,0); }
`;

const Pill = styled.div<{ $you: boolean }>`
  position: fixed;
  top: max(10px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  z-index: 11500;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  max-width: calc(100vw - 24px);
  padding: 0.5em 1.3em;
  border-radius: 999px;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: clamp(12px, 2.4vw, 15px);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 2px solid #fff;
  background: ${(p) => (p.$you ? 'linear-gradient(135deg, #37d9a0, #1f9c74)' : 'rgba(20, 12, 34, 0.82)')};
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.28), 0 12px 28px rgba(0, 0, 0, 0.4);
  animation: ${(p) => (p.$you ? pulse : 'none')} 1.8s ease-in-out infinite;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
`;

export default TurnIndicator;
