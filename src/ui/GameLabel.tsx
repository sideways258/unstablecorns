import styled, { keyframes } from 'styled-components';

type Props = {
    text: string;
}

const GameLabel = (props: Props) => {
    return (
        <Wrapper>
            <span role="img" aria-label="sparkles">✨</span>
            {props.text}
        </Wrapper>
    );
}

const pop = keyframes`
    0%   { transform: scale(0.7) translateY(-12px); opacity: 0; }
    60%  { transform: scale(1.06) translateY(0); opacity: 1; }
    100% { transform: scale(1); }
`;

const bob = keyframes`
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-3px); }
`;

const Wrapper = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: 'Fredoka', 'Open Sans Condensed', sans-serif;
    font-weight: 600;
    font-size: 1.1em;
    color: #5c3200;
    padding: 0.7em 1.4em;
    border-radius: 999px;
    margin-top: 1em;
    background: linear-gradient(135deg, #ffe08a 0%, #f8b500 60%, #f59e0b 100%);
    border: 3px solid #ffffff;
    box-shadow: 0 8px 0 rgba(176, 118, 0, 0.5), 0 16px 34px rgba(0, 0, 0, 0.32);
    animation: ${pop} 0.42s cubic-bezier(0.2, 0.9, 0.3, 1) both, ${bob} 2.6s ease-in-out 0.5s infinite;

    & > span {
        font-size: 1.15em;
        line-height: 1;
    }
`;

export default GameLabel;
