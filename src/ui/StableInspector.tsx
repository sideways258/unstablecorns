import { createPortal } from 'react-dom';
import styled from 'styled-components';
import ImageLoader from '../assets/card/imageLoader';
import type { Card, CardID } from '../game/card';
import { FONT_DISPLAY, COLORS } from '../theme';
import { _typeToColor } from './util';

type Props = {
  name: string;
  unicornCount: number;
  stable: Card[];
  upgradeDowngrade: Card[];
  onClose: () => void;
  /** When set, tiles become "pick a target" buttons; only ids in the list are selectable. */
  targetCardIDs?: CardID[];
  onPickTarget?: (cardID: CardID) => void;
};

// Full-screen look at any player's stable. Doubles as the target picker for
// magic cards: open a player's stable, then click the card you want to hit.
const StableInspector = ({ name, unicornCount, stable, upgradeDowngrade, onClose, targetCardIDs, onPickTarget }: Props) => {
  const picking = !!onPickTarget;
  const targets = targetCardIDs || [];

  const renderTile = (c: Card) => {
    const isTarget = picking && targets.indexOf(c.id) !== -1;
    return (
      <CardTile
        key={c.id}
        as={picking ? 'button' : 'div'}
        $color={_typeToColor(c.type)}
        $selectable={isTarget}
        $dim={picking && !isTarget}
        disabled={picking && !isTarget}
        onClick={picking && isTarget ? () => onPickTarget!(c.id) : undefined}
      >
        <img src={ImageLoader.load(c.image)} alt="" />
        <b>{c.title}</b>
        <span>{c.description.en}</span>
        {isTarget && <Tag>Target</Tag>}
      </CardTile>
    );
  };

  return createPortal(
    <Backdrop onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Head>
          <h2>{name}&rsquo;s stable</h2>
          <Count>{unicornCount} unicorn{unicornCount === 1 ? '' : 's'}</Count>
          <Close onClick={onClose}>✕</Close>
        </Head>

        {picking && (
          <PickHint>
            {targets.length > 0 ? 'Click the card you want to target.' : 'No valid target here — pick another player.'}
          </PickHint>
        )}

        <Section>Unicorns</Section>
        <Grid>
          {stable.length === 0 && <Empty>Stable is empty.</Empty>}
          {stable.map(renderTile)}
        </Grid>

        {upgradeDowngrade.length > 0 && (
          <>
            <Section>Upgrades / Downgrades</Section>
            <Grid>{upgradeDowngrade.map(renderTile)}</Grid>
          </>
        )}
      </Panel>
    </Backdrop>,
    document.body
  );
};

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

const CardTile = styled.div<{ $color: string; $selectable?: boolean; $dim?: boolean }>`
  position: relative;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid ${(p) => (p.$selectable ? '#ffd166' : p.$color)};
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  font: inherit;
  color: #fff;
  opacity: ${(p) => (p.$dim ? 0.35 : 1)};
  cursor: ${(p) => (p.$selectable ? 'pointer' : p.$dim ? 'not-allowed' : 'default')};
  box-shadow: ${(p) => (p.$selectable ? '0 0 0 3px rgba(255, 209, 102, 0.35), 0 10px 26px rgba(255, 209, 102, 0.3)' : 'none')};
  transition: transform 0.12s ease, box-shadow 0.12s ease;

  ${(p) =>
    p.$selectable &&
    `&:hover { transform: translateY(-4px); box-shadow: 0 0 0 3px rgba(255,209,102,0.6), 0 16px 32px rgba(255,209,102,0.4); }`}

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

const Tag = styled.span`
  position: absolute;
  top: -9px;
  left: 8px;
  font-size: 7.5pt !important;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #111 !important;
  background: #ffd166;
  padding: 2px 8px;
  border-radius: 999px;
`;

const PickHint = styled.div`
  margin: 8px 0 2px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 209, 102, 0.14);
  border: 1px solid rgba(255, 209, 102, 0.4);
  color: #ffe0a3;
  font-size: 10pt;
`;

const Empty = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 11pt;
`;

export default StableInspector;
