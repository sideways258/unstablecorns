// Shared visual theme so the landing page, seat picker and in-game settings
// menu all match the board.
import BG from './assets/ui/board-background.jpg';

export const BOARD_BG = BG;

export const COLORS = {
  panel: '#BC4747',
  panelBorder: 'rgba(255,255,255,0.35)',
  inputBg: 'rgba(255,255,255,0.2)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.75)',
  danger: '#7a1f1f',
};

// 6-digit numeric lobby code, e.g. "420317".
export const generateLobbyCode = (): string =>
  String(Math.floor(100000 + Math.random() * 900000));

export const isValidLobbyCode = (code: string): boolean => /^\d{6}$/.test(code.trim());
