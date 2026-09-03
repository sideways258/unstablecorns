import { createPortal } from 'react-dom';
import styled from 'styled-components';
import ImageLoader from '../assets/card/imageLoader';
import type { Card } from '../game/card';
import { FONT_DISPLAY } from '../theme';

type Seat = { id: string; name: string };

type Props = {
  card: Card;
  self: Seat;
  others: Seat[];
  onPick: (targetPlayerID: string) => void;
  onCancel: () => void;
};

// Choose whose stable an Upgrade / Downgrade card goes into. Portalled so every
// player, whatever their seat or the board layout, has a clear way to place it.
// Upgrades go on your own stable; Downgrades go on another player's.
const UpgradeDowngradeTarget = ({ card, self, others, onPick, onCancel }: Props) => {
  const isUpgrade = card.type === 'upgrade';
  const targets: Seat[] = isUpgrade ? [self] : others;

  return createPortal(
    <Backdrop>
      <Panel>
        <Head>
          <img src={ImageLoader.load(card.image)} alt="" />
          <div>
            <Kind $up={isUpgrade}>{isUpgrade ? 'Upgrade' : 'Downgrade'}</Kind>
            <h2>{card.title}</h2>
            <p>{isUpgrade ? 'Place it in a stable:' : "Place it in another player's stable:"}</p>
          </div>
        </Head>

        <Targets>
          {targets.length === 0 && <Empty>No valid target.</Empty>}
          {targets.map((t) => (
            <TargetButton key={t.id} onClick={() => onPick(t.id)}>
              {t.id === self.id ? 'My stable' : t.name}
            </TargetButton>
          ))}
        </Targets>

        <CancelButton onClick={onCancel}>Cancel</CancelButton>
      </Panel>
    </Backdrop>,
    document.body
  );
};

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 12200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
`;

const Panel = styled.div`
  width: min(560px, 94vw);
  background: linear-gradient(180deg, #2a1a3f, #1c1230);
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  padding: 22px;
  color: #fff;
  font-family: ${FONT_DISPLAY};
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
`;

const Head = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;

  img {
    width: 74px;
    height: 74px;
    border-radius: 12px;
    flex: none;
    object-fit: cover;
  }
  h2 {
    margin: 4px 0 2px;
    font-size: clamp(15px, 3.4vw, 19px);
  }
  p {
    margin: 0;
    font-size: 11pt;
    color: rgba(255, 255, 255, 0.7);
  }
`;

const Kind = styled.span<{ $up: boolean }>`
  display: inline-block;
  font-size: 9pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${(p) => (p.$up ? 'linear-gradient(135deg, #4ade80, #148f4b)' : 'linear-gradient(135deg, #ff6b6b, #c81d25)')};
`;

const Targets = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin: 18px 0 14px;
`;

const TargetButton = styled.button`
  padding: 0.9em 1em;
  border-radius: 12px;
  border: 2px solid #fff;
  background: linear-gradient(135deg, #7c5cff, #ff5c8a);
  color: #fff;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: 13pt;
  cursor: pointer;
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.3);
  transition: transform 0.08s ease, filter 0.15s ease;
  &:hover {
    filter: brightness(1.08);
  }
  &:active {
    transform: translateY(3px);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3);
  }
`;

const CancelButton = styled.button`
  width: 100%;
  padding: 0.7em 1em;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: 11pt;
  cursor: pointer;
`;

const Empty = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 11pt;
`;

export default UpgradeDowngradeTarget;
