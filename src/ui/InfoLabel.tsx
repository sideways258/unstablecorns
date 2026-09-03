import { FunctionComponent } from 'react';
import styled, { keyframes } from 'styled-components';

type Props = {
}

const InfoLabel: FunctionComponent<Props> = (props) => {
    return (
        <Wrapper>
            {props.children}
        </Wrapper>
    );
}

const slideIn = keyframes`
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const Wrapper = styled.div`
    width: 800px;
    background: linear-gradient(180deg, rgba(30, 14, 26, 0.82), rgba(20, 10, 18, 0.9));
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 2px solid rgba(255, 255, 255, 0.16);
    font-family: 'Fredoka', 'Open Sans Condensed', sans-serif;
    font-size: 1.05em;
    color: white;
    padding: 1em 1.4em;
    border-radius: 18px;
    margin-top: 1em;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.4);
    animation: ${slideIn} 0.3s ease both;
`;

export default InfoLabel;
