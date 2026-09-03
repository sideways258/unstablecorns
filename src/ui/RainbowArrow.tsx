import { createPortal } from 'react-dom';

type Props = {
    from: { x: number, y: number };
    to: { x: number, y: number };
};

// `from`/`to` are viewport (clientX/Y) coordinates. The board itself is rendered
// inside a scaled/translated container (BoardShell) on small screens, so this
// arrow is portalled to <body> to draw in true viewport space.
const RainbowArrow = ({ from, to }: Props) => {
    return createPortal(
        <svg
            style={{
                position: "fixed",
                left: 0,
                top: 0,
                width: "100vw",
                height: "100vh",
                zIndex: 9000,
                pointerEvents: "none",
            }}
        >
            <defs>
                <linearGradient id="myGradient" gradientTransform="rotate(90)">
                    <stop offset="12.5%" stopColor="#E02020" />
                    <stop offset="25%" stopColor="#FA6400" />
                    <stop offset="37.5%" stopColor="#F7B500" />
                    <stop offset="50%" stopColor="#6DD400" />
                    <stop offset="62.5%" stopColor="#0091FF" />
                    <stop offset="75%" stopColor="#6236FF" />
                    <stop offset="87.5%" stopColor="#B620E0" />
                </linearGradient>
            </defs>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} style={{ strokeWidth: 25 }} strokeDasharray="20" stroke="url('#myGradient')" />
        </svg>,
        document.body
    );
}

export default RainbowArrow;
