import styled, { keyframes } from 'styled-components';
import { Screen, Panel, PanelTitle, Button } from './themed';
import BackButton from './BackButton';
import { highlightNames } from './highlightNames';
import { COLORS } from '../theme';

type Props = {
  title?: string;
  message?: string;
  /** big emoji at the top */
  icon?: string;
  /** player names to highlight in the title / message */
  names?: string[];
};

// Shown to every player when a match ends (host ended it, or a win condition).
const GameEnded = ({
  title = 'Game over',
  message = 'The host ended the game. Thanks for playing!',
  icon = '🎉',
  names = [],
}: Props) => (
  <Screen>
    <BackButton />
    <Panel style={{ textAlign: 'center' }}>
      <BigIcon>{icon}</BigIcon>
      <PanelTitle>{highlightNames(title, names)}</PanelTitle>
      <p style={{ color: COLORS.textMuted }}>{highlightNames(message, names)}</p>
      <Button onClick={() => window.location.assign('/')}>Back to home</Button>
    </Panel>
  </Screen>
);

const pop = keyframes`
  0%   { transform: scale(0.4) rotate(-12deg); opacity: 0; }
  60%  { transform: scale(1.15) rotate(6deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); }
`;

const BigIcon = styled.div`
  font-size: 64px;
  line-height: 1;
  margin-bottom: 10px;
  animation: ${pop} 0.6s cubic-bezier(0.2, 0.9, 0.3, 1) both;
  filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.4));
`;

export default GameEnded;
