import { Screen, Panel, PanelTitle, Button } from './themed';
import BackButton from './BackButton';
import { COLORS } from '../theme';

type Props = {
  title?: string;
  message?: string;
};

// Shown to every player when a match ends (host ended it, or a win condition).
const GameEnded = ({ title = 'Game over', message = 'The host ended the game. Thanks for playing!' }: Props) => (
  <Screen>
    <BackButton />
    <Panel>
      <PanelTitle>{title}</PanelTitle>
      <p style={{ color: COLORS.textMuted }}>{message}</p>
      <Button onClick={() => window.location.assign('/')}>Back to home</Button>
    </Panel>
  </Screen>
);

export default GameEnded;
