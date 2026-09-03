import { INVALID_MOVE } from 'boardgame.io/core';
import type { MockCard } from './mockCards';

// A tiny but real boardgame.io game used as scaffolding for new games. It has a
// shared deck, per-player hands, a play area, a log, host "end match", and a
// trivial win condition (empty your hand). Swap in real rules per game.

export type MockGameState = {
  cards: Record<string, MockCard>;
  drawPile: string[];
  discard: string[];
  table: { cardId: string; by: string }[];
  hands: Record<string, string[]>;
  log: string[];
  endGame: boolean;
};

function shuffle<T>(input: T[]): T[] {
  const a = input.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

export function createMockGame(config: { name: string; deck: MockCard[]; handSize?: number }) {
  const handSize = config.handSize ?? 5;

  const cardsById: Record<string, MockCard> = {};
  config.deck.forEach((c) => {
    cardsById[c.id] = c;
  });

  return {
    name: config.name,

    setup: (ctx: any): MockGameState => {
      // Enough copies of the deck for every hand plus a draw pile.
      const needed = ctx.numPlayers * handSize + 12;
      const copies = Math.max(2, Math.ceil(needed / config.deck.length));
      const ids: string[] = [];
      for (let n = 0; n < copies; n++) {
        config.deck.forEach((c) => ids.push(c.id));
      }
      let pile = shuffle(ids);
      const hands: Record<string, string[]> = {};
      for (let i = 0; i < ctx.numPlayers; i++) {
        hands[String(i)] = pile.slice(0, handSize);
        pile = pile.slice(handSize);
      }
      return { cards: cardsById, drawPile: pile, discard: [], table: [], hands, log: [], endGame: false };
    },

    moves: {
      playCard: (G: MockGameState, ctx: any, cardId: string) => {
        const hand = G.hands[ctx.currentPlayer] || [];
        const i = hand.indexOf(cardId);
        if (i === -1) return INVALID_MOVE;
        hand.splice(i, 1);
        G.table.push({ cardId, by: ctx.currentPlayer });
        G.log.unshift(`P${ctx.currentPlayer} played "${G.cards[cardId] ? G.cards[cardId].title : cardId}"`);
      },

      drawCard: (G: MockGameState, ctx: any) => {
        if (G.drawPile.length === 0) return INVALID_MOVE;
        const drawn = G.drawPile.shift() as string;
        (G.hands[ctx.currentPlayer] || (G.hands[ctx.currentPlayer] = [])).push(drawn);
        G.log.unshift(`P${ctx.currentPlayer} drew a card`);
      },

      endTurn: (G: MockGameState, ctx: any) => {
        if (ctx.events && ctx.events.endTurn) ctx.events.endTurn();
      },

      // Host-only (seat 0). Mirrors Unstable Unicorns so the shared settings menu works.
      endMatch: (G: MockGameState, ctx: any) => {
        if (ctx.playerID !== '0') return INVALID_MOVE;
        G.endGame = true;
      },
    },

    endIf: (G: MockGameState) => {
      if (G.endGame) return { endedByHost: true };
      const winner = Object.keys(G.hands).find((p) => G.hands[p].length === 0);
      if (winner !== undefined) return { winner };
    },
  };
}
