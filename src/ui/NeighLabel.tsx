import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import ImageLoader from '../assets/card/imageLoader';
import { Card, CardID } from '../game/card';
import CardHover from './CardHover';
import { highlightNames } from './highlightNames';
import { motion } from 'framer-motion';
import { _typeToColor } from './util';
import useSound from '../audio';
import { LanguageContext } from '../LanguageContextProvider';
import { cardDescription } from '../BoardUtil';
const MouseClickSound = require('../assets/sound/UI_MouseClick_01.ogg').default;
const HubMouseOverSound = require('../assets/sound/Hub_Mouseover.ogg').default;

type Props = {
    card: Card;
    role: NeighLabelRole;
    originalInitiatorName: string;
    /** Name of the player whose stable the card is going into (if not the initiator's own). */
    targetName?: string;
    /** All player names, so any that appear in the text get highlighted. */
    playerNames?: string[];
    newInitiatorName?: string;
    numberOfNeighedCards: number;
    didVote: boolean;
    showPlayNeighButton: boolean;
    onPlayNeighClick: () => void;
    onDontPlayNeighClick: () => void;
    /** Names of players who still haven't clicked "Neigh" or "Don't neigh" this round. */
    pendingPlayerNames?: string[];
    /** Only the host (seat 0) can arm the auto "don't neigh" countdown. */
    isHost?: boolean;
    voteTimeoutStartedAt?: number;
    voteTimeoutDurationSec?: number;
    onStartVoteTimer?: () => void;
    /** Called (repeatedly, harmlessly) once the countdown has actually run out. */
    onForceVoteTimeout?: () => void;
}

export type NeighLabelRole = "original_initiator" | "new_initiator" | "did_neigh" | "did_not_neigh" | "open" | "original_initiator_can_counterneigh";

const NeighLabel = (props: Props) => {
    const [showHover, setShowHover] = useState<undefined | CardID>(undefined);
    const [playMouseClick] = useSound(MouseClickSound, {
        volume: 0.4,
    });
    const [playHoverSound] = useSound(HubMouseOverSound, {
        volume: 0.3,
    });
    const context = useContext(LanguageContext)

    // Countdown display + (throttled) auto-timeout dispatch once it hits zero.
    const [now, setNow] = useState(() => Date.now());
    const lastForceFire = useRef(0);
    const { voteTimeoutStartedAt, voteTimeoutDurationSec, onForceVoteTimeout } = props;
    useEffect(() => {
        if (!voteTimeoutStartedAt || !voteTimeoutDurationSec) return;
        const tick = () => {
            const n = Date.now();
            setNow(n);
            const remainingMs = voteTimeoutStartedAt + voteTimeoutDurationSec * 1000 - n;
            if (remainingMs <= 0 && onForceVoteTimeout && n - lastForceFire.current > 3000) {
                lastForceFire.current = n;
                try { onForceVoteTimeout(); } catch (e) { /* another client already resolved it */ }
            }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [voteTimeoutStartedAt, voteTimeoutDurationSec, onForceVoteTimeout]);
    const voteTimeoutSecsLeft = voteTimeoutStartedAt && voteTimeoutDurationSec
        ? Math.max(0, Math.ceil((voteTimeoutStartedAt + voteTimeoutDurationSec * 1000 - now) / 1000))
        : undefined;

    // Optimistic "starting…" state + a visible failure if the server never
    // confirms (e.g. a stale deploy that doesn't know this move yet) - without
    // this, a rejected/ignored move looked identical to "nothing happened".
    const [startPending, setStartPending] = useState(false);
    const [startFailed, setStartFailed] = useState(false);
    useEffect(() => {
        if (voteTimeoutStartedAt) {
            setStartPending(false);
            setStartFailed(false);
        }
    }, [voteTimeoutStartedAt]);
    useEffect(() => {
        if (!startPending) return;
        const id = setTimeout(() => {
            setStartPending(false);
            setStartFailed(true);
        }, 4000);
        return () => clearTimeout(id);
    }, [startPending]);

    const onText = props.targetName && props.targetName !== props.originalInitiatorName ? ` on ${props.targetName}` : "";
    const names = props.playerNames && props.playerNames.length > 0
        ? props.playerNames
        : [props.originalInitiatorName, props.newInitiatorName, props.targetName].filter((n): n is string => !!n);

    let text = "";
    if (props.role === "original_initiator") {
        text = `You are playing ${props.card.title}${onText}. Other players may neigh it — wait for their decision...`;
    } else if (props.role === "did_neigh") {
        text = "You played a neigh card.";
    } else if (props.role === "did_not_neigh") {
        text = "You did not play a neigh card. Wait for the other players..."
    } else if (props.role === "open") {
        if (props.newInitiatorName !== undefined) {
            text = `${props.newInitiatorName} played a neigh card. Do you want to neigh the neigh card of ${props.newInitiatorName}?`;
        } else {
            text = `${props.originalInitiatorName} is playing ${props.card.title}${onText}. Do you want to neigh it?`;
        }
    } else if (props.role === "new_initiator") {
        text = `You played a neigh card. Others may neigh your neigh card. Wait for their decision...`;
    } else if (props.role === "original_initiator_can_counterneigh") {
        text = `${props.newInitiatorName} played a neigh card. Do you want to neigh his neigh card?`;
    }

    return createPortal(
        <Backdrop>
            <Wrapper
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.22 }}
            >
                <CardWrap
                    onMouseEnter={() => {
                        setShowHover(props.card.id);
                        playHoverSound();
                    }}
                    onMouseLeave={() => setShowHover(undefined)}
                >
                    <CardImage src={ImageLoader.load(props.card.image)} />
                    {showHover === props.card.id && (
                        <CardHover
                            title={props.card.title}
                            position={'bottom'}
                            offset={{ x: 60, y: -20 }}
                            color={_typeToColor(props.card.type)}
                            text={cardDescription(props.card, context!.language)}
                        />
                    )}
                </CardWrap>

                <Text>
                    <div>{highlightNames(text, names)}</div>
                    {props.numberOfNeighedCards % 2 === 1 && (
                        <div>
                            Result: {highlightNames(props.originalInitiatorName, names)}{' '}
                            <span style={{ color: '#ff8a8a' }}>is stopped from playing</span> {props.card.title}.
                        </div>
                    )}
                    {props.numberOfNeighedCards % 2 === 0 && (
                        <div>
                            Result: {highlightNames(props.originalInitiatorName, names)}{' '}
                            <span style={{ color: '#8affb0' }}>can play</span> {props.card.title}.
                        </div>
                    )}
                </Text>

                {props.didVote === false && (
                    <Buttons>
                        <DontNeighButton
                            onClick={() => {
                                props.onDontPlayNeighClick();
                                playMouseClick();
                            }}
                        >
                            Don&rsquo;t neigh
                        </DontNeighButton>
                        {props.showPlayNeighButton && (
                            <NeighButton
                                onClick={() => {
                                    props.onPlayNeighClick();
                                    playMouseClick();
                                }}
                            >
                                Play Neigh
                            </NeighButton>
                        )}
                    </Buttons>
                )}

                {voteTimeoutSecsLeft !== undefined && (
                    <CountdownBar $danger={voteTimeoutSecsLeft <= 5}>
                        <CountdownNum>
                            0:{voteTimeoutSecsLeft < 10 ? '0' : ''}
                            {voteTimeoutSecsLeft}
                        </CountdownNum>
                        <span>auto-selecting &ldquo;don&rsquo;t neigh&rdquo; for anyone still undecided</span>
                    </CountdownBar>
                )}

                {props.pendingPlayerNames && props.pendingPlayerNames.length > 0 && (
                    <Pending>
                        <PendingLabel>Waiting on:</PendingLabel>
                        <PendingChips>
                            {props.pendingPlayerNames.map(name => (
                                <PendingChip key={name}>{name}</PendingChip>
                            ))}
                        </PendingChips>
                        {voteTimeoutSecsLeft === undefined && props.isHost && props.onStartVoteTimer && (
                            <TimerButton
                                disabled={startPending}
                                onClick={() => {
                                    setStartPending(true);
                                    setStartFailed(false);
                                    props.onStartVoteTimer!();
                                    playMouseClick();
                                }}
                                title="Auto-select &ldquo;don't neigh&rdquo; for anyone who hasn't voted after the countdown"
                            >
                                {startPending ? 'Starting…' : '⏱ Start timer'}
                            </TimerButton>
                        )}
                        {startFailed && (
                            <TimerErrorText>
                                Timer didn&rsquo;t start — the server may be out of date. Try again, or ask everyone to hard-refresh.
                            </TimerErrorText>
                        )}
                    </Pending>
                )}
            </Wrapper>
        </Backdrop>,
        document.body
    );
}

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 12000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
    background: rgba(0, 0, 0, 0.28);
    /* let clicks reach the board around the popup; the panel re-enables itself */
    pointer-events: none;
    & > * {
        pointer-events: auto;
    }
`;

const Text = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1 1 240px;
    min-width: 200px;
`;

const Buttons = styled.div`
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    flex: none;
`;

const Wrapper = styled(motion.div)`
    background: linear-gradient(180deg, rgba(38, 18, 32, 0.94), rgba(22, 11, 20, 0.97));
    border: 2px solid rgba(255, 255, 255, 0.2);
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    font-size: clamp(12px, 2.6vw, 16px);
    color: white;
    padding: 20px 22px;
    border-radius: 22px;
    width: min(920px, 94vw);
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 16px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
`;

const glow = keyframes`
    from { box-shadow: 0 0 34px #f0f, 0 0 10px red, 0 0 18px #0ff; }
    to   { box-shadow: 0 0 34px #0ff, 0 0 10px #f0f, 0 0 18px #f0f; }
`;

const CardWrap = styled.div`
    position: relative;
    flex: none;
`;

const CardImage = styled.img`
    width: 84px;
    height: 84px;
    border-radius: 14px;
    display: block;
    animation: ${glow} 1s infinite alternate;
`;

const chunky = `
    padding: 0.85em 1.5em;
    min-height: 48px;
    border-radius: 14px;
    cursor: pointer;
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    font-weight: 700;
    font-size: clamp(13px, 3vw, 16px);
    color: #fff;
    border: 3px solid #fff;
    user-select: none;
    transition: transform 0.08s ease, filter 0.15s ease;
    &:hover { filter: brightness(1.1); }
    &:active { transform: translateY(3px); box-shadow: 0 2px 0 rgba(0,0,0,0.4) !important; }
`;

const DontNeighButton = styled.div`
    ${chunky}
    background: linear-gradient(135deg, #ff6b6b, #c81d25);
    box-shadow: 0 5px 0 rgba(0, 0, 0, 0.35);
`;

const NeighButton = styled.div`
    ${chunky}
    background: linear-gradient(135deg, #4ade80, #148f4b);
    box-shadow: 0 5px 0 rgba(0, 0, 0, 0.35);
`;

const Pending = styled.div`
    flex: 1 1 100%;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 10px;
`;

const PendingLabel = styled.span`
    font-size: 10.5pt;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.65);
    flex: none;
`;

const PendingChips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const PendingChip = styled.span`
    padding: 0.3em 0.7em;
    border-radius: 999px;
    font-size: 10pt;
    font-weight: 700;
    color: #241d14;
    background: linear-gradient(135deg, #ffd76a, #f8b500);
`;

const countdownPulse = keyframes`
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
`;

const CountdownBar = styled.div<{ $danger: boolean }>`
    flex: 1 1 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 14px;
    background: ${props => props.$danger ? 'rgba(255, 107, 107, 0.22)' : 'rgba(124, 92, 255, 0.18)'};
    border: 2px solid ${props => props.$danger ? '#ff6b6b' : '#7c5cff'};

    span {
        font-size: 10.5pt;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
    }
`;

const CountdownNum = styled.div`
    font-variant-numeric: tabular-nums;
    font-size: 22pt;
    font-weight: 800;
    line-height: 1;
    color: #fff;
    flex: none;
    animation: ${countdownPulse} 1s ease-in-out infinite;
`;

const TimerButton = styled.button`
    margin-left: auto;
    padding: 0.35em 0.9em;
    border-radius: 999px;
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    font-weight: 700;
    font-size: 10pt;
    color: #fff;
    cursor: pointer;
    border: 2px solid #fff;
    background: linear-gradient(135deg, #7c9cff, #3d5edb);
    white-space: nowrap;
    &:hover { filter: brightness(1.1); }
    &:active { transform: translateY(1px); }
    &:disabled {
        cursor: default;
        opacity: 0.7;
        filter: none;
    }
`;

const TimerErrorText = styled.div`
    flex: 1 1 100%;
    font-size: 9.5pt;
    color: #ff8a8a;
`;

export default NeighLabel;