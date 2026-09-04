import styled, { keyframes } from 'styled-components';
import { FONT_DISPLAY } from '../theme';

type Props = {
    text: string;
    onClick: () => void;
};

// Big, obvious "activate this card's effect" button. Rendered by CardHover's
// ActionDock, which keeps it on screen for as long as the effect is pending, so
// it never disappears mid-click.
const CardPopupSingleAction = (props: Props) => {
    return (
        <Wrapper>
            <Button type="button" onClick={() => props.onClick()}>
                <span role="img" aria-label="sparkles">✨</span>
                {props.text}
            </Button>
        </Wrapper>
    );
};

const pulse = keyframes`
    0%, 100% { box-shadow: 0 8px 0 rgba(0,0,0,0.28), 0 0 0 0 rgba(124,92,255,0.55); }
    50%      { box-shadow: 0 8px 0 rgba(0,0,0,0.28), 0 0 0 14px rgba(124,92,255,0); }
`;

const Wrapper = styled.div`
    display: flex;
    justify-content: center;
`;

const Button = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 0.8em 1.5em;
    border: 3px solid #fff;
    border-radius: 16px;
    font-family: ${FONT_DISPLAY};
    font-weight: 800;
    font-size: 15pt;
    color: #fff;
    cursor: pointer;
    white-space: nowrap;
    background: linear-gradient(135deg, #7c5cff, #4b2fb5);
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.28);
    animation: ${pulse} 1.8s ease-in-out infinite;
    transition: transform 0.08s ease;

    &:hover {
        filter: brightness(1.08);
    }
    &:active {
        transform: translateY(6px);
        box-shadow: 0 2px 0 rgba(0, 0, 0, 0.28);
    }

    & > span[role='img'] {
        font-size: 1.05em;
        line-height: 1;
    }
`;

export default CardPopupSingleAction;
