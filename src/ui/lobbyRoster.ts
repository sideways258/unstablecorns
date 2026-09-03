export type RosterEntry = {
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
  note?: string;
  isMe: boolean;
};

type SeatMeta = { id: number | string; name?: string; isConnected?: boolean };

// Builds the lobby player list. Once we have real connection info (matchData),
// only players who have actually joined the room are included; you are always
// shown.
export function buildRoster(opts: {
  seatIds: string[];
  playerID: string | null | undefined;
  matchData?: SeatMeta[] | null;
  nameFor: (id: string) => string | undefined;
  readyFor: (id: string) => boolean;
  noteFor?: (id: string) => string | undefined;
}): RosterEntry[] {
  const md = Array.isArray(opts.matchData) ? opts.matchData : undefined;
  const myId = opts.playerID != null ? String(opts.playerID) : null;

  return opts.seatIds
    .map((id) => {
      const meta = md ? md.find((m) => String(m.id) === id) : undefined;
      const isMe = myId === id;
      const connected = md ? meta?.isConnected === true || isMe : true;
      return {
        id,
        name: opts.nameFor(id) || meta?.name || `Player ${id}`,
        connected,
        ready: opts.readyFor(id),
        note: opts.noteFor ? opts.noteFor(id) : undefined,
        isMe,
      };
    })
    .filter((e) => !md || e.connected);
}
