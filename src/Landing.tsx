import { useState, FormEvent } from 'react';
import { useHistory } from 'react-router-dom';
import { Screen, Panel, PanelTitle, PanelSubtitle, Field, Select, Button, Row, Label, OrDivider } from './ui/themed';
import { generateLobbyCode, isValidLobbyCode, normalizeLobbyCode, LOBBY_CODE_LENGTH } from './theme';

const PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8];

// Shown at "/". Themed like the board. Also a deploy sanity check: if you can
// see this, the front-end build is being served correctly.
const Landing = () => {
  const history = useHistory();

  const [createCount, setCreateCount] = useState('4');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const createLobby = () => {
    const code = generateLobbyCode();
    // Host goes straight into the lobby as seat 0. This also registers the match
    // on the server so people joining by code can look up its player count.
    history.push(`/${code}/${createCount}/0`);
  };

  const joinLobby = (e: FormEvent) => {
    e.preventDefault();
    const code = normalizeLobbyCode(joinCode);
    if (!isValidLobbyCode(code)) {
      setJoinError(`Enter the ${LOBBY_CODE_LENGTH}-character code from the host.`);
      return;
    }
    // The player count comes from the lobby itself - not something the joiner sets.
    history.push(`/join/${code}`);
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

        <OrDivider>
          <span>or</span>
        </OrDivider>

        <PanelSubtitle>Join a lobby</PanelSubtitle>
        <form onSubmit={joinLobby}>
          <Row>
            <Label>
              Lobby code
              <Field
                value={joinCode}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={LOBBY_CODE_LENGTH}
                placeholder={`${LOBBY_CODE_LENGTH}-character code`}
                onChange={(e) => {
                  setJoinCode(normalizeLobbyCode(e.target.value).slice(0, LOBBY_CODE_LENGTH));
                  setJoinError('');
                }}
              />
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
