import styled, { css, keyframes } from 'styled-components';
import type { Card, CardID } from "../game/card";
import ImageLoader from '../assets/card/imageLoader';
import { _typeToColor } from './util';
import { useState, RefObject, useContext } from 'react';
import React from 'react';
import { useImperativeHandle } from 'react';
import useDynamicRefs from 'use-dynamic-refs';
import CardHover from './CardHover';
import { motion } from 'framer-motion';
import useSound from '../audio';
import { LanguageContext } from '../LanguageContextProvider';
import { cardDescription } from '../BoardUtil';
const MouseClickSound = require('../assets/sound/board_common_dirt_poke_1.ogg').default;


type Props = {
    cards: Card[];
    upgradeDowngradeCards: Card[];
    glowing: CardID[];
    highlightMode?: CardID[];
    renderAccessoryHoverItem: (cardID: CardID) => React.ReactElement | undefined;
    onStableItemMouseEnter: (cardID: CardID) => void;
    onStableItemMouseLeave: (cardID: CardID) => void;
    onStableItemClick: (evt: React.MouseEvent, cardID: CardID) => void;
    onPlaceHereClick: (evt: React.MouseEvent) => void;
}

export type StableHandle = {
    getStableItemRef: (cardID: CardID) => RefObject<HTMLDivElement>; 
}

const Stable = React.forwardRef<StableHandle, Props>((props, ref) => {

    const [getItemRefs, setItemRefs] = useDynamicRefs();
    const [showHover, setShowHover] = useState<undefined | CardID>(undefined);

    const [playMouseClick] = useSound(MouseClickSound, {
        volume: 0.2,
    });
    const context = useContext(LanguageContext)

    useImperativeHandle(ref, () => ({
        getStableItemRef: (cardID: CardID) => {
            return getItemRefs(`${cardID}`) as any;
        }
    }));

    return (
        <Wrapper>
            <UpgradeDowngradeSection>
                <SectionTag>Upgrades / Downgrades</SectionTag>
                <UpgradeDowngradeRow>
                {props.upgradeDowngradeCards.length === 0 &&
                    <EmptyNote>played here</EmptyNote>
                }
                {props.upgradeDowngradeCards.map(card => {
                    return (
                        <StableItem 
                            key={card.id}
                            onClick={evt => props.onStableItemClick(evt, card.id)} 
                            ref={setItemRefs(`${card.id}`) as any} 
                            onMouseEnter={() => {
                                props.onStableItemMouseEnter(card.id);
                                setShowHover(card.id);
                            }} 
                            onMouseLeave={() => {
                                props.onStableItemMouseLeave(card.id)
                                setShowHover(undefined);
                            }}
                        >
                            <MiniCardImage 
                                layoutId={`${card.id}`}
                                src={ImageLoader.load(card.image)} 
                                color={_typeToColor(card.type)} 
                                isGlowing={props.glowing.includes(card.id)} 
                                isTranslucent={props.highlightMode ? !props.highlightMode.includes(card.id) : false}
                            />
                            {showHover === card.id &&
                                <CardHover title={card.title} position={"bottom"} offset={{x: 45, y: 10}} color={_typeToColor(card.type)} text={cardDescription(card, context!.language)}>
                                {props.renderAccessoryHoverItem(card.id)}
                                </CardHover>
                            }
                        </StableItem>
                    );
                })}
                </UpgradeDowngradeRow>
            </UpgradeDowngradeSection>
            <StableWrapper>
                {props.cards.map((card, idx) => {
                    return (
                        <StableItem 
                            key={card.id} 
                            ref={setItemRefs(`${card.id}`) as any} 
                            onClick={evt => props.onStableItemClick(evt, card.id)} 
                            onMouseEnter={() => {
                                props.onStableItemMouseEnter(card.id);
                                setShowHover(card.id);
                            }} 
                            onMouseLeave={() => {
                                props.onStableItemMouseLeave(card.id)
                                setShowHover(undefined);
                            }}
                        >
                            <CardImage 
                                layoutId={`${card.id}`}
                                src={ImageLoader.load(card.image)} 
                                color={_typeToColor(card.type)} 
                                isGlowing={props.glowing.includes(card.id)} 
                                isTranslucent={props.highlightMode ? !props.highlightMode.includes(card.id) : false}
                            />
                            {showHover === card.id &&
                                <CardHover title={card.title} position={"bottom"} offset={{x: 80, y: 0}} color={_typeToColor(card.type)} text={cardDescription(card, context!.language)}>
                                {props.renderAccessoryHoverItem(card.id)}
                                </CardHover>
                            }
                        </StableItem>
                    );
                })}
                <Placeholder onClick={evt => {props.onPlaceHereClick(evt); playMouseClick();}}>
                    Place your cards here
                </Placeholder>
            </StableWrapper>
        </Wrapper>
    );
});

const Wrapper = styled.div`
    width: 820px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const StableWrapper = styled.div`
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 4px;
    background-color: #6D5031;
    padding: 0.5em;
    border-radius: 16px;
    min-height: 84px;
`;

const UpgradeDowngradeSection = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px dashed rgba(255, 255, 255, 0.35);
    border-radius: 12px;
    padding: 5px 12px;
    min-height: 46px;
`;

const SectionTag = styled.div`
    flex: none;
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    font-weight: 600;
    font-size: 0.8em;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.75);
`;

const UpgradeDowngradeRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    flex: 1;
`;

const EmptyNote = styled.span`
    font-size: 0.8em;
    font-style: italic;
    color: rgba(255, 255, 255, 0.4);
`;

const StableItem = styled.div`
    padding: 0 0.5em;
    cursor: pointer;
    position: relative;
    transition: transform 0.16s cubic-bezier(0.2, 0.9, 0.3, 1);
    &:hover {
        transform: translateY(-10px) scale(1.14);
        z-index: 20;
    }
`;

const glow = keyframes`
    from {
        box-shadow: 0 0px 40px #f0f, 0 0px 10px red, 0 0px 20px #0ff;
    }
    to {
        box-shadow: 0 0px 40px #0ff, 0 0px 10px #f0f, 0 0px 20px #f0f;
    }
`;

const CardImage = styled(motion.img)<{color: string, isGlowing: boolean, isTranslucent: boolean}>`
    width: 64px;
    height: 64px;
    border-radius: 12px;
    border: 4px solid ${props => props.color};
    animation: ${props => props.isGlowing ? css`${glow} 1s infinite alternate` : 'null'};
    opacity: ${props => !props.isTranslucent ? 1 : 0.5};
    transition: all 0.3s cubic-bezier(.25,.8,.25,1);
`;

const MiniCardImage = styled(motion.img)<{color: string, isGlowing: boolean, isTranslucent: boolean}>`
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 2px solid ${props => props.color};
    cursor: pointer;
    margin: 0 0.25em;
    animation: ${props => props.isGlowing ? css`${glow} 1s infinite alternate` : 'null'};
    opacity: ${props => !props.isTranslucent ? 1 : 0.5};
    transition: all 0.3s cubic-bezier(.25,.8,.25,1);
`;

const Placeholder = styled.div`
    background-color: rgba(0,0,0,0.18);
    flex: 1 0 150px;
    min-width: 150px;
    min-height: 64px;
    margin-left: 0.5em;
    padding: 0.4em;
    border-radius: 12px;
    border: 2px dashed rgba(255, 255, 255, 0.35);
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    font-family: 'Fredoka', 'Open Sans Condensed', sans-serif;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.15em;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.15s ease, border-color 0.15s ease;
    &:hover {
        background-color: rgba(248, 181, 0, 0.22);
        border-color: rgba(255, 209, 102, 0.8);
        color: #fff;
    }
`;

// keyframes



export default Stable;