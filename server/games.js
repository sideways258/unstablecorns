"use strict";
// Server-side game registry. Every game the client offers in registry.tsx must
// be registered here too, with a matching `.name`.
exports.__esModule = true;

var UnstableUnicorns = require("./game/game")["default"];
var createMockGame = require("./mockGame").createMockGame;
var mockCards = require("./mockCards");

var games = [
  UnstableUnicorns,
  createMockGame({ name: "clash_of_critters", deck: mockCards.CRITTERS_DECK }),
  createMockGame({ name: "galaxy_gambit", deck: mockCards.GALAXY_DECK })
];

exports.games = games;
