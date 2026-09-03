import { useState, CSSProperties } from 'react';
import styled from 'styled-components';
import ImageLoader from './assets/card/imageLoader';
import BG from './assets/ui/board-background.jpg';
import { Card, CardID } from './game/card';
import { UnstableUnicornsGame } from './game/game';
import { PlayerID } from './game/player';
import BackButton from './ui/BackButton';

type Props = {
    G: UnstableUnicornsGame,
    babyCards: Card[],
    playerID: PlayerID,
    moves: any,
    matchID?: string,
    gameId?: string,
};

const BoardGameBegin = (props: Props) => {

    const [playerName, setPlayerName] = useState<string>("Spieler");
    const [copied, setCopied] = useState<boolean>(false);

    const isReady = props.G.ready[props.playerID] === true;
    const hasPick = !!props.G.babyStarter.find(s => s.owner === props.playerID);

    const numPlayers = props.G.players.length;
    const lobbyPath = props.gameId && props.matchID
        ? `/${props.gameId}/${props.matchID}/${numPlayers}`
        : "";
    const inviteLink = lobbyPath ? `${window.location.origin}${lobbyPath}` : "";

    const copyInvite = () => {
        if (!inviteLink) return;
        navigator.clipboard.writeText(inviteLink).then(
            () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
            () => { /* clipboard blocked - link is shown on screen */ }
        );
    };

    return (
        <Wrapper>
            <BackButton to={props.playerID === "0" || !lobbyPath ? "/" : lobbyPath} />
            <div style={{
                display: "flex",
                width: "100%",
                justifyContent: "center",
                color: "white"
            }}>
                <div style={{
                    backgroundColor: `#BC4747`,
                    width: "100%",
                    maxWidth: "780px",
                    padding: "2em",
                    borderRadius: "16px",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.35)"
                }}>
                    {props.matchID && (
                        <div style={{ marginBottom: "1.5em" }}>
                            <h1>Lobby code: {props.matchID}</h1>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "1em",
                                marginTop: "0.6em",
                                flexWrap: "wrap"
                            }}>
                                <span style={{
                                    fontFamily: "monospace",
                                    fontSize: "12pt",
                                    backgroundColor: "rgba(255,255,255,0.2)",
                                    padding: "0.5em 0.8em",
                                    borderRadius: "8px",
                                    wordBreak: "break-all"
                                }}>{inviteLink}</span>
                                <button onClick={copyInvite}>
                                    {copied ? "Copied!" : "Copy invite link"}
                                </button>
                            </div>
                            <p style={{ fontSize: "10pt", opacity: 0.8, marginTop: "0.5em" }}>
                                Share the code or link so friends can pick a seat. Seat 0 is the host.
                            </p>
                        </div>
                    )}
                    <h1>My name:</h1>
                    <input type="text" name="name" value={playerName} onChange={(evt) => {
                        setPlayerName(evt.target.value)
                    }} style={{
                        padding: "1em",
                        backgroundColor: "rgba(255,255,255,0.2)",
                        border: "none",
                        marginBottom: "2em",
                        fontSize: "16pt",
                        color: "white"
                    }} />
                    <button onClick={() => {
                        props.moves.changeName(props.playerID, playerName);
                    }}>Change name</button>
                    <h1>Choose your baby unicorn</h1>
                    <p style={{ fontSize: "10pt", opacity: 0.8, margin: "0.3em 0 0" }}>
                        {isReady
                            ? "You're ready - your pick is locked in."
                            : hasPick
                                ? "Click another unicorn to change your pick."
                                : "Click a unicorn to pick it."}
                    </p>
                    <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        marginTop: "1em"
                    }}>
                        {props.babyCards.map(card => {
                            const owner = props.G.babyStarter.find(f => f.cardID === card.id);
                            const mine = owner?.owner === props.playerID;
                            const takenByOther = !!owner && !mine;
                            const selectable = !isReady && !takenByOther;

                            let style: CSSProperties = { cursor: "pointer" };
                            if (mine) {
                                style = { cursor: isReady ? "default" : "pointer", border: "4px solid white", transform: "scale(1.06)" };
                            } else if (takenByOther) {
                                style = { border: "4px solid rgba(255,255,255,0.5)", opacity: 0.3, cursor: "not-allowed" };
                            } else if (isReady) {
                                style = { opacity: 0.5, cursor: "not-allowed" };
                            }

                            return (<div style={{ margin: "0.5em" }} key={card.id}>
                                <img style={{ ...style, borderRadius: "16px", transition: "transform 0.1s ease" }} src={ImageLoader.load(card.image)} width="100%" onClick={() => {
                                    if (!selectable) {
                                        return;
                                    }
                                    props.moves.selectBaby(props.playerID, card.id);
                                }} />
                            </div>)
                        })}
                    </div>
                    {hasPick && (
                    <div style={{
                        cursor: "pointer",
                        padding: "1em",
                        border: "1px solid white",
                        width: "280px",
                        textAlign: "center",
                        borderRadius: "16px",
                        fontWeight: 600,
                        fontSize: "16pt"
                    }}
                        onClick={() => props.moves.ready(props.playerID)}>
                        {props.G.ready[props.playerID] === true ? "Waiting for others..." : "Click here if you are ready"}
                    </div>)
                    }
                </div>
            </div>
        </Wrapper>
    );
}

const Wrapper = styled.div`
    width: 100%;
    min-height: 100vh;
    background-image: url(${BG});
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    position: relative;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* centre the panel when it fits, otherwise sit at the top and scroll (no clipping) */
    justify-content: safe center;
    padding: 64px 16px;
    box-sizing: border-box;
`;

export default BoardGameBegin;