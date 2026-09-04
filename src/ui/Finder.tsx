import { useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import ImageLoader from '../assets/card/imageLoader';
import BG from '../assets/ui/board-background.jpg';
import { cardDescription } from '../BoardUtil';
import { Card, CardID } from '../game/card';
import { LanguageContext } from '../LanguageContextProvider';
import CardHover from './CardHover';
import { _typeToColor } from './util';

type Props = {
    cards: Card[];
    showBackButton?: boolean;
    onBackClick: () => void;
    onCardClick: (cardID: CardID) => void;
    title?: string;
    hide?: boolean;
    /** if provided, only these cards can be clicked - every other card is
     *  shown dimmed and inert (e.g. non-Unicorn cards while reviving a
     *  Unicorn from the discard pile). Undefined means every card is live. */
    selectableCardIDs?: CardID[];
}

const Finder = (props: Props) => {
    const [showHover, setShowHover] = useState<CardID | undefined>(undefined);
    const context = useContext(LanguageContext)

    // Portalled to <body> so it's a real full-screen overlay (the board itself is
    // rendered inside a scaled container).
    return createPortal(
        <Wrapper>
            <Header>
                {(props.showBackButton === undefined || props.showBackButton === true) &&
                    <BackBtn onClick={() => props.onBackClick()}>← Go back</BackBtn>
                }
                {props.title && <TitleTag>{props.title}</TitleTag>}
            </Header>

            <List>
                {props.cards.map((card, idx) => {
                    const selectable = !props.selectableCardIDs || props.selectableCardIDs.indexOf(card.id) !== -1;
                    return (
                        <Item key={card.id} onMouseEnter={() => setShowHover(card.id)} onMouseLeave={() => setShowHover(undefined)}>
                            <div onClick={() => selectable && props.onCardClick(card.id)}>
                                <CardImage
                                    image={props.hide ? ImageLoader.load("back") : ImageLoader.load(card.image)}
                                    color={props.hide ? "black" : _typeToColor(card.type)}
                                    $disabled={!selectable}
                                />
                            </div>
                            {(!props.hide) && showHover === card.id && idx % 5 <= 2 &&
                                <CardHover title={card.title} position={"top"} offset={{ x: 150, y: 20 }} color={_typeToColor(card.type)} text={cardDescription(card, context!.language)} />
                            }
                            {(!props.hide) && showHover === card.id && idx % 5 > 2 &&
                                <CardHover title={card.title} position={"top"} offset={{ x: -300, y: 20 }} color={_typeToColor(card.type)} text={cardDescription(card, context!.language)} />
                            }
                        </Item>
                    );
                })}
            </List>
        </Wrapper>,
        document.body
    );
}

const Wrapper = styled.div`
    position: fixed;
    inset: 0;
    z-index: 100000;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: #241d14;
    background-image: url(${BG});
    background-size: cover;
    background-position: center;
    font-family: 'Fredoka', 'Open Sans', sans-serif;
`;

const Header = styled.div`
    flex: none;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: max(14px, env(safe-area-inset-top)) 16px 12px;
    box-sizing: border-box;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
`;

const BackBtn = styled.button`
    background: linear-gradient(135deg, #ff5c6e, #c80000);
    color: #fff;
    border: 3px solid #fff;
    border-radius: 999px;
    padding: 0.6em 1.4em;
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    font-weight: 700;
    font-size: 13pt;
    cursor: pointer;
    box-shadow: 0 5px 0 rgba(120, 0, 0, 0.5);
    &:active {
        transform: translateY(3px);
        box-shadow: 0 2px 0 rgba(120, 0, 0, 0.5);
    }
`;

const TitleTag = styled.p`
    margin: 0;
    padding: 0.7em 1.1em;
    background-color: #f8b500;
    border-radius: 12px;
    color: #fff;
    font-weight: 600;
`;

const List = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    justify-content: center;
    gap: 6px;
    width: min(860px, 100%);
    padding: 16px 8px 32px;
    box-sizing: border-box;
`;

const Item = styled.div`
    position: relative;
`;

const CardImage = styled.div<{ image: string; color: string; $disabled?: boolean }>`
    width: clamp(96px, 26vw, 128px);
    height: clamp(120px, 33vw, 160px);
    background-image: url(${props => props.image});
    background-size: cover;
    border-radius: 12px;
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    margin: 8px;
    border: 4px solid ${props => props.color};
    opacity: ${props => props.$disabled ? 0.35 : 1};
    filter: ${props => props.$disabled ? 'grayscale(0.7)' : 'none'};
    transition: transform 0.12s ease, opacity 0.12s ease;
    &:hover {
        transform: ${props => props.$disabled ? 'none' : 'translateY(-6px) scale(1.05)'};
    }
`;

export default Finder;
