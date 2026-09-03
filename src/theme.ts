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

// Unambiguous alphanumeric alphabet - no 0/O/1/I/L so codes are easy to read out.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const LOBBY_CODE_LENGTH = 6;

// 6-char alphanumeric lobby code, e.g. "K7QP2M". Uses crypto randomness when
// available so simultaneous lobbies effectively never collide (~10^9 combos).
export const generateLobbyCode = (length: number = LOBBY_CODE_LENGTH): string => {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : undefined;
  const randoms =
    cryptoObj && cryptoObj.getRandomValues
      ? Array.from(cryptoObj.getRandomValues(new Uint32Array(length)))
      : Array.from({ length }, () => Math.floor(Math.random() * 0xffffffff));
  return randoms.map((r) => CODE_ALPHABET[r % CODE_ALPHABET.length]).join('');
};

export const normalizeLobbyCode = (code: string): string =>
  code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

// Accept anything alphanumeric of a sane length (also lets old numeric links work).
export const isValidLobbyCode = (code: string): boolean => /^[A-Z0-9]{4,12}$/.test(normalizeLobbyCode(code));
