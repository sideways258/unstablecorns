import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';

type Props = {
    color: string;
    text: string;
    text2?: string;
    offset: { x: number, y: number };
    position: "top" | "bottom";
    scale?: number;
    children?: ReactNode;
    title?: string;
}

// The tooltip is portalled to <body> and positioned in viewport space, clamped
// so it's always fully on screen. This keeps it from being clipped by the board's
// `overflow: hidden` / the scaled board container.
const CardHover = (props: Props) => {
    const anchorRef = useRef<HTMLSpanElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ left: number, top: number } | null>(null);

    useLayoutEffect(() => {
        const a = anchorRef.current;
        if (!a) return;
        const r = a.getBoundingClientRect();
        const b = boxRef.current;
        const bw = b ? b.offsetWidth : 300;
        const bh = b ? b.offsetHeight : 180;
        const margin = 8;

        let left = r.left + props.offset.x;
        let top = (props.position === "top" ? r.top : r.bottom) + props.offset.y;

        left = Math.min(Math.max(margin, left), window.innerWidth - bw - margin);
        top = Math.min(Math.max(margin, top), window.innerHeight - bh - margin);

        setPos(prev => (prev && prev.left === left && prev.top === top) ? prev : { left, top });
    });

    const tooltip = (
        <Fixed
            ref={boxRef}
            style={{
                left: pos ? pos.left : -9999,
                top: pos ? pos.top : -9999,
                opacity: pos ? 1 : 0,
                transform: props.scale ? `scale(${props.scale})` : undefined,
            }}
        >
            <InnerWrapper color={props.color}>
                {props.title &&
                    <div style={{ fontSize: "1.35em", fontWeight: 700 }}>{props.title}</div>
                }
                <div>{props.text}</div>
                <div>{props.children}</div>
            </InnerWrapper>
            {props.text2 &&
                <InnerWrapper color={"#FFFFFF"} style={{ marginTop: "0.7em" }}>
                    <div>{props.text2}</div>
                </InnerWrapper>
            }
        </Fixed>
    );

    return (
        <>
            <span ref={anchorRef} style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }} />
            {createPortal(tooltip, document.body)}
        </>
    );
}

const hoverIn = keyframes`
    from { opacity: 0; transform: translateY(6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const Fixed = styled.div`
    position: fixed;
    z-index: 120000;
    width: min(300px, calc(100vw - 16px));
    transform-origin: top left;
    transition: opacity 0.1s ease;
`;

const InnerWrapper = styled.div<{ color: string }>`
    background-color: ${props => props.color};
    border-radius: 16px;
    padding: 16px 18px;
    color: ${props => props.color === "#FFFFFF" ? "#111" : "white"};
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    font-size: 13px;
    line-height: 1.4;
    border: 2px solid rgba(255, 255, 255, 0.6);
    box-shadow: 5px 6px 0 2px rgba(0, 33, 58, 0.55), 0 18px 40px rgba(0, 0, 0, 0.45);
    cursor: default;
    animation: ${hoverIn} 0.12s ease both;

    & > div { word-break: break-word; }
`;

export default CardHover;
