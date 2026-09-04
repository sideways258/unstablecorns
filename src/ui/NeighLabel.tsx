import { useContext, useState } from 'react';
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

                {props.pendingPlayerNames && props.pendingPlayerNames.length > 0 && (
                    <Pending>
                        <PendingLabel>Waiting on:</PendingLabel>
                        <PendingChips>
                            {props.pendingPlayerNames.map(name => (
                                <PendingChip key={name}>{name}</PendingChip>
                            ))}
                        </PendingChips>
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

export default NeighLabel;