import { FunctionComponent } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';

type Props = {
}

// A hint banner. Portalled to <body> and pinned near the top-centre of the
// viewport so it stays readable and never overlaps the hand (the board itself
// is rendered inside a scaled container).
const InfoLabel: FunctionComponent<Props> = (props) => {
    return createPortal(
        <Wrapper>
            {props.children}
        </Wrapper>,
        document.body
    );
}

const slideIn = keyframes`
    from { opacity: 0; transform: translate(-50%, -10px); }
    to   { opacity: 1; transform: translate(-50%, 0); }
`;

const Wrapper = styled.div`
    position: fixed;
    top: max(74px, calc(env(safe-area-inset-top) + 62px));
    left: 50%;
    transform: translateX(-50%);
    z-index: 11000;
    width: min(760px, 92vw);
    box-sizing: border-box;
    background: linear-gradient(180deg, rgba(30, 14, 26, 0.92), rgba(20, 10, 18, 0.96));
    border: 2px solid rgba(255, 255, 255, 0.18);
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    font-size: clamp(12px, 2.6vw, 15px);
    color: white;
    padding: 0.85em 1.3em;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.45);
    animation: ${slideIn} 0.28s ease both;
`;

export default InfoLabel;
