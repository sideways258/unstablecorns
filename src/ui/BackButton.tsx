import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { COLORS } from '../theme';

type Props = {
  /** Where to go. Defaults to the home / landing screen. */
  to?: string;
  label?: string;
};

// Fixed pill in the top-left corner, present on every screen except the landing
// page (which is the destination itself).
const BackButton = ({ to = '/', label = '← Back' }: Props) => {
  const history = useHistory();
  return <Pill onClick={() => history.push(to)}>{label}</Pill>;
};

const Pill = styled.button`
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 5000;
  padding: 0.5em 1em;
  border-radius: 999px;
  border: 2px solid #fff;
  background: ${COLORS.panel};
  color: #fff;
  font-family: 'Open Sans', sans-serif;
  font-weight: 700;
  font-size: 11pt;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  &:hover {
    filter: brightness(1.1);
  }
`;

export default BackButton;
