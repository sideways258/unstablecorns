import { ReactNode, useEffect, useState } from 'react';
import styled from 'styled-components';

// The Unstable Unicorns board is a fixed desktop layout. Rather than reflow it,
// we render it at a fixed design size and scale the whole thing down to fit the
// viewport (letter-boxed on a wooden "table"). Pinch-zoom still works for detail.
const DESIGN_W = 1440;
const DESIGN_H = 900;

const BoardShell = ({ children }: { children: ReactNode }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const compute = () => {
      const s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
      setScale(Math.min(1, s));
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, []);

  return (
    <Stage>
      <Scaled style={{ transform: `scale(${scale})` }}>{children}</Scaled>
      {scale < 0.6 && <RotateHint>Rotate to landscape for a bigger board · pinch to zoom</RotateHint>}
    </Stage>
  );
};

const Stage = styled.div`
  position: fixed;
  inset: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fredoka', 'Open Sans', sans-serif;

  /* the wooden table the play mat sits on */
  background-color: #362619;
  background-image:
    radial-gradient(1000px 720px at 8% -6%, rgba(248, 181, 0, 0.1), transparent 55%),
    radial-gradient(1100px 800px at 100% 106%, rgba(188, 71, 71, 0.14), transparent 55%),
    repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.18) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.34) 0 2px, transparent 2px 240px),
    linear-gradient(180deg, #4c3927 0%, #2b2014 100%);
  box-shadow: inset 0 0 240px 72px rgba(0, 0, 0, 0.62);
`;

const Scaled = styled.div`
  width: ${DESIGN_W}px;
  height: ${DESIGN_H}px;
  flex: none;
  transform-origin: center center;
`;

const RotateHint = styled.div`
  position: absolute;
  left: 50%;
  bottom: max(10px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.62);
  color: #fff;
  font-size: 10px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 999px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
`;

export default BoardShell;
