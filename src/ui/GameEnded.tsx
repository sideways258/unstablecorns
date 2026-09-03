import { Screen, Panel, PanelTitle, Button } from './themed';
import BackButton from './BackButton';
import { COLORS } from '../theme';

// Shown to every player once the host ends the match (ctx.gameover is set).
const GameEnded = () => (
  <Screen>
    <BackButton />
    <Panel>
      <PanelTitle>Game over</PanelTitle>
      <p style={{ color: COLORS.textMuted }}>The host ended the game. Thanks for playing!</p>
      <Button onClick={() => window.location.assign('/')}>Back to home</Button>
    </Panel>
  </Screen>
);

export default GameEnded;
