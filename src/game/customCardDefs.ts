import type { CardDefinition } from './card';

// Custom expansion cards created in the admin panel. Fetched once at app start
// (see src/index.tsx) so this client's initializeDeck() builds a deck that
// matches the server's exactly. Without this, G.deck has no entry for a custom
// card id and the board crashes the moment such a card is drawn.
let DEFS: CardDefinition[] = [];

export const setCustomCardDefs = (defs: unknown) => {
  DEFS = Array.isArray(defs) ? (defs as CardDefinition[]) : [];
};

export const getCustomCardDefs = (enabledSets: string[] = []): CardDefinition[] =>
  DEFS.filter((d) => d && (d as any).set && enabledSets.indexOf((d as any).set) !== -1);

// Best-effort load. Safe to call more than once.
export const loadCustomCardDefs = (): Promise<void> =>
  fetch('/api/custom-card-defs')
    .then((r) => (r.ok ? r.json() : { defs: [] }))
    .then((d) => setCustomCardDefs(d && d.defs))
    .catch(() => {
      /* offline / old server - custom packs just won't be available */
    });
