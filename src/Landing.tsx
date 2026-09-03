import { useMemo, useState, FormEvent } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { Screen, Panel, PanelTitle, PanelSubtitle, Field, Select, Button, Row, Label, OrDivider } from './ui/themed';
import { COLORS, generateLobbyCode, isValidLobbyCode, normalizeLobbyCode, LOBBY_CODE_LENGTH } from './theme';
import { GAMES, DEFAULT_GAME_ID } from './games/registry';

// Shown at "/". Pick a game, then create or join a lobby.
const Landing = () => {
  const history = useHistory();

  const [gameId, setGameId] = useState(DEFAULT_GAME_ID);
  const game = useMemo(() => GAMES.find((g) => g.id === gameId) || GAMES[0], [gameId]);

  const counts = useMemo(() => {
    const out: number[] = [];
    for (let n = game.minPlayers; n <= game.maxPlayers; n++) out.push(n);
    return out;
  }, [game]);

  const [createCount, setCreateCount] = useState(String(game.minPlayers + 2 <= game.maxPlayers ? game.minPlayers + 2 : game.minPlayers));
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Keep the chosen count inside the selected game's range.
  const safeCount = counts.includes(parseInt(createCount, 10)) ? createCount : String(game.minPlayers);

  const createLobby = () => {
    const code = generateLobbyCode();
    // Host goes straight into the lobby as seat 0 (this also registers the match
    // so people joining by code can look up its game + player count).
    history.push(`/${game.id}/${code}/${safeCount}/0`);
  };

  const joinLobby = (e: FormEvent) => {
    e.preventDefault();
    const code = normalizeLobbyCode(joinCode);
    if (!isValidLobbyCode(code)) {
      setJoinError(`Enter the ${LOBBY_CODE_LENGTH}-character code from the host.`);
      return;
    }
    // Game + player count are discovered from the lobby itself.
    history.push(`/join/${code}`);
  };

  return (
    <Screen>
      <Panel>
        <PanelTitle>Game Night</PanelTitle>

        <PanelSubtitle>Choose a game</PanelSubtitle>
        <GameGrid>
          {GAMES.map((g) => (
            <GameCard
              key={g.id}
              type="button"
              $selected={g.id === gameId}
              $accent={g.accent}
              onClick={() => setGameId(g.id)}
            >
              <GameName>
                {g.name}
                {g.mock && <MockTag>mock</MockTag>}
              </GameName>
              <GameTag>{g.tagline}</GameTag>
              <GamePlayers>
                {g.minPlayers}–{g.maxPlayers} players
              </GamePlayers>
            </GameCard>
          ))}
        </GameGrid>

        <PanelSubtitle>Create a lobby</PanelSubtitle>
        <Row>
          <Label>
            Number of players
            <Select value={safeCount} onChange={(e) => setCreateCount(e.target.value)}>
              {counts.map((n) => (
                <option key={n} value={n}>
                  {n} players
                </option>
              ))}
            </Select>
          </Label>
          <Button onClick={createLobby}>Create {game.name} lobby</Button>
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

const GameGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
`;

const GameCard = styled.button<{ $selected: boolean; $accent: string }>`
  text-align: left;
  border-radius: 12px;
  padding: 0.9em 1em;
  cursor: pointer;
  color: #fff;
  font: inherit;
  background: ${(p) => (p.$selected ? p.$accent : 'rgba(255,255,255,0.10)')};
  border: 2px solid ${(p) => (p.$selected ? '#fff' : 'rgba(255,255,255,0.25)')};
  &:hover {
    border-color: #fff;
  }
`;

const GameName = styled.div`
  font-weight: 800;
  font-size: 13pt;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MockTag = styled.span`
  font-size: 8pt;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  padding: 1px 5px;
  font-weight: 700;
`;

const GameTag = styled.div`
  font-size: 10pt;
  opacity: 0.85;
  margin-top: 2px;
`;

const GamePlayers = styled.div`
  font-size: 9pt;
  color: ${COLORS.textMuted};
  margin-top: 4px;
`;

export default Landing;
