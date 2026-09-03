import { useState } from 'react';
import styled from 'styled-components';
import ImageLoader from './assets/card/imageLoader';
import { Card } from './game/card';
import { UnstableUnicornsGame } from './game/game';
import { PlayerID } from './game/player';
import LobbyView from './ui/LobbyView';
import { buildRoster } from './ui/lobbyRoster';
import { COLORS } from './theme';

type Props = {
    G: UnstableUnicornsGame,
    babyCards: Card[],
    playerID: PlayerID,
    moves: any,
    matchID?: string,
    gameId?: string,
    matchData?: Array<{ id: number | string; name?: string; isConnected?: boolean }>,
};

const BoardGameBegin = (props: Props) => {
    const [playerName, setPlayerName] = useState<string>('Spieler');
    const [nameSaved, setNameSaved] = useState<boolean>(false);

    const isReady = props.G.ready[props.playerID] === true;
    const hasPick = !!props.G.babyStarter.find((s) => s.owner === props.playerID);
    const numPlayers = props.G.players.length;

    const readyCount = props.G.players.filter((p) => props.G.ready[p.id] === true).length;

    const roster = buildRoster({
        seatIds: props.G.players.map((p) => String(p.id)),
        playerID: props.playerID,
        matchData: props.matchData,
        nameFor: (id) => {
            const pl = props.G.players.find((p) => String(p.id) === id);
            return pl && pl.name && pl.name.trim() ? pl.name : undefined;
        },
        readyFor: (id) => props.G.ready[id] === true,
        noteFor: (id) =>
            props.G.ready[id] !== true && props.G.babyStarter.find((s) => String(s.owner) === id)
                ? 'Picking…'
                : undefined,
    });

    return (
        <LobbyView
            gameName="Unstable Unicorns"
            matchID={props.matchID}
            gameId={props.gameId}
            numPlayers={numPlayers}
            backTo={props.playerID === '0' || !(props.gameId && props.matchID) ? '/' : `/${props.gameId}/${props.matchID}/${numPlayers}`}
            players={roster}
            readyCount={readyCount}
            nameValue={playerName}
            onNameChange={(v) => {
                setPlayerName(v);
                setNameSaved(false);
            }}
            onSaveName={() => {
                props.moves.changeName(props.playerID, playerName);
                setNameSaved(true);
            }}
            nameSaved={nameSaved}
            isReady={isReady}
            onReadyClick={() => props.moves.ready(props.playerID)}
            readyDisabled={!hasPick}
            readyHint={
                isReady
                    ? "You're ready — your pick is locked in."
                    : hasPick
                    ? 'Tap another unicorn to change your pick, then hit ready.'
                    : 'Pick a baby unicorn first.'
            }
        >
            <SubLabel>Choose your baby unicorn</SubLabel>
            <BabyGrid>
                {props.babyCards.map((card) => {
                    const owner = props.G.babyStarter.find((f) => f.cardID === card.id);
                    const mine = owner?.owner === props.playerID;
                    const takenByOther = !!owner && !mine;
                    const selectable = !isReady && !takenByOther;

                    return (
                        <Baby
                            key={card.id}
                            $mine={mine}
                            $dim={takenByOther || (isReady && !mine)}
                            $selectable={selectable}
                            onClick={() => selectable && props.moves.selectBaby(props.playerID, card.id)}
                        >
                            <img src={ImageLoader.load(card.image)} alt="" />
                        </Baby>
                    );
                })}
            </BabyGrid>
        </LobbyView>
    );
};

const SubLabel = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 1.6em 0 0.7em;
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    font-weight: 600;
    font-size: clamp(10px, 3vw, 13px);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: ${COLORS.textMuted};

    &::before {
        content: '';
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: linear-gradient(135deg, #7c5cff, #ff5c8a);
        box-shadow: 0 0 12px #ff5c8a;
    }
`;

const BabyGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 10px;
    margin-top: 4px;
`;

const Baby = styled.div<{ $mine: boolean; $dim: boolean; $selectable: boolean }>`
    border-radius: 16px;
    overflow: hidden;
    cursor: ${(p) => (p.$selectable ? 'pointer' : 'not-allowed')};
    border: 3px solid ${(p) => (p.$mine ? '#fff' : 'transparent')};
    box-shadow: ${(p) => (p.$mine ? `0 10px 26px ${COLORS.primary}66` : '0 6px 16px rgba(0,0,0,0.3)')};
    opacity: ${(p) => (p.$dim ? 0.32 : 1)};
    transform: ${(p) => (p.$mine ? 'scale(1.04)' : 'none')};
    transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;

    &:hover {
        transform: ${(p) => (p.$selectable ? 'translateY(-6px) scale(1.06)' : p.$mine ? 'scale(1.04)' : 'none')};
    }

    img {
        display: block;
        width: 100%;
    }
`;

export default BoardGameBegin;
