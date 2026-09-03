import styled, { css, keyframes } from 'styled-components';
import { Card, CardID, CardType } from '../game/card';
import ImageLoader from '../assets/card/imageLoader';
import _ from 'underscore';
import { _typeToColor } from './util';
import CardHover from './CardHover';
import { useContext, useState } from 'react';

import useSound from '../audio';
import { LanguageContext } from '../LanguageContextProvider';
import { cardDescription } from '../BoardUtil';
const HandOverSound = require('../assets/sound/collection_manager_card_mouse_over.ogg').default;

type Props = {
    cards: Card[];
    glowingCards: CardID[];
    onClick: (evt: React.MouseEvent, cardID: CardID) => void;
    onMouseEnterHandCard: (index: number) => void;
    onMouseLeaveHandCard: (index: number) => void;
}

const Hand = (props: Props) => {

    const [hoverCardID, setHoverCardID] = useState<CardID | undefined>(undefined);
    const [playHandOverCardSound] = useSound(HandOverSound, {
        volume: 0.3,
    });
    const context = useContext(LanguageContext)


    return (
        <Wrapper>
            {props.cards.map((card, idx) => {
                const onMouseEnter = () => {
                    playHandOverCardSound();
                    props.onMouseEnterHandCard(idx);
                    setHoverCardID(card.id);
                }

                const onMouseLeave = () => {
                    props.onMouseLeaveHandCard(idx);
                    setHoverCardID(undefined);
                };

                let typeText: string | undefined = undefined;
                switch (card.type) {
                    case "upgrade": {
                        typeText = "An upgrade card can be placed in any stable and grants the stable owner a positive effect.";
                        break;
                    }
                    case "downgrade": {
                        typeText = "A downgrade card can be placed in any stable and grants the stable owner a negative effect.";
                        break;
                    }
                    case "neigh":
                    case "super_neigh": {
                        typeText = "This card can be played at any time any other players plays a card.";
                        break;
                    }
                }

                return (
                    <CardWrapper key={card.id} transform={_transformForCard(idx, props.cards.length)} onClick={(evt) => props.onClick(evt, card.id)} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} bringToForeground={hoverCardID === card.id}>
                        <Face borderColor={_typeToColor(card.type)} isGlowing={props.glowingCards.includes(card.id)}>
                            <Top>
                                <Type fontColor={_typeToColor(card.type)}>
                                    <img src={ImageLoader.icon(card.type)} width={"20px"}/>
                                    {_typeToString(card.type)}
                                </Type>
                                <Title>
                                    {card.title}
                                </Title>
                            </Top>
                            <CardImage image={ImageLoader.load(card.image)} />
                        </Face>
                        {hoverCardID === card.id &&
                            <CardHover title={card.title} scale={0.75} position="top" offset={{ x: idx < 3 ? 210 : -220, y: -40 }} text={cardDescription(card, context!.language)} color={_typeToColor(card.type)} text2={typeText} />
                        }
                    </CardWrapper>
                );
            })}
        </Wrapper>
    );
}

const Wrapper = styled.div`
    position: relative;
    display: flex;
    justify-content: center;
    padding: 1em;
    font-family: 'Open Sans Condensed', sans-serif;
`;

/* The slot keeps a fixed hit-box and only carries the fan position, so hovering
   never moves the element out from under the cursor (no flicker). The visual
   enlarge lives on <Face>. */
const CardWrapper = styled.div<{ bringToForeground: boolean, transform: { x: number, y: number, rotate: string } }>`
    --rot: ${props => props.transform.rotate};
    position: relative;
    width: 128px;
    height: 182px;
    cursor: pointer;
    transform: translate(${props => props.transform.x}px, ${props => props.transform.y}px) rotate(var(--rot));
    z-index: ${props => props.bringToForeground ? 40 : 0};
    &:hover {
        z-index: 50;
    }
`;

const Face = styled.div<{ borderColor: string, isGlowing: boolean }>`
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: white;
    border: 6px solid ${props => props.borderColor};
    box-shadow: 0 6px 14px rgba(0,0,0,0.28), 0 2px 4px rgba(0,0,0,0.22);
    transform-origin: bottom center;
    transition: transform 0.18s cubic-bezier(.2,.9,.3,1), box-shadow 0.18s ease, filter 0.18s ease;
    animation: ${props => props.isGlowing ? css`${glow} 1s infinite alternate` : 'null'};

    ${CardWrapper}:hover & {
        transform: rotate(calc(-1 * var(--rot, 0deg))) translateY(-58%) scale(1.6);
        box-shadow: 0 30px 55px rgba(0,0,0,0.45);
        filter: drop-shadow(0 0 16px rgba(255, 209, 102, 0.55));
    }
`;

const Top = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 6px 8px 2px;
    box-sizing: border-box;
`;

const Type = styled.div<{ fontColor: string }>`
    display: flex;
    align-items: center;
    gap: 3px;
    font-family: 'Fredoka', 'Open Sans Condensed', sans-serif;
    font-weight: 600;
    font-size: 10px;
    color: ${props => props.fontColor};
    img { width: 14px; height: 14px; }
`;

const Title = styled.div`
    font-family: 'Fredoka', 'Open Sans Condensed', sans-serif;
    font-weight: 600;
    font-size: 12px;
    line-height: 1.1;
`;

const CardImage = styled.div<{ image: string }>`
    background-image: url(${props => props.image});
    background-size: cover;
    background-repeat: no-repeat;
    height: 100%;
    width: 100%;
`;

const glow = keyframes`
    from {
        box-shadow: 0 0px 40px #f0f, 0 0px 10px red, 0 0px 20px #0ff;
    }
    to {
        box-shadow: 0 0px 40px #0ff, 0 0px 10px #f0f, 0 0px 20px #f0f;
    }
`;

function _typeToString(type: CardType): string {
    if (type === "baby") {
        return "Baby";
    }

    if (type === "basic") {
        return "Basic"
    }

    if (type === "downgrade") {
        return "Downgrade";
    }

    if (type === "upgrade") {
        return "Upgrade";
    }

    if (type === "narwhal") {
        return "Narwhal";
    }

    if (type === "neigh") {
        return "Neigh";
    }

    if (type === "super_neigh") {
        return "Super Neigh";
    }

    if (type === "magic") {
        return "Magic";
    }

    if (type === "unicorn") {
        return "Unicorn";
    }

    return "Undefined";
}

function _transformForCard(idx: number, countCards: number): { x: number, y: number, rotate: string } {
    const midIdx = (countCards / 2);
    let degStep = 0;
    let xStep = 0;
    let yStep = 0;
    if (countCards <= 6) {
        degStep = 5;
        xStep = -26;
        yStep = 5;
    } else if (countCards <= 8) {
        degStep = 5.5;
        xStep = -66;
        yStep = 2.2;
    } else {
        degStep = 4;
        xStep = -74;
        yStep = 0.8;
    }

    return { x: (idx - midIdx) * xStep, y: Math.abs(idx - midIdx) * Math.abs(idx - midIdx) * yStep, rotate: `${(idx - midIdx) * degStep}deg` };
}

export default Hand;