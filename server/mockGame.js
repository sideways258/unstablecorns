"use strict";
// CommonJS mirror of src/games/mockGame.ts (kept in sync by hand).
exports.__esModule = true;

var core_1 = require("boardgame.io/core");
var funnyNames_1 = require("./funnyNames");

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

function allReady(G) {
  var vals = Object.keys(G.ready).map(function (k) { return G.ready[k]; });
  return vals.length > 0 && vals.every(function (v) { return !!v; });
}

function setStage(ctx, stage) {
  if (ctx.events && ctx.events.setActivePlayers) ctx.events.setActivePlayers({ all: stage });
}

function createMockGame(config) {
  var handSize = config.handSize == null ? 5 : config.handSize;

  var cardsById = {};
  config.deck.forEach(function (c) {
    cardsById[c.id] = c;
  });

  var setName = function (G, ctx, name) {
    G.names[ctx.playerID] = String(name || "").slice(0, 24);
  };
  var toggleReady = function (G, ctx) {
    G.ready[ctx.playerID] = !G.ready[ctx.playerID];
    if (allReady(G) && ctx.events && ctx.events.setPhase) ctx.events.setPhase("play");
  };
  var endMatch = function (G, ctx) {
    if (ctx.playerID !== "0") return core_1.INVALID_MOVE;
    G.endGame = true;
  };

  var playCard = function (G, ctx, cardId) {
    if (ctx.playerID !== ctx.currentPlayer) return core_1.INVALID_MOVE;
    var hand = G.hands[ctx.currentPlayer] || [];
    var i = hand.indexOf(cardId);
    if (i === -1) return core_1.INVALID_MOVE;
    hand.splice(i, 1);
    G.table.push({ cardId: cardId, by: ctx.currentPlayer });
    G.log.unshift("P" + ctx.currentPlayer + ' played "' + (G.cards[cardId] ? G.cards[cardId].title : cardId) + '"');
  };
  var drawCard = function (G, ctx) {
    if (ctx.playerID !== ctx.currentPlayer) return core_1.INVALID_MOVE;
    if (G.drawPile.length === 0) return core_1.INVALID_MOVE;
    var drawn = G.drawPile.shift();
    if (!G.hands[ctx.currentPlayer]) G.hands[ctx.currentPlayer] = [];
    G.hands[ctx.currentPlayer].push(drawn);
    G.log.unshift("P" + ctx.currentPlayer + " drew a card");
  };
  var endTurn = function (G, ctx) {
    if (ctx.playerID !== ctx.currentPlayer) return core_1.INVALID_MOVE;
    if (ctx.events && ctx.events.endTurn) ctx.events.endTurn();
  };

  return {
    name: config.name,

    setup: function (ctx) {
      var needed = ctx.numPlayers * handSize + 12;
      var copies = Math.max(2, Math.ceil(needed / config.deck.length));
      var ids = [];
      for (var n = 0; n < copies; n++) {
        config.deck.forEach(function (c) {
          ids.push(c.id);
        });
      }
      var pile = shuffle(ids);
      var funny = funnyNames_1.funnyNames(ctx.numPlayers);

      var hands = {};
      var names = {};
      var ready = {};
      for (var i = 0; i < ctx.numPlayers; i++) {
        var id = String(i);
        hands[id] = pile.slice(0, handSize);
        pile = pile.slice(handSize);
        names[id] = funny[i];
        ready[id] = false;
      }
      return {
        cards: cardsById,
        drawPile: pile,
        discard: [],
        table: [],
        hands: hands,
        names: names,
        ready: ready,
        log: [],
        endGame: false
      };
    },

    phases: {
      lobby: {
        start: true,
        onBegin: function (G, ctx) { setStage(ctx, "lobby"); }
      },
      play: {
        onBegin: function (G, ctx) { setStage(ctx, "play"); }
      }
    },

    turn: {
      onBegin: function (G, ctx) {
        setStage(ctx, ctx.phase === "lobby" ? "lobby" : "play");
      },
      stages: {
        lobby: { moves: { setName: setName, toggleReady: toggleReady, endMatch: endMatch } },
        play: { moves: { playCard: playCard, drawCard: drawCard, endTurn: endTurn, endMatch: endMatch } }
      }
    },

    moves: { endMatch: endMatch },

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
