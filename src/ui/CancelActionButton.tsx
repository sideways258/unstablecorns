import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { FONT_DISPLAY } from '../theme';

// Shown while the player has an action in progress (aiming a card at a target,
// a card effect waiting for a choice). Portalled so it stays full-size / clickable
// regardless of the board's scale.
const CancelActionButton = ({ onCancel }: { onCancel: () => void }) =>
  createPortal(
    <Pill onClick={onCancel}>
      <span role="img" aria-label="cancel">
        ✕
      </span>
      Cancel action
    </Pill>,
    document.body
  );

const Pill = styled.button`
  position: fixed;
  top: max(12px, env(safe-area-inset-top));
  left: max(12px, env(safe-area-inset-left));
  z-index: 11800;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.6em 1.25em;
  border-radius: 999px;
  border: 2px solid #fff;
  background: linear-gradient(135deg, #ff6b6b, #c81d25);
  color: #fff;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: clamp(12px, 2.4vw, 15px);
  cursor: pointer;
  box-shadow: 0 6px 0 rgba(120, 0, 0, 0.5), 0 10px 24px rgba(0, 0, 0, 0.4);
  transition: transform 0.08s ease, filter 0.15s ease;

  &:hover {
    filter: brightness(1.08);
  }
  &:active {
    transform: translateY(3px);
    box-shadow: 0 3px 0 rgba(120, 0, 0, 0.5);
  }
`;

export default CancelActionButton;
