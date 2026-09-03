import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { COLORS, FONT_DISPLAY } from '../theme';

type Props = {
  /** Where to go. Defaults to the home / landing screen. */
  to?: string;
  label?: string;
};

// Fixed pill in the top-left corner, present on every screen except the landing page.
const BackButton = ({ to = '/', label = 'Back' }: Props) => {
  const history = useHistory();
  return (
    <Pill onClick={() => history.push(to)}>
      <span className="arrow">←</span>
      {label}
    </Pill>
  );
};

const Pill = styled.button`
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 5000;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.55em 1.05em 0.55em 0.9em;
  border-radius: 999px;
  border: 1.5px solid ${COLORS.panelBorder};
  background: rgba(20, 12, 34, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #fff;
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: 10.5pt;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
  transition: transform 0.12s ease, background 0.15s ease;

  .arrow {
    transition: transform 0.15s ease;
  }
  &:hover {
    background: rgba(124, 92, 255, 0.35);
  }
  &:hover .arrow {
    transform: translateX(-3px);
  }
  &:active {
    transform: scale(0.95);
  }
`;

export default BackButton;
