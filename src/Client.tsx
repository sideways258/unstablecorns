import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { useParams } from 'react-router-dom';
import Board from './Board';
import UnstableUnicorns from './game/game';

type RouteParam = {
    numPlayers?: string;
    playerID?: string;
    matchID?: string;
}

type Props = {
    debug?: string;
}

const UnstableUnicornsClient = ({ debug }: Props) => {
    const { numPlayers, playerID, matchID } = useParams<RouteParam>();

    if (debug === "test") {
        const UnstableUnicornsClient = Client({
            game: UnstableUnicorns,
            board: Board,
            numPlayers: 3,
            //multiplayer: SocketIO({ server: `localhost:8000` }),
        });

        return <UnstableUnicornsClient matchID={"test"} playerID={"0"} />
    }

    let UnstableUnicornsClient = null;
    if (numPlayers) {
        UnstableUnicornsClient = Client({
            game: UnstableUnicorns,
            board: Board,
            numPlayers: parseInt(numPlayers),
            //multiplayer: SocketIO({ server: `localhost:8000` }),
            // Connect back to whatever host/port/protocol the page was served from,
            // so it works on http://<unraid-ip>:8090 as well as behind an https proxy.
            multiplayer: SocketIO({ server: `${window.location.protocol}//${window.location.host}` }),
        });
    } else {
        return (<h1>Num players argument is missing</h1>);
    }
    
    return <UnstableUnicornsClient matchID={matchID} playerID={playerID} />
}

export default UnstableUnicornsClient;