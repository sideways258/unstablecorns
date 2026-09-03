"use strict";
// CommonJS mirror of src/games/mockGame.ts (kept in sync by hand).
exports.__esModule = true;

var core_1 = require("boardgame.io/core");

function shuffle(input) {
  var a = input.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function createMockGame(config) {
  var handSize = config.handSize == null ? 5 : config.handSize;

  var cardsById = {};
  config.deck.forEach(function (c) {
    cardsById[c.id] = c;
  });

  return {
    name: config.name,

    setup: function (ctx) {
      // Enough copies of the deck for every hand plus a draw pile.
      var needed = ctx.numPlayers * handSize + 12;
      var copies = Math.max(2, Math.ceil(needed / config.deck.length));
      var ids = [];
      for (var n = 0; n < copies; n++) {
        config.deck.forEach(function (c) {
          ids.push(c.id);
        });
      }
      var pile = shuffle(ids);
      var hands = {};
      for (var i = 0; i < ctx.numPlayers; i++) {
        hands[String(i)] = pile.slice(0, handSize);
        pile = pile.slice(handSize);
      }
      return { cards: cardsById, drawPile: pile, discard: [], table: [], hands: hands, log: [], endGame: false };
    },

    moves: {
      playCard: function (G, ctx, cardId) {
        var hand = G.hands[ctx.currentPlayer] || [];
        var i = hand.indexOf(cardId);
        if (i === -1) return core_1.INVALID_MOVE;
        hand.splice(i, 1);
        G.table.push({ cardId: cardId, by: ctx.currentPlayer });
        G.log.unshift('P' + ctx.currentPlayer + ' played "' + (G.cards[cardId] ? G.cards[cardId].title : cardId) + '"');
      },

      drawCard: function (G, ctx) {
        if (G.drawPile.length === 0) return core_1.INVALID_MOVE;
        var drawn = G.drawPile.shift();
        if (!G.hands[ctx.currentPlayer]) G.hands[ctx.currentPlayer] = [];
        G.hands[ctx.currentPlayer].push(drawn);
        G.log.unshift('P' + ctx.currentPlayer + ' drew a card');
      },

      endTurn: function (G, ctx) {
        if (ctx.events && ctx.events.endTurn) ctx.events.endTurn();
      },

      endMatch: function (G, ctx) {
        if (ctx.playerID !== '0') return core_1.INVALID_MOVE;
        G.endGame = true;
      }
    },

    endIf: function (G) {
      if (G.endGame) return { endedByHost: true };
      var winner = Object.keys(G.hands).find(function (p) {
        return G.hands[p].length === 0;
      });
      if (winner !== undefined) return { winner: winner };
    }
  };
}

exports.createMockGame = createMockGame;
