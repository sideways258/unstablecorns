import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import useSound from '../audio';
const MouseClickSound = require('../assets/sound/UI_MouseClick_01.ogg').default;

type Props = {
    targetName: string;
    /** True for the player the vote is about - they don't get a ballot. */
    isTarget: boolean;
    /** Undefined until this player has cast a vote. */
    myVote?: 'yes' | 'no';
    yesCount: number;
    noCount: number;
    /** How many ballots are still outstanding (eligible voters who haven't voted). */
    pendingCount: number;
    isHost: boolean;
    onVoteYes: () => void;
    onVoteNo: () => void;
    onCancel?: () => void;
};

// Full-screen popup shown to everyone while a host-started kick vote is in
// progress - mirrors NeighLabel's look so the two "everyone stop and decide
// something" moments feel consistent.
const KickVoteLabel = (props: Props) => {
    const [playMouseClick] = useSound(MouseClickSound, { volume: 0.4 });

    return createPortal(
        <Backdrop>
            <Wrapper>
                <Title>🚫 Vote to kick {props.targetName}</Title>

                {props.isTarget ? (
                    <Text>The table is voting on whether to remove you from the game. Sit tight...</Text>
                ) : props.myVote ? (
                    <Text>
                        You voted <b>{props.myVote === 'yes' ? 'yes' : 'no'}</b>. Waiting on {props.pendingCount} more
                        vote{props.pendingCount === 1 ? '' : 's'}...
                    </Text>
                ) : (
                    <Text>Should {props.targetName} be forced out of the game?</Text>
                )}

                <Tally>
                    <TallyChip $tone="yes">Yes: {props.yesCount}</TallyChip>
                    <TallyChip $tone="no">No: {props.noCount}</TallyChip>
                </Tally>

                {!props.isTarget && !props.myVote && (
                    <Buttons>
                        <NoButton
                            onClick={() => {
                                props.onVoteNo();
                                playMouseClick();
                            }}
                        >
                            No
                        </NoButton>
                        <YesButton
                            onClick={() => {
                                props.onVoteYes();
                                playMouseClick();
                            }}
                        >
                            Yes, kick them
                        </YesButton>
                    </Buttons>
                )}

                {props.isHost && props.onCancel && (
                    <CancelButton
                        onClick={() => {
                            props.onCancel!();
                            playMouseClick();
                        }}
                    >
                        Cancel vote
                    </CancelButton>
                )}
            </Wrapper>
        </Backdrop>,
        document.body
    );
};

const popIn = keyframes`
    from { opacity: 0; transform: scale(0.88); }
    to   { opacity: 1; transform: scale(1); }
`;

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 12050;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
    background: rgba(0, 0, 0, 0.4);
`;

const Wrapper = styled.div`
    background: linear-gradient(180deg, rgba(46, 16, 16, 0.96), rgba(24, 8, 8, 0.98));
    border: 2px solid rgba(255, 107, 107, 0.55);
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    color: #fff;
    padding: 22px 26px;
    border-radius: 22px;
    width: min(460px, 94vw);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
    animation: ${popIn} 0.18s ease both;
`;

const Title = styled.div`
    font-size: clamp(14px, 3vw, 18px);
    font-weight: 800;
`;

const Text = styled.div`
    font-size: 11pt;
    color: rgba(255, 255, 255, 0.85);

    b {
        color: #fff;
    }
`;

const Tally = styled.div`
    display: flex;
    gap: 10px;
`;

const TallyChip = styled.span<{ $tone: 'yes' | 'no' }>`
    padding: 0.3em 0.9em;
    border-radius: 999px;
    font-size: 10pt;
    font-weight: 700;
    color: #fff;
    background: ${props => (props.$tone === 'yes' ? 'linear-gradient(135deg, #ff6b6b, #c81d25)' : 'linear-gradient(135deg, #4ade80, #148f4b)')};
`;

const Buttons = styled.div`
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
`;

const chunky = `
    padding: 0.75em 1.4em;
    min-height: 44px;
    border-radius: 14px;
    cursor: pointer;
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    font-weight: 700;
    font-size: clamp(12px, 2.8vw, 15px);
    color: #fff;
    border: 3px solid #fff;
    user-select: none;
    transition: transform 0.08s ease, filter 0.15s ease;
    &:hover { filter: brightness(1.1); }
    &:active { transform: translateY(3px); box-shadow: 0 2px 0 rgba(0,0,0,0.4) !important; }
`;

const YesButton = styled.button`
    ${chunky}
    background: linear-gradient(135deg, #ff6b6b, #c81d25);
    box-shadow: 0 5px 0 rgba(0, 0, 0, 0.35);
`;

const NoButton = styled.button`
    ${chunky}
    background: linear-gradient(135deg, #4ade80, #148f4b);
    box-shadow: 0 5px 0 rgba(0, 0, 0, 0.35);
`;

const CancelButton = styled.button`
    margin-top: 4px;
    padding: 0.35em 0.9em;
    border-radius: 999px;
    font-family: 'Fredoka', 'Open Sans', sans-serif;
    font-weight: 700;
    font-size: 9.5pt;
    color: #fff;
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.6);
    background: transparent;
    &:hover { background: rgba(255, 255, 255, 0.1); }
`;

export default KickVoteLabel;
