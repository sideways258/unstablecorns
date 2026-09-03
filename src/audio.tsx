import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import useSoundBase from 'use-sound';

// Global audio settings (master volume + mute), shared by every `useSound` call
// in the app and persisted per browser. The in-game settings menu drives this.

type AudioSettings = {
  volume: number; // 0..1 master multiplier
  muted: boolean;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  toggleMuted: () => void;
};

const STORAGE_KEY = 'uu-audio-settings';
const DEFAULTS = { volume: 0.8, muted: false };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const AudioSettingsContext = createContext<AudioSettings>({
  ...DEFAULTS,
  setVolume: () => {},
  setMuted: () => {},
  toggleMuted: () => {},
});

function readStored(): { volume: number; muted: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        volume: typeof parsed.volume === 'number' ? clamp01(parsed.volume) : DEFAULTS.volume,
        muted: !!parsed.muted,
      };
    }
  } catch (e) {
    /* private mode / disabled storage - fall through to defaults */
  }
  return { ...DEFAULTS };
}

export const AudioSettingsProvider = ({ children }: { children: ReactNode }) => {
  const initial = readStored();
  const [volume, setVolumeState] = useState<number>(initial.volume);
  const [muted, setMutedState] = useState<boolean>(initial.muted);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume, muted }));
    } catch (e) {
      /* ignore */
    }
  }, [volume, muted]);

  const setVolume = useCallback((v: number) => setVolumeState(clamp01(v)), []);
  const setMuted = useCallback((m: boolean) => setMutedState(m), []);
  const toggleMuted = useCallback(() => setMutedState((m) => !m), []);

  return (
    <AudioSettingsContext.Provider value={{ volume, muted, setVolume, setMuted, toggleMuted }}>
      {children}
    </AudioSettingsContext.Provider>
  );
};

export const useAudioSettings = () => useContext(AudioSettingsContext);

/**
 * Drop-in replacement for `import useSound from 'use-sound'`.
 * Each caller keeps passing its own `volume` (the per-effect mix level); we
 * scale that by the global master volume and force it to 0 when muted.
 */
export function useSound(src: any, opts: any = {}) {
  const { volume: master, muted } = useAudioSettings();
  const base = typeof opts.volume === 'number' ? opts.volume : 1;
  const effectiveVolume = muted ? 0 : base * master;
  return useSoundBase(src, { ...opts, volume: effectiveVolume });
}

export default useSound;
