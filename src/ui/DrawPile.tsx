import styled, { css, keyframes } from 'styled-components';
import type { Card } from "../game/card";
import ImageLoader from '../assets/card/imageLoader';
import { _typeToColor } from './util';
import BACK from '../assets/card/UU-Back-Main.png';
import useSound from '../audio';
const HubMouseOverSound = require('../assets/sound/Hub_Mouseover.ogg').default;

type Props = {
    count: number;
    isGlowing: boolean;
    onClick: () => void;
}

const DrawPile = (props: Props) => {
    const [playHubMouseOverSound] = useSound(HubMouseOverSound, {
        volume: 0.2,
    });

    return (
        <Wrapper onMouseEnter={() => playHubMouseOverSound()} isGlowing={props.isGlowing} onClick={() => props.onClick()}>

        </Wrapper>
    );
}

const Wrapper = styled.div<{isGlowing: boolean}>`
    width: 100px;
    height: 130px;
    background-image: url(${BACK});
    background-size: cover;
    background-repeat: no-repeat;
    cursor: pointer;
    animation: ${props => props.isGlowing ? css`${glow} 1s infinite alternate` : 'null'};
    border-radius: 16px;
    border: 4px solid #1c1c1c;
    transform: rotate(4deg);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.4);
    transition: transform 0.16s cubic-bezier(0.2, 0.9, 0.3, 1), box-shadow 0.16s ease;
    &:hover {
        transform: rotate(2deg) translateY(-10px) scale(1.08);
        box-shadow: 0 18px 30px rgba(0, 0, 0, 0.45), 0 0 22px rgba(255, 209, 102, 0.55);
    }
    &:active {
        transform: rotate(3deg) translateY(-2px) scale(1.02);
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

export default DrawPile;