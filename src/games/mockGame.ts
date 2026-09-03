import { INVALID_MOVE } from 'boardgame.io/core';
import type { MockCard } from './mockCards';
import { funnyNames } from '../funnyNames';

// A tiny but real boardgame.io game used as scaffolding for new games. It has a
// lobby phase (name + ready-up, same as Unstable Unicorns), then a play phase
// with a shared deck, per-player hands, a play area, a log, host "end match",
// and a trivial win condition (empty your hand). Swap in real rules per game.
//
// Structure mirrors Unstable Unicorns: every player is always in a stage, and
// turn ownership is enforced in the move bodies (ctx.playerID === currentPlayer).

export type MockGameState = {
  cards: Record<string, MockCard>;
  drawPile: string[];
  discard: string[];
  table: { cardId: string; by: string }[];
  hands: Record<string, string[]>;
  names: Record<string, string>;
  ready: Record<string, boolean>;
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

const allReady = (G: MockGameState): boolean => {
  const vals = Object.keys(G.ready).map((k) => G.ready[k]);
  return vals.length > 0 && vals.every(Boolean);
};

const setStage = (ctx: any, stage: string) => {
  if (ctx.events && ctx.events.setActivePlayers) ctx.events.setActivePlayers({ all: stage });
};

export function createMockGame(config: { name: string; deck: MockCard[]; handSize?: number }) {
  const handSize = config.handSize ?? 5;

  const cardsById: Record<string, MockCard> = {};
  config.deck.forEach((c) => {
    cardsById[c.id] = c;
  });

  const setName = (G: MockGameState, ctx: any, name: string) => {
    G.names[ctx.playerID] = String(name || '').slice(0, 24);
  };
  const toggleReady = (G: MockGameState, ctx: any) => {
    G.ready[ctx.playerID] = !G.ready[ctx.playerID];
    if (allReady(G) && ctx.events && ctx.events.setPhase) ctx.events.setPhase('play');
  };
  const endMatch = (G: MockGameState, ctx: any) => {
    if (ctx.playerID !== '0') return INVALID_MOVE;
    G.endGame = true;
  };

  const playCard = (G: MockGameState, ctx: any, cardId: string) => {
    if (ctx.playerID !== ctx.currentPlayer) return INVALID_MOVE;
    const hand = G.hands[ctx.currentPlayer] || [];
    const i = hand.indexOf(cardId);
    if (i === -1) return INVALID_MOVE;
    hand.splice(i, 1);
    G.table.push({ cardId, by: ctx.currentPlayer });
    G.log.unshift(`P${ctx.currentPlayer} played "${G.cards[cardId] ? G.cards[cardId].title : cardId}"`);
  };
  const drawCard = (G: MockGameState, ctx: any) => {
    if (ctx.playerID !== ctx.currentPlayer) return INVALID_MOVE;
    if (G.drawPile.length === 0) return INVALID_MOVE;
    const drawn = G.drawPile.shift() as string;
    (G.hands[ctx.currentPlayer] || (G.hands[ctx.currentPlayer] = [])).push(drawn);
    G.log.unshift(`P${ctx.currentPlayer} drew a card`);
  };
  const endTurn = (G: MockGameState, ctx: any) => {
    if (ctx.playerID !== ctx.currentPlayer) return INVALID_MOVE;
    if (ctx.events && ctx.events.endTurn) ctx.events.endTurn();
  };

  return {
    name: config.name,

    setup: (ctx: any): MockGameState => {
      const needed = ctx.numPlayers * handSize + 12;
      const copies = Math.max(2, Math.ceil(needed / config.deck.length));
      const ids: string[] = [];
      for (let n = 0; n < copies; n++) {
        config.deck.forEach((c) => ids.push(c.id));
      }
      let pile = shuffle(ids);
      const funny = funnyNames(ctx.numPlayers);

      const hands: Record<string, string[]> = {};
      const names: Record<string, string> = {};
      const ready: Record<string, boolean> = {};
      for (let i = 0; i < ctx.numPlayers; i++) {
        const id = String(i);
        hands[id] = pile.slice(0, handSize);
        pile = pile.slice(handSize);
        names[id] = funny[i];
        ready[id] = false;
      }
      return { cards: cardsById, drawPile: pile, discard: [], table: [], hands, names, ready, log: [], endGame: false };
    },

    phases: {
      lobby: {
        start: true,
        onBegin: (G: MockGameState, ctx: any) => setStage(ctx, 'lobby'),
      },
      play: {
        onBegin: (G: MockGameState, ctx: any) => setStage(ctx, 'play'),
      },
    },

    turn: {
      onBegin: (G: MockGameState, ctx: any) => setStage(ctx, ctx.phase === 'lobby' ? 'lobby' : 'play'),
      stages: {
        lobby: { moves: { setName, toggleReady, endMatch } },
        play: { moves: { playCard, drawCard, endTurn, endMatch } },
      },
    },

    moves: { endMatch },

    endIf: (G: MockGameState) => {
      if (G.endGame) return { endedByHost: true };
      const winner = Object.keys(G.hands).find((p) => G.hands[p].length === 0);
      if (winner !== undefined) return { winner };
    },
  };
}
