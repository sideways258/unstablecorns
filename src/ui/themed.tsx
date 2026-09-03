import styled, { keyframes, createGlobalStyle } from 'styled-components';
import { BOARD_BG, COLORS, GRADIENTS, FONT_DISPLAY, FONT_BODY, RADIUS, SHADOW } from '../theme';

// Drop <ThemeFX/> once near the app root for shared keyframes / base tweaks.
export const ThemeFX = createGlobalStyle`
  :root { color-scheme: dark; }
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  * { -webkit-tap-highlight-color: transparent; }
  button, [role="button"], a, input, select, label { touch-action: manipulation; }
  ::selection { background: ${COLORS.primary}; color: #fff; }
`;

const drift = keyframes`
  0%   { transform: translate3d(0,0,0) scale(1); }
  50%  { transform: translate3d(4%, -3%, 0) scale(1.12); }
  100% { transform: translate3d(0,0,0) scale(1); }
`;

const floatIn = keyframes`
  from { opacity: 0; transform: translate3d(0, 18px, 0) scale(0.98); }
  to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
`;

// Full-screen animated background used by every out-of-game screen.
export const Screen = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  padding: clamp(52px, 12vw, 72px) clamp(14px, 5vw, 26px) clamp(34px, 11vw, 56px);
  padding-left: max(clamp(14px, 5vw, 26px), env(safe-area-inset-left));
  padding-right: max(clamp(14px, 5vw, 26px), env(safe-area-inset-right));
  overflow-x: hidden;
  overflow-y: auto;
  background: ${GRADIENTS.page};
  color: ${COLORS.text};
  font-family: ${FONT_BODY};

  /* soft wood texture, very faint - fixed so it never adds scroll height */
  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url(${BOARD_BG});
    background-size: cover;
    background-position: center;
    opacity: 0.06;
    mix-blend-mode: overlay;
    pointer-events: none;
    z-index: 0;
  }
  /* drifting colour blob */
  &::after {
    content: '';
    position: fixed;
    width: 60vmax;
    height: 60vmax;
    left: -20vmax;
    bottom: -25vmax;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 50%, rgba(255, 209, 102, 0.22), transparent 65%);
    animation: ${drift} 22s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
  }
`;

export const Panel = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 480px;
  padding: clamp(18px, 5.5vw, 30px) clamp(18px, 5.5vw, 30px) clamp(22px, 6.5vw, 34px);
  border-radius: ${RADIUS};
  color: ${COLORS.text};
  background: ${COLORS.panel};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${COLORS.panelBorder};
  box-shadow: ${SHADOW}, inset 0 1px 0 rgba(255, 255, 255, 0.08);
  animation: ${floatIn} 0.45s cubic-bezier(0.2, 0.9, 0.3, 1) both;

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 4px;
    border-radius: ${RADIUS} ${RADIUS} 0 0;
    background: ${GRADIENTS.hero};
  }
`;

export const PanelTitle = styled.h1`
  margin: 0 0 0.5em;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: clamp(23px, 6.5vw, 34px);
  line-height: 1.08;
  letter-spacing: 0.5px;
  overflow-wrap: anywhere;
`;

export const PanelSubtitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 1.6em 0 0.7em;
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: clamp(10px, 3vw, 13px);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${COLORS.textMuted};

  &::before {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${GRADIENTS.hero};
    box-shadow: 0 0 12px ${COLORS.primary};
  }
`;

export const Field = styled.input`
  width: 100%;
  box-sizing: border-box;
  min-height: 46px;
  padding: 0.85em 1em;
  background: ${COLORS.inputBg};
  border: 1.5px solid ${COLORS.panelBorder};
  border-radius: 12px;
  font-family: ${FONT_DISPLAY};
  font-size: 17px;
  letter-spacing: 0.14em;
  color: ${COLORS.text};
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;

  &::placeholder {
    color: ${COLORS.textMuted};
    letter-spacing: normal;
  }
  &:focus {
    border-color: ${COLORS.accentB};
    background: rgba(255, 255, 255, 0.12);
    box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.18);
  }
`;

export const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  min-height: 46px;
  padding: 0.85em 1em;
  background: ${COLORS.inputBg};
  border: 1.5px solid ${COLORS.panelBorder};
  border-radius: 12px;
  font-family: ${FONT_DISPLAY};
  font-size: 17px;
  color: ${COLORS.text};
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: ${COLORS.accentB};
    box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.18);
  }
  option {
    color: #111;
  }
`;

export const Button = styled.button<{ $variant?: 'primary' | 'ghost' | 'danger' }>`
  position: relative;
  width: 100%;
  min-height: 48px;
  padding: 0.9em 1.1em;
  border: none;
  border-radius: 14px;
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: clamp(14px, 3.6vw, 19px);
  letter-spacing: 0.3px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.08s ease, box-shadow 0.12s ease, filter 0.15s ease;
  color: ${(p) => (p.$variant === 'ghost' ? COLORS.text : '#fff')};
  background: ${(p) =>
    p.$variant === 'ghost'
      ? 'rgba(255,255,255,0.06)'
      : p.$variant === 'danger'
      ? `linear-gradient(135deg, ${COLORS.danger}, ${COLORS.dangerDark})`
      : GRADIENTS.hero};
  box-shadow: ${(p) =>
    p.$variant === 'ghost'
      ? `inset 0 0 0 1.5px ${COLORS.panelBorder}`
      : '0 6px 0 rgba(0,0,0,0.28), 0 12px 24px rgba(0,0,0,0.28)'};

  /* shine sweep */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -60%;
    width: 40%;
    height: 100%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.35), transparent);
    transform: skewX(-18deg);
    transition: left 0.5s ease;
  }
  &:hover {
    filter: brightness(1.06);
  }
  &:hover::after {
    left: 130%;
  }
  &:active {
    transform: translateY(4px);
    box-shadow: ${(p) => (p.$variant === 'ghost' ? `inset 0 0 0 1.5px ${COLORS.panelBorder}` : '0 2px 0 rgba(0,0,0,0.28)')};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

export const Row = styled.div`
  display: grid;
  gap: 12px;
`;

export const Label = styled.label`
  display: grid;
  gap: 6px;
  font-size: 11pt;
  color: ${COLORS.textMuted};
`;

export const OrDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 24px 0 6px;
  color: ${COLORS.textMuted};
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10pt;
  letter-spacing: 0.14em;

  & > span {
    padding: 4px 12px;
    border-radius: 999px;
    border: 1.5px solid ${COLORS.panelBorder};
    background: ${COLORS.inputBg};
  }
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1.5px;
    background: linear-gradient(90deg, transparent, ${COLORS.panelBorder}, transparent);
  }
`;

// Small helper: an "arcade display" for the lobby code.
export const CodeDisplay = styled.div`
  font-family: ${FONT_DISPLAY};
  font-weight: 700;
  font-size: clamp(18px, 8vw, 30px);
  letter-spacing: clamp(0.12em, 4vw, 0.35em);
  text-align: center;
  padding: 0.5em 0.4em 0.5em 0.6em;
  border-radius: 14px;
  color: ${COLORS.accentC};
  background: rgba(0, 0, 0, 0.28);
  border: 1.5px solid ${COLORS.panelBorder};
  text-shadow: 0 0 18px rgba(255, 209, 102, 0.45);
  overflow-wrap: anywhere;
`;
