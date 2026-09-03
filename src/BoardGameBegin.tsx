import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import ImageLoader from './assets/card/imageLoader';
import { Card } from './game/card';
import { UnstableUnicornsGame } from './game/game';
import { PlayerID } from './game/player';
import BackButton from './ui/BackButton';
import { Panel, PanelSubtitle, Field, Button, CodeDisplay } from './ui/themed';
import { COLORS, FONT_DISPLAY, GRADIENTS } from './theme';

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

    const [playerName, setPlayerName] = useState<string>("Spieler");
    const [copied, setCopied] = useState<boolean>(false);

    const isReady = props.G.ready[props.playerID] === true;
    const hasPick = !!props.G.babyStarter.find(s => s.owner === props.playerID);

    const numPlayers = props.G.players.length;
    const readyCount = props.G.players.filter(p => props.G.ready[p.id] === true).length;
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
            <LobbyPanel>
                {props.matchID && (
                    <>
                        <PanelSubtitle>Lobby code</PanelSubtitle>
                        <CodeDisplay>{props.matchID}</CodeDisplay>
                        <Row>
                            <LinkBox>{inviteLink}</LinkBox>
                            <Button $variant="ghost" onClick={copyInvite} style={{ width: "auto", whiteSpace: "nowrap" }}>
                                {copied ? "✓ Copied" : "Copy link"}
                            </Button>
                        </Row>
                        <Hint>Share the code or link so friends can pick a seat. Seat 0 is the host.</Hint>
                    </>
                )}

                <PanelSubtitle>Players &middot; {readyCount}/{numPlayers} ready</PanelSubtitle>
                <Roster>
                    {props.G.players.map((pl) => {
                        const meta = Array.isArray(props.matchData)
                            ? props.matchData.find((m) => String(m.id) === String(pl.id))
                            : undefined;
                        const online = meta ? meta.isConnected !== false : true;
                        const rdy = props.G.ready[pl.id] === true;
                        const picked = !!props.G.babyStarter.find((s) => s.owner === pl.id);
                        const me = String(pl.id) === String(props.playerID);
                        const displayName = (pl.name && pl.name.trim()) || (meta && meta.name) || `Player ${pl.id}`;

                        let tone: 'ready' | 'wait' | 'idle' | 'off' = 'idle';
                        let label = 'Not ready';
                        if (props.matchData && !online) { tone = 'off'; label = 'Not joined'; }
                        else if (rdy) { tone = 'ready'; label = 'Ready'; }
                        else if (picked) { tone = 'wait'; label = 'Picking…'; }

                        return (
                            <RosterRow key={pl.id}>
                                <Dot $on={!props.matchData || online} />
                                <RName>
                                    {displayName}
                                    {me && <MeTag>you</MeTag>}
                                </RName>
                                <StatusPill $tone={tone}>
                                    {tone === 'ready' ? '✓ ' : ''}
                                    {label}
                                </StatusPill>
                            </RosterRow>
                        );
                    })}
                </Roster>

                <PanelSubtitle>Your name</PanelSubtitle>
                <Row>
                    <Field
                        value={playerName}
                        onChange={(evt) => setPlayerName(evt.target.value)}
                        style={{ letterSpacing: "normal" }}
                    />
                    <Button
                        $variant="ghost"
                        onClick={() => props.moves.changeName(props.playerID, playerName)}
                        style={{ width: "auto" }}
                    >
                        Save
                    </Button>
                </Row>

                <PanelSubtitle>Choose your baby unicorn</PanelSubtitle>
                <Hint>
                    {isReady
                        ? "You're ready — your pick is locked in."
                        : hasPick
                            ? "Click another unicorn to change your pick."
                            : "Click a unicorn to pick it."}
                </Hint>
                <BabyGrid>
                    {props.babyCards.map(card => {
                        const owner = props.G.babyStarter.find(f => f.cardID === card.id);
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

                {hasPick && (
                    <ReadyButton $ready={isReady} onClick={() => props.moves.ready(props.playerID)}>
                        {isReady ? "Waiting for others…" : "I'm ready!"}
                    </ReadyButton>
                )}
            </LobbyPanel>
        </Wrapper>
    );
}

const Wrapper = styled.div`
    width: 100%;
    min-height: 100vh;
    background: ${GRADIENTS.page};
    position: relative;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: safe center;
    padding: 72px 16px;
    box-sizing: border-box;
    font-family: 'Open Sans', sans-serif;
`;

const LobbyPanel = styled(Panel)`
    max-width: 760px;
`;

const Row = styled.div`
    display: flex;
    gap: 10px;
    align-items: stretch;
    flex-wrap: wrap;
    margin-top: 8px;

    & > * {
        min-height: 46px;
    }
    & > *:first-child {
        flex: 1 1 min(220px, 100%);
    }
`;

const LinkBox = styled.div`
    font-family: 'Open Sans', monospace;
    font-size: 10.5pt;
    background: rgba(0, 0, 0, 0.25);
    border: 1.5px solid ${COLORS.panelBorder};
    padding: 0.75em 0.9em;
    border-radius: 12px;
    word-break: break-all;
    display: flex;
    align-items: center;
`;

const Hint = styled.p`
    color: ${COLORS.textMuted};
    font-size: 10.5pt;
    margin: 10px 0 0;
`;

const Roster = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 4px;
`;

const RosterRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0.55em 0.8em;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid ${COLORS.panelBorder};
`;

const Dot = styled.span<{ $on: boolean }>`
    flex: none;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: ${(p) => (p.$on ? '#37d9a0' : 'rgba(255,255,255,0.3)')};
    box-shadow: ${(p) => (p.$on ? '0 0 8px #37d9a0' : 'none')};
`;

const RName = styled.span`
    flex: 1;
    min-width: 0;
    font-family: ${FONT_DISPLAY};
    font-weight: 600;
    font-size: 12pt;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const MeTag = styled.span`
    margin-left: 6px;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${COLORS.accentC};
`;

const StatusPill = styled.span<{ $tone: 'ready' | 'wait' | 'idle' | 'off' }>`
    flex: none;
    font-family: ${FONT_DISPLAY};
    font-weight: 600;
    font-size: 9.5pt;
    padding: 3px 10px;
    border-radius: 999px;
    color: #fff;
    background: ${(p) =>
        p.$tone === 'ready'
            ? 'linear-gradient(135deg, #4ade80, #148f4b)'
            : p.$tone === 'wait'
            ? 'linear-gradient(135deg, #ffcf5c, #e0961a)'
            : p.$tone === 'off'
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(255,255,255,0.16)'};
`;

const BabyGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 10px;
    margin-top: 14px;
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

const pulse = keyframes`
    0%, 100% { box-shadow: 0 8px 0 rgba(0,0,0,0.28), 0 0 0 0 rgba(55,217,160,0.5); }
    50% { box-shadow: 0 8px 0 rgba(0,0,0,0.28), 0 0 0 12px rgba(55,217,160,0); }
`;

const ReadyButton = styled.button<{ $ready: boolean }>`
    display: block;
    width: 100%;
    margin-top: 18px;
    padding: 0.95em 1em;
    border: none;
    border-radius: 14px;
    font-family: ${FONT_DISPLAY};
    font-weight: 700;
    font-size: 15pt;
    color: #fff;
    cursor: pointer;
    background: ${(p) => (p.$ready ? 'rgba(255,255,255,0.12)' : `linear-gradient(135deg, ${COLORS.success}, #1f9c74)`)};
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.28);
    animation: ${(p) => (p.$ready ? 'none' : pulse)} 1.8s ease-in-out infinite;
    transition: transform 0.08s ease;

    &:active {
        transform: translateY(6px);
        box-shadow: 0 2px 0 rgba(0, 0, 0, 0.28);
    }
`;

export default BoardGameBegin;
