import { useMemo, useState, FormEvent } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Screen, Panel, PanelSubtitle, Field, Select, Button, Row, Label, OrDivider } from './ui/themed';
import {
  COLORS,
  FONT_DISPLAY,
  GRADIENTS,
  generateLobbyCode,
  isValidLobbyCode,
  normalizeLobbyCode,
  LOBBY_CODE_LENGTH,
} from './theme';
import { GAMES, DEFAULT_GAME_ID } from './games/registry';

const WidePanel = styled(Panel)`
  max-width: 600px;
`;

const Landing = () => {
  const history = useHistory();

  const [gameId, setGameId] = useState(DEFAULT_GAME_ID);
  const game = useMemo(() => GAMES.find((g) => g.id === gameId) || GAMES[0], [gameId]);

  const counts = useMemo(() => {
    const out: number[] = [];
    for (let n = game.minPlayers; n <= game.maxPlayers; n++) out.push(n);
    return out;
  }, [game]);

  const [createCount, setCreateCount] = useState(
    String(game.minPlayers + 2 <= game.maxPlayers ? game.minPlayers + 2 : game.minPlayers)
  );
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const safeCount = counts.includes(parseInt(createCount, 10)) ? createCount : String(game.minPlayers);

  const createLobby = () => {
    const code = generateLobbyCode();
    history.push(`/${game.id}/${code}/${safeCount}/0`);
  };

  const joinLobby = (e: FormEvent) => {
    e.preventDefault();
    const code = normalizeLobbyCode(joinCode);
    if (!isValidLobbyCode(code)) {
      setJoinError(`Enter the ${LOBBY_CODE_LENGTH}-character code from the host.`);
      return;
    }
    history.push(`/join/${code}`);
  };

  return (
    <Screen>
      <WidePanel>
        <Hero>
          <Logo
            animate={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ repeat: Infinity, repeatDelay: 4, duration: 1.2 }}
          >
            🎲
          </Logo>
          <div>
            <Wordmark>GAME NIGHT</Wordmark>
            <Sub>Pick a game, grab your friends, get a code.</Sub>
          </div>
        </Hero>

        <PanelSubtitle>Choose a game</PanelSubtitle>
        <GameGrid>
          {GAMES.map((g, i) => {
            const selected = g.id === gameId;
            return (
              <Tile
                key={g.id}
                type="button"
                $selected={selected}
                $accent={g.accent}
                onClick={() => setGameId(g.id)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i }}
                whileHover={{ y: -6, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {selected && <Check>✓</Check>}
                <TileIcon>{g.icon}</TileIcon>
                <TileName>
                  {g.name}
                  {g.mock && <MockTag>mock</MockTag>}
                </TileName>
                <TileTag>{g.tagline}</TileTag>
                <TilePlayers>
                  {g.minPlayers}–{g.maxPlayers} players
                </TilePlayers>
              </Tile>
            );
          })}
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
          <Button onClick={createLobby}>
            {game.icon} Create {game.name} lobby
          </Button>
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
                placeholder={`${LOBBY_CODE_LENGTH}-CHAR CODE`}
                onChange={(e) => {
                  setJoinCode(normalizeLobbyCode(e.target.value).slice(0, LOBBY_CODE_LENGTH));
                  setJoinError('');
                }}
              />
            </Label>
            {joinError && <ErrorLine>{joinError}</ErrorLine>}
            <Button type="submit" $variant="ghost">
              Join lobby →
            </Button>
          </Row>
        </form>
      </WidePanel>
    </Screen>
  );
};

// --- styles --------------------------------------------------------------

const Hero = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
  margin-bottom: 6px;
`;

const Logo = styled(motion.div)`
  font-size: clamp(34px, 11vw, 44px);
  line-height: 1;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.4));
`;

const Wordmark = styled.h1`
  margin: 0;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: clamp(22px, 7vw, 32px);
  letter-spacing: 1px;
  background: ${GRADIENTS.hero};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Sub = styled.div`
  color: ${COLORS.textMuted};
  font-size: clamp(10px, 3vw, 12px);
  margin-top: 2px;
`;

const GameGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(146px, 1fr));
  gap: 12px;

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

const Tile = styled(motion.button)<{ $selected: boolean; $accent: string }>`
  position: relative;
  text-align: left;
  border-radius: 16px;
  padding: 14px;
  cursor: pointer;
  color: #fff;
  font: inherit;
  overflow: hidden;
  border: 2px solid ${(p) => (p.$selected ? '#fff' : 'rgba(255,255,255,0.16)')};
  background: ${(p) =>
    p.$selected
      ? `linear-gradient(150deg, ${p.$accent}, rgba(255,255,255,0.08))`
      : 'rgba(255,255,255,0.06)'};
  box-shadow: ${(p) => (p.$selected ? `0 12px 30px ${p.$accent}55` : '0 6px 18px rgba(0,0,0,0.25)')};
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
`;

const Check = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  color: #111;
  font-weight: 900;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TileIcon = styled.div`
  font-size: 30px;
  line-height: 1;
  margin-bottom: 8px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35));
`;

const TileName = styled.div`
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: 12.5pt;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MockTag = styled.span`
  font-family: ${FONT_DISPLAY};
  font-size: 7.5pt;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 6px;
  padding: 1px 5px;
`;

const TileTag = styled.div`
  font-size: 9pt;
  opacity: 0.82;
  margin-top: 3px;
  min-height: 2.4em;
`;

const TilePlayers = styled.div`
  font-family: ${FONT_DISPLAY};
  font-size: 8.5pt;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 6px;
`;

const ErrorLine = styled.div`
  color: #ffd0d8;
  font-size: 10.5pt;
`;

export default Landing;
