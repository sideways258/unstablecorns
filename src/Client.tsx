import { useMemo } from 'react';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { useParams } from 'react-router-dom';
import { getGameById, DEFAULT_GAME_ID } from './games/registry';
import { Screen, Panel, PanelTitle, Button } from './ui/themed';
import BackButton from './ui/BackButton';
import PlayerPresence from './ui/PlayerPresence';
import SettingsMenu from './ui/SettingsMenu';
import TurnTimer from './ui/TurnTimer';

type RouteParam = {
    gameId?: string;
    numPlayers?: string;
    playerID?: string;
    matchID?: string;
};

type Props = {
    debug?: string;
};

const GameClient = ({ debug }: Props) => {
    const { gameId, numPlayers, playerID, matchID } = useParams<RouteParam>();
    const isTest = debug === 'test';

    const def = getGameById(isTest ? DEFAULT_GAME_ID : gameId);
    const seats = isTest ? 3 : numPlayers ? parseInt(numPlayers, 10) : 0;

    // Build the boardgame.io client once per (game, lobby) so it doesn't
    // reconnect the socket on every parent re-render.
    const BgClient = useMemo(() => {
        if (!def || (!isTest && !seats)) return null;
        const board = (boardProps: any) => {
            const Board = def.board;
            // Inject the url game id so boards can build invite / back links.
            // Overlays live outside the board so they stay full-size on mobile
            // (the UU board is scaled down to fit).
            return (
                <>
                    <Board {...boardProps} gameId={def.id} gameName={def.name} />
                    <SettingsMenu
                        isHost={boardProps.playerID === '0'}
                        onEndGame={() => boardProps.moves && boardProps.moves.endMatch && boardProps.moves.endMatch()}
                        onLeave={() =>
                            boardProps.moves &&
                            boardProps.moves.playerLeft &&
                            boardProps.moves.playerLeft(boardProps.playerID)
                        }
                        turnTimer={
                            boardProps.moves && boardProps.moves.setTurnTimer && boardProps.G
                                ? boardProps.G.turnTimer
                                : undefined
                        }
                        onSetTurnTimer={(patch: { enabled?: boolean; durationSec?: number }) =>
                            boardProps.moves &&
                            boardProps.moves.setTurnTimer &&
                            boardProps.moves.setTurnTimer(patch)
                        }
                    />
                    <TurnTimer {...boardProps} />
                    <PlayerPresence {...boardProps} />
                </>
            );
        };
        return Client({
            game: def.bgGame,
            board,
            numPlayers: seats,
            ...(isTest
                ? {}
                : {
                      multiplayer: SocketIO({
                          server: `${window.location.protocol}//${window.location.host}`,
                      }),
                  }),
        });
    }, [def, isTest, seats]);

    if (!def) {
        return (
            <Screen>
                <BackButton />
                <Panel>
                    <PanelTitle>Unknown game</PanelTitle>
                    <p>No game called &ldquo;{gameId}&rdquo;.</p>
                    <Button onClick={() => (window.location.href = '/')}>Back to home</Button>
                </Panel>
            </Screen>
        );
    }

    if (!BgClient) {
        return (
            <Screen>
                <BackButton />
                <Panel>
                    <PanelTitle>Missing lobby info</PanelTitle>
                    <Button onClick={() => (window.location.href = '/')}>Back to home</Button>
                </Panel>
            </Screen>
        );
    }

    return <BgClient matchID={isTest ? 'test' : matchID} playerID={isTest ? '0' : playerID} />;
};

export default GameClient;
