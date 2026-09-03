// Shared visual theme. "Games portal" look: deep animated gradient background,
// glassy panels, candy accents, chunky arcade buttons.
import BG from './assets/ui/board-background.jpg';

export const BOARD_BG = BG;

export const FONT_DISPLAY = "'Fredoka', 'Open Sans', system-ui, sans-serif";
export const FONT_BODY = "'Open Sans', system-ui, sans-serif";

export const COLORS = {
  // surfaces
  bg0: '#180f2e',
  bg1: '#140b24',
  panel: 'rgba(31, 20, 58, 0.72)',
  panelSolid: '#241542',
  panelBorder: 'rgba(255, 255, 255, 0.14)',
  inputBg: 'rgba(255, 255, 255, 0.08)',

  // text
  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.64)',

  // accents
  primary: '#ff5c8a',
  primaryDark: '#c9366a',
  accentA: '#7c5cff',
  accentB: '#22d3ee',
  accentC: '#ffd166',
  success: '#37d9a0',
  danger: '#ff4d6d',
  dangerDark: '#b3243f',
};

export const GRADIENTS = {
  hero: 'linear-gradient(135deg, #7c5cff 0%, #ff5c8a 55%, #ffb35c 100%)',
  page:
    'radial-gradient(1200px 780px at 12% -12%, rgba(124,92,255,0.55) 0%, transparent 60%),' +
    'radial-gradient(1000px 680px at 105% 0%, rgba(34,211,238,0.40) 0%, transparent 55%),' +
    'radial-gradient(900px 700px at 90% 110%, rgba(255,92,138,0.38) 0%, transparent 55%),' +
    'linear-gradient(180deg, #1b1033 0%, #120a22 100%)',
};

export const RADIUS = '18px';
export const SHADOW = '0 24px 70px rgba(0, 0, 0, 0.45)';

// --- lobby codes ----------------------------------------------------------

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
