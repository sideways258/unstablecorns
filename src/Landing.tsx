import { useState, FormEvent } from 'react';
import { useHistory } from 'react-router-dom';
import { Screen, Panel, PanelTitle, PanelSubtitle, Field, Select, Button, Row, Label } from './ui/themed';
import { generateLobbyCode, isValidLobbyCode } from './theme';

const PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8];

// Shown at "/". Themed like the board. Also a deploy sanity check: if you can
// see this, the front-end build is being served correctly.
const Landing = () => {
  const history = useHistory();

  const [createCount, setCreateCount] = useState('4');
  const [joinCode, setJoinCode] = useState('');
  const [joinCount, setJoinCount] = useState('4');
  const [joinError, setJoinError] = useState('');

  const createLobby = () => {
    const code = generateLobbyCode();
    // Host lands on the seat picker for the new lobby (they take seat 0).
    history.push(`/${code}/${createCount}`);
  };

  const joinLobby = (e: FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!isValidLobbyCode(code)) {
      setJoinError('Enter the 6-digit code from the host.');
      return;
    }
    history.push(`/${code}/${joinCount}`);
  };

  return (
    <Screen>
      <Panel>
        <PanelTitle>Unstable Unicorns</PanelTitle>

        <PanelSubtitle>Create a lobby</PanelSubtitle>
        <Row>
          <Label>
            Number of players
            <Select value={createCount} onChange={(e) => setCreateCount(e.target.value)}>
              {PLAYER_COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n} players
                </option>
              ))}
            </Select>
          </Label>
          <Button onClick={createLobby}>Create lobby &amp; get code</Button>
        </Row>

        <PanelSubtitle>Join a lobby</PanelSubtitle>
        <form onSubmit={joinLobby}>
          <Row>
            <Label>
              Lobby code
              <Field
                value={joinCode}
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                onChange={(e) => {
                  setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setJoinError('');
                }}
              />
            </Label>
            <Label>
              Number of players (ask the host)
              <Select value={joinCount} onChange={(e) => setJoinCount(e.target.value)}>
                {PLAYER_COUNTS.map((n) => (
                  <option key={n} value={n}>
                    {n} players
                  </option>
                ))}
              </Select>
            </Label>
            {joinError && <div style={{ color: '#ffd9d9', fontSize: '11pt' }}>{joinError}</div>}
            <Button type="submit" $variant="ghost">
              Join lobby
            </Button>
          </Row>
        </form>
      </Panel>
    </Screen>
  );
};

export default Landing;
