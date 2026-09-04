import styled, { css, keyframes } from 'styled-components';
import type { Player, PlayerID } from "../game/player";
import ImageLoader from '../assets/card/imageLoader';
import { _typeToColor } from './util';
import type { Card, CardID } from '../game/card';
import useDynamicRefs from 'use-dynamic-refs';
import React, { RefObject, useContext, useImperativeHandle, useState } from 'react';
import CardHover from './CardHover';
import { motion } from 'framer-motion';
import useSound from '../audio';
import { cardDescription } from '../BoardUtil';
import { LanguageContext } from '../LanguageContextProvider';
const HubMouseOverSound = require('../assets/sound/Hub_Mouseover.ogg').default;

type Props = {
    players: Player[];
    stable: { [key: string]: Card[] };
    highlightMode?: CardID[];
    upgradeDowngradeStable: { [key: string]: Card[] };
    currentPlayer: PlayerID;
    handCount: number[];
    /** Hands that are face-up to everyone (e.g. a player with "Glass Walls").
     *  Keyed by player id. */
    revealedHands?: { [key: string]: Card[] };
    onStableCardClick: (cardID: CardID) => void;
    onStableCardMouseEnter: (cardID: CardID) => void;
    onStableCardMouseLeave: (cardID: CardID) => void;
    onPlayerClick: (playerID: PlayerID) => void;
    onHandClick: (playerID: PlayerID) => void;
}

export type PlayerFieldHandle = {
    getStableItemRef: (cardID: CardID) => RefObject<HTMLDivElement>; 
}

const PlayerField = React.forwardRef<PlayerFieldHandle, Props>((props, ref) => {
    const [getItemRefs, setItemRefs] = useDynamicRefs();
    const [showHover, setShowHover] = useState<undefined | CardID>(undefined);
    const [playHubMouseOverSound] = useSound(HubMouseOverSound, {
        volume: 0.2,
    });
    const context = useContext(LanguageContext)

    // Only reserve headroom above the row when a hand is actually being shown
    // (Glass Walls in play) - the normal layout is untouched otherwise.
    const hasRevealedHand = !!props.revealedHands && Object.keys(props.revealedHands).length > 0;

    useImperativeHandle(ref, () => ({
        getStableItemRef: (cardID: CardID) => {
            return getItemRefs(`${cardID}`) as any;
        }
    }));

    return (
        <Wrapper $hasRevealedHand={hasRevealedHand}>
            {props.players.map((pl, idx) => {
                return (
                    <PlayerBox key={pl.id} current={pl.id === props.currentPlayer}>
                        <InnerBox onClick={() => props.onPlayerClick(pl.id)}>
                            <Title>
                                <div>
                                    {pl.name}
                                </div>
                                <div style={{ position: "absolute", right: "0.6em", backgroundColor: "rgba(255,255,255,0.2)", width: "23px", height: "30px", borderRadius: "4px", transform: "rotate(14deg) translate(3px,0)" }}>

                                </div>
                                <div style={{ position: "absolute", right: "0.6em", backgroundColor: "rgba(255,255,255,0.1)", width: "23px", height: "30px", borderRadius: "4px", transform: "rotate(23deg) translate(6px,0)" }}>

                                </div>
                                <CardCounter onClick={() => props.onHandClick(pl.id)}>
                                    {props.handCount[parseInt(pl.id)]}
                                </CardCounter>
                            </Title>
                            <UpgradeDowngradeStable>
                                {props.upgradeDowngradeStable[pl.id].map(c => {
                                    return (
                                        <div 
                                            key={c.id}
                                            ref={setItemRefs(`${c.id}`) as any} 
                                            style={{ position: "relative" }} onMouseEnter={() => {
                                                playHubMouseOverSound();
                                                setShowHover(c.id);
                                            }}
                                            onMouseLeave={() => {
                                                setShowHover(undefined);
                                            }}>
                                            <UpgradeDowngradeImage key={c.id} isTranslucent={props.highlightMode ? !props.highlightMode.includes(c.id) : false} image={ImageLoader.load(c.image)} onClick={() => props.onStableCardClick(c.id)} />
                                            {showHover === c.id &&
                                                <CardHover title={c.title} position={"top"} offset={{ x: 40, y: 0 }} color={_typeToColor(c.type)} text={cardDescription(c, context!.language)} />
                                            }
                                        </div>
                                    );
                                })}
                            </UpgradeDowngradeStable>
                            <Stable>
                                {props.stable[pl.id].map(c => {
                                    return (
                                        <div 
                                            key={c.id} 
                                            ref={setItemRefs(`${c.id}`) as any} 
                                            style={{ position: "relative" }} 
                                            onMouseEnter={() => {
                                                playHubMouseOverSound();
                                                setShowHover(c.id);
                                            }}
                                            onMouseLeave={() => {
                                                setShowHover(undefined);
                                            }}>
                                            <UnicornImage layoutId={`${c.id}`}isTranslucent={props.highlightMode ? !props.highlightMode.includes(c.id) : false} image={ImageLoader.load(c.image)} onClick={() => props.onStableCardClick(c.id)} 
                                                onMouseEnter={() => props.onStableCardMouseEnter(c.id)}
                                                onMouseLeave={() => props.onStableCardMouseLeave(c.id)}
                                            />
                                            {showHover === c.id &&
                                                <CardHover title={c.title} position={"top"} offset={{ x: 64, y: 0 }} color={_typeToColor(c.type)} text={cardDescription(c, context!.language)} />
                                            }
                                        </div>
                                    );
                                })}
                                {props.stable[pl.id].length === 0 &&
                                    <p style={{ opacity: 0.7 }}>Stable is empty</p>
                                }
                            </Stable>
                        </InnerBox>
                        {props.revealedHands && props.revealedHands[pl.id] &&
                            <RevealedHand
                                onClick={(e) => {
                                    e.stopPropagation();
                                    props.onHandClick(pl.id);
                                }}
                                title="Tap to see this hand"
                            >
                                <RevealedTag>👁 hand</RevealedTag>
                                {props.revealedHands[pl.id].length === 0 &&
                                    <RevealedEmpty>empty</RevealedEmpty>
                                }
                                {props.revealedHands[pl.id].map((c, i) => (
                                    <div
                                        key={`${c.id}-${i}`}
                                        style={{ position: "relative" }}
                                        onMouseEnter={() => setShowHover(c.id)}
                                        onMouseLeave={() => setShowHover(undefined)}
                                    >
                                        <RevealedCard image={ImageLoader.load(c.image)} color={_typeToColor(c.type)} />
                                        {showHover === c.id &&
                                            <CardHover title={c.title} position={"top"} offset={{ x: 40, y: 0 }} color={_typeToColor(c.type)} text={cardDescription(c, context!.language)} />
                                        }
                                    </div>
                                ))}
                            </RevealedHand>
                        }
                    </PlayerBox>
                );
            })}
        </Wrapper>
    );
});

const Wrapper = styled.div<{ $hasRevealedHand: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    /* headroom for a revealed hand (Glass Walls) to sit above a player's box
       instead of hanging below it and overlapping the current player's own
       stable / hand area - only reserved while a hand is actually shown */
    padding-top: ${props => (props.$hasRevealedHand ? '64px' : '0')};
    transition: padding-top 0.15s ease;
`;

const currentGlow = keyframes`
    0%, 100% { box-shadow: 0 0 0 2px rgba(255, 209, 102, 0.9), 0 0 18px 2px rgba(255, 209, 102, 0.35); }
    50%      { box-shadow: 0 0 0 2px rgba(255, 209, 102, 0.9), 0 0 28px 8px rgba(255, 209, 102, 0.55); }
`;

const PlayerBox = styled.div<{ current: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    width: 148px;
    /* min-height (not a fixed height): a stable with several cards can wrap to
       a second row - let the box grow to honestly contain it instead of the
       content silently overflowing past a fixed box into whatever is below */
    min-height: 176px;
    background-color: ${props => props.current ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)"};
    border-radius: 14px;
    margin: 0.2em;
    padding: 5px;
    animation: ${props => props.current ? css`${currentGlow} 2s ease-in-out infinite` : 'none'};
`;

const RevealedHand = styled.div`
    position: absolute;
    bottom: calc(100% + 4px);
    left: -2px;
    right: -2px;
    z-index: 40;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 4px;
    border-radius: 10px;
    background: rgba(10, 6, 20, 0.92);
    border: 2px solid #8b5cf6;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
    cursor: pointer;
    transition: transform 0.12s ease, border-color 0.12s ease;

    &:hover {
        transform: translateY(-2px);
        border-color: #c4b5fd;
    }
`;

const RevealedTag = styled.div`
    width: 100%;
    text-align: center;
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #c4b5fd;
`;

const RevealedEmpty = styled.div`
    font-size: 9px;
    font-style: italic;
    color: rgba(255, 255, 255, 0.5);
    padding: 2px 0;
`;

const RevealedCard = styled.div<{ image: string; color: string }>`
    width: 22px;
    height: 30px;
    background-image: url(${props => props.image});
    background-size: cover;
    border-radius: 3px;
    border: 1.5px solid ${props => props.color};
`;

const InnerBox = styled.div`
    flex: 1;
    width: 100%;
    border-radius: 12px;
    background-color: #BC4747;
    box-shadow: 0 4px 10px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.24);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(.25,.8,.25,1);
    :hover {
        transform: translateY(-6px) scale(1.02);
        box-shadow: 0 18px 32px rgba(0,0,0,0.32), 0 10px 10px rgba(0,0,0,0.22);
    }
`;

const Title = styled.div`
    color: white;
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    font-weight: 600;
    padding: 5px 6px 0;
    font-size: 11px;
    line-height: 1.15;
    display: flex;
    position: relative;
`;

const UpgradeDowngradeStable = styled.div`
    width: 100%;
    display: flex;
    flex-wrap: no-wrap;
    align-items: center;
    margin: 0.25em 0.5em;
`;

const UpgradeDowngradeImage = styled.img<{ image: string, isTranslucent: boolean }>`
    background-image: url(${props => props.image});
    background-size: cover;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    margin: 0 0.1em;
    opacity: ${props => !props.isTranslucent ? 1 : 0.5};
    transition: all 0.3s cubic-bezier(.25,.8,.25,1);
`;

const Stable = styled.div`
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    position: relative;
`;

const UnicornImage = styled(motion.div)<{ image: string, isTranslucent: boolean }>`
    background-image: url(${props => props.image});
    background-size: cover;
    min-width: 40px;
    height: 46px;
    border-radius: 6px;
    margin: 0.1em;
    opacity: ${props => !props.isTranslucent ? 1 : 0.5};
    transition: all 0.3s cubic-bezier(.25,.8,.25,1);
    cursor: pointer;
`;

const CardCounter = styled.div`
    position: absolute;
    right: 0.6em;
    background-color: rgba(255,255,255,0.5);
    padding: 0.1em 0.3em;
    border-radius: 4px;
    transition: all 0.3s cubic-bezier(.25,.8,.25,1);
    :hover {
        box-shadow: 0 7px 14px rgba(0,0,0,0.125), 0 5px 5px rgba(0,0,0,0.11);
      }
`;

export default PlayerField;