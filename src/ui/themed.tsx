import styled from 'styled-components';
import { BOARD_BG, COLORS } from '../theme';

// Full-screen board-background surface used by the landing / seat-picker / game-over screens.
export const Screen = styled.div`
  width: 100%;
  min-height: 100vh;
  background-image: url(${BOARD_BG});
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* centre when it fits, fall back to top (no clipping) when taller than the viewport */
  justify-content: safe center;
  padding: 64px 24px;
  box-sizing: border-box;
  overflow-y: auto;
  font-family: 'Open Sans', sans-serif;
`;

export const Panel = styled.div`
  background-color: ${COLORS.panel};
  color: ${COLORS.text};
  width: 100%;
  max-width: 460px;
  padding: 2em;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
`;

export const PanelTitle = styled.h1`
  margin: 0 0 0.6em;
  font-size: 26pt;
`;

export const PanelSubtitle = styled.h2`
  margin: 1.4em 0 0.6em;
  font-size: 15pt;
  font-weight: 600;
  color: ${COLORS.textMuted};
`;

export const Field = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 0.8em 1em;
  background-color: ${COLORS.inputBg};
  border: 1px solid ${COLORS.panelBorder};
  border-radius: 8px;
  font-size: 15pt;
  color: ${COLORS.text};
  outline: none;
  &::placeholder {
    color: ${COLORS.textMuted};
  }
`;

export const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 0.8em 1em;
  background-color: ${COLORS.inputBg};
  border: 1px solid ${COLORS.panelBorder};
  border-radius: 8px;
  font-size: 14pt;
  color: ${COLORS.text};
  outline: none;
  option {
    color: #000;
  }
`;

export const Button = styled.button<{ $variant?: 'primary' | 'ghost' | 'danger' }>`
  width: 100%;
  padding: 0.85em 1em;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14pt;
  cursor: pointer;
  transition: transform 0.05s ease, filter 0.15s ease;
  border: 2px solid ${COLORS.text};
  background-color: ${(p) =>
    p.$variant === 'ghost' ? 'transparent' : p.$variant === 'danger' ? COLORS.danger : COLORS.text};
  color: ${(p) => (p.$variant === 'ghost' || p.$variant === 'danger' ? COLORS.text : COLORS.panel)};
  &:hover {
    filter: brightness(1.08);
  }
  &:active {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const Row = styled.div`
  display: grid;
  gap: 12px;
`;

export const Label = styled.label`
  display: grid;
  gap: 6px;
  font-size: 12pt;
  color: ${COLORS.textMuted};
`;
