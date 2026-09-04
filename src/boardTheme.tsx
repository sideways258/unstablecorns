import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// The felt "table" gradient behind the board is a per-viewer cosmetic choice,
// persisted the same way audio settings are (see audio.tsx).

export type BoardThemeID = 'forest' | 'ocean' | 'crimson' | 'royal' | 'midnight' | 'amber';

export type BoardThemePreset = {
  id: BoardThemeID;
  name: string;
  /** background for the felt play-mat (Board.tsx Wrapper::before) */
  gradient: string;
  /** single representative color, used for the picker swatch */
  swatch: string;
};

export const BOARD_THEMES: BoardThemePreset[] = [
  {
    id: 'forest',
    name: 'Forest',
    gradient: 'radial-gradient(130% 100% at 50% 22%, #2f8267 0%, #1f5c4d 52%, #123c31 100%)',
    swatch: '#1f5c4d',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    gradient: 'radial-gradient(130% 100% at 50% 22%, #2f7ba3 0%, #1f5470 52%, #12313f 100%)',
    swatch: '#1f5470',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    gradient: 'radial-gradient(130% 100% at 50% 22%, #a3402f 0%, #702822 52%, #451613 100%)',
    swatch: '#702822',
  },
  {
    id: 'royal',
    name: 'Royal',
    gradient: 'radial-gradient(130% 100% at 50% 22%, #7c4fb0 0%, #4f3170 52%, #2e1a45 100%)',
    swatch: '#4f3170',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    gradient: 'radial-gradient(130% 100% at 50% 22%, #4a5058 0%, #2b2f35 52%, #16181b 100%)',
    swatch: '#2b2f35',
  },
  {
    id: 'amber',
    name: 'Amber',
    gradient: 'radial-gradient(130% 100% at 50% 22%, #b0812f 0%, #70501f 52%, #452f12 100%)',
    swatch: '#70501f',
  },
];

const DEFAULT_THEME: BoardThemeID = 'forest';
const STORAGE_KEY = 'uu-board-theme';

type BoardThemeContextValue = {
  themeID: BoardThemeID;
  theme: BoardThemePreset;
  setThemeID: (id: BoardThemeID) => void;
};

const byId = (id: string): BoardThemePreset =>
  BOARD_THEMES.find((t) => t.id === id) || BOARD_THEMES[0];

const BoardThemeContext = createContext<BoardThemeContextValue>({
  themeID: DEFAULT_THEME,
  theme: byId(DEFAULT_THEME),
  setThemeID: () => {},
});

function readStored(): BoardThemeID {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && BOARD_THEMES.some((t) => t.id === raw)) {
      return raw as BoardThemeID;
    }
  } catch (e) {
    /* private mode / disabled storage - fall through to default */
  }
  return DEFAULT_THEME;
}

export const BoardThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeID, setThemeIDState] = useState<BoardThemeID>(() => readStored());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, themeID);
    } catch (e) {
      /* ignore */
    }
  }, [themeID]);

  const setThemeID = useCallback((id: BoardThemeID) => setThemeIDState(id), []);

  return (
    <BoardThemeContext.Provider value={{ themeID, theme: byId(themeID), setThemeID }}>
      {children}
    </BoardThemeContext.Provider>
  );
};

export const useBoardTheme = () => useContext(BoardThemeContext);
