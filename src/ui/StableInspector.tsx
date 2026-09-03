import { createPortal } from 'react-dom';
import styled from 'styled-components';
import ImageLoader from '../assets/card/imageLoader';
import type { Card } from '../game/card';
import { FONT_DISPLAY, COLORS } from '../theme';
import { _typeToColor } from './util';

type Props = {
  name: string;
  unicornCount: number;
  stable: Card[];
  upgradeDowngrade: Card[];
  onClose: () => void;
};

// Full-screen look at any player's stable (unicorns + upgrades / downgrades).
const StableInspector = ({ name, unicornCount, stable, upgradeDowngrade, onClose }: Props) =>
  createPortal(
    <Backdrop onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Head>
          <h2>{name}&rsquo;s stable</h2>
          <Count>{unicornCount} unicorn{unicornCount === 1 ? '' : 's'}</Count>
          <Close onClick={onClose}>✕</Close>
        </Head>

        <Section>Unicorns</Section>
        <Grid>
          {stable.length === 0 && <Empty>Stable is empty.</Empty>}
          {stable.map((c) => (
            <CardTile key={c.id} $color={_typeToColor(c.type)}>
              <img src={ImageLoader.load(c.image)} alt="" />
              <b>{c.title}</b>
              <span>{c.description.en}</span>
            </CardTile>
          ))}
        </Grid>

        {upgradeDowngrade.length > 0 && (
          <>
            <Section>Upgrades / Downgrades</Section>
            <Grid>
              {upgradeDowngrade.map((c) => (
                <CardTile key={c.id} $color={_typeToColor(c.type)}>
                  <img src={ImageLoader.load(c.image)} alt="" />
                  <b>{c.title}</b>
                  <span>{c.description.en}</span>
                </CardTile>
              ))}
            </Grid>
          </>
        )}
      </Panel>
    </Backdrop>,
    document.body
  );

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 12100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
`;

const Panel = styled.div`
  width: min(900px, 96vw);
  max-height: 88vh;
  overflow-y: auto;
  background: linear-gradient(180deg, #2a1a3f, #1a1130);
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  padding: 22px;
  color: #fff;
  font-family: ${FONT_DISPLAY};
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: clamp(16px, 3.6vw, 21px);
    flex: 1;
  }
`;

const Count = styled.span`
  font-size: 10pt;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #7c5cff, #ff5c8a);
`;

const Close = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  font-size: 16pt;
  cursor: pointer;
  line-height: 1;
`;

const Section = styled.div`
  margin: 18px 0 10px;
  font-size: 9.5pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${COLORS.textMuted};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
`;

const CardTile = styled.div<{ $color: string }>`
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid ${(p) => p.$color};
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  img {
    width: 100%;
    border-radius: 8px;
    display: block;
  }
  b {
    font-size: 10.5pt;
  }
  span {
    font-size: 8.5pt;
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.25;
  }
`;

const Empty = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 11pt;
`;

export default StableInspector;
