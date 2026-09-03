import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { FONT_DISPLAY } from '../theme';

// Shown while a magic card is waiting for a target: tap a player's stable, then
// pick the card inside it.
const TargetPrompt = () =>
  createPortal(
    <Pill>
      <span role="img" aria-label="point">
        👉
      </span>
      Tap a player&rsquo;s stable to pick a target
    </Pill>,
    document.body
  );

const bob = keyframes`
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50%      { transform: translateX(-50%) translateY(-3px); }
`;

const Pill = styled.div`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: max(16px, calc(env(safe-area-inset-bottom) + 12px));
  z-index: 11700;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  max-width: calc(100vw - 24px);
  padding: 0.6em 1.25em;
  border-radius: 999px;
  border: 2px solid #fff;
  background: linear-gradient(135deg, #7c5cff, #ff5c8a);
  color: #fff;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: clamp(11px, 2.4vw, 14px);
  text-align: center;
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.28), 0 12px 28px rgba(0, 0, 0, 0.4);
  animation: ${bob} 1.8s ease-in-out infinite;
  pointer-events: none;
`;

export default TargetPrompt;
