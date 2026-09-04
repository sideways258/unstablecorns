import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import useSoundBase from 'use-sound';

// Global audio settings (master volume + mute), shared by every `useSound` call
// in the app and persisted per browser. The in-game settings menu drives this.

type AudioSettings = {
  volume: number; // 0..1 master multiplier
  muted: boolean;
  /** the tavern crowd-reaction sounds (neigh success/fail cheers/boos) only */
  tavernMuted: boolean;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  toggleMuted: () => void;
  setTavernMuted: (m: boolean) => void;
  toggleTavernMuted: () => void;
};

const STORAGE_KEY = 'uu-audio-settings';
const DEFAULTS = { volume: 0.8, muted: false, tavernMuted: false };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const AudioSettingsContext = createContext<AudioSettings>({
  ...DEFAULTS,
  setVolume: () => {},
  setMuted: () => {},
  toggleMuted: () => {},
  setTavernMuted: () => {},
  toggleTavernMuted: () => {},
});

function readStored(): { volume: number; muted: boolean; tavernMuted: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        volume: typeof parsed.volume === 'number' ? clamp01(parsed.volume) : DEFAULTS.volume,
        muted: !!parsed.muted,
        tavernMuted: !!parsed.tavernMuted,
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
  const [tavernMuted, setTavernMutedState] = useState<boolean>(initial.tavernMuted);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume, muted, tavernMuted }));
    } catch (e) {
      /* ignore */
    }
  }, [volume, muted, tavernMuted]);

  const setVolume = useCallback((v: number) => setVolumeState(clamp01(v)), []);
  const setMuted = useCallback((m: boolean) => setMutedState(m), []);
  const toggleMuted = useCallback(() => setMutedState((m) => !m), []);
  const setTavernMuted = useCallback((m: boolean) => setTavernMutedState(m), []);
  const toggleTavernMuted = useCallback(() => setTavernMutedState((m) => !m), []);

  return (
    <AudioSettingsContext.Provider
      value={{ volume, muted, tavernMuted, setVolume, setMuted, toggleMuted, setTavernMuted, toggleTavernMuted }}
    >
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

/**
 * Same as `useSound`, but also silenced by the separate "tavern sounds"
 * toggle - for the tavern crowd-reaction cheers/boos specifically, so players
 * can turn those off without muting everything else.
 */
export function useTavernSound(src: any, opts: any = {}) {
  const { volume: master, muted, tavernMuted } = useAudioSettings();
  const base = typeof opts.volume === 'number' ? opts.volume : 1;
  const effectiveVolume = muted || tavernMuted ? 0 : base * master;
  return useSoundBase(src, { ...opts, volume: effectiveVolume });
}

// Reused across ticks rather than spun up fresh each time (browsers cap how
// many AudioContexts can exist at once).
let sharedTickCtx: AudioContext | null = null;

/**
 * A short percussive "tick" synthesized on the fly via the Web Audio API - no
 * audio asset needed. Used by the turn timer's countdown. `volume` is 0..1
 * and should already be pre-scaled by the caller (master volume / mute).
 */
export function playTick(volume: number) {
  if (volume <= 0) return;
  try {
    const AudioCtxClass: typeof AudioContext | undefined =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    if (!sharedTickCtx) {
      sharedTickCtx = new AudioCtxClass();
    }
    const ctx = sharedTickCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1600, ctx.currentTime);
    gain.gain.setValueAtTime(Math.min(1, volume), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch (e) {
    /* audio is best-effort - never let a tick crash the board */
  }
}

export default useSound;
