import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';

type Props = {
    color: string;
    text: string;
    text2?: string;
    // kept for call-site compatibility; the panel is now docked to the left edge
    offset?: { x: number, y: number };
    position?: "top" | "bottom";
    scale?: number;
    children?: ReactNode;
    title?: string;
}

// Docked to the left edge of the screen (portalled to <body>) so the description
// never covers the cards and never blocks clicking them (`pointer-events: none`).
const CardHover = (props: Props) => {
    return createPortal(
        <>
            <Dock>
                <InnerWrapper color={props.color}>
                    {props.title && <Title>{props.title}</Title>}
                    <Body>{props.text}</Body>
                </InnerWrapper>
                {props.text2 &&
                    <InnerWrapper color={"#FFFFFF"} style={{ marginTop: "10px" }}>
                        <Body>{props.text2}</Body>
                    </InnerWrapper>
                }
            </Dock>
            {props.children && <ActionDock>{props.children}</ActionDock>}
        </>,
        document.body
    );
}

const slideIn = keyframes`
    from { opacity: 0; transform: translate(-12px, -50%); }
    to   { opacity: 1; transform: translate(0, -50%); }
`;

const slideIn2 = keyframes`
    from { opacity: 0; transform: translate(-50%, -46%); }
    to   { opacity: 1; transform: translate(-50%, -50%); }
`;

const Dock = styled.div`
    position: fixed;
    left: max(20px, env(safe-area-inset-left));
    top: 44%;
    transform: translateY(-50%);
    width: min(360px, calc(100vw - 40px));
    z-index: 120000;
    pointer-events: none;           /* clicks pass straight through to the cards */
    animation: ${slideIn} 0.14s ease both;
`;

const InnerWrapper = styled.div<{ color: string }>`
    background-color: ${props => props.color};
    border-radius: 18px;
    padding: 18px 20px;
    color: ${props => props.color === "#FFFFFF" ? "#111" : "white"};
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    border: 3px solid rgba(255, 255, 255, 0.75);
    box-shadow: 6px 8px 0 2px rgba(0, 33, 58, 0.55), 0 22px 50px rgba(0, 0, 0, 0.5);
`;

const Title = styled.div`
    font-weight: 700;
    font-size: 22px;
    line-height: 1.15;
    margin-bottom: 6px;
`;

const Body = styled.div`
    font-size: 16px;
    line-height: 1.5;
    word-break: break-word;
`;

/* the rare interactive accessory (e.g. a "confirm discard" popup) - centred and
   clickable so it's still reachable now that the description is off to the side */
const ActionDock = styled.div`
    position: fixed;
    left: 50%;
    top: 58%;
    transform: translate(-50%, -50%);
    z-index: 120001;
    pointer-events: auto;
    animation: ${slideIn2} 0.14s ease both;
`;

export default CardHover;
