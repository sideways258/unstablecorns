"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports._findInstruction = exports._findInProgressScenesWithProtagonist = exports._findOpenScenesWithProtagonist = exports._addSceneFromDo = exports.canDraw = exports.canPlayCard = void 0;
var do_1 = require("./do");
var card_1 = require("./card");
var constants_1 = require("./constants");
var do_2 = require("./do");
var underscore_1 = require("underscore");
var core_1 = require("boardgame.io/core");
var funnyNames_1 = require("../funnyNames");
var UnstableUnicorns = {
    name: "unstable_unicorns",
    // Win conditions: the host ends the match, a player reaches 7 unicorns in
    // their stable, OR everyone else has left the game.
    endIf: function (G, ctx) {
        if (G.endGame) {
            return { endedByHost: true };
        }
        if (ctx.phase === "main") {
            var remaining = G.players.filter(function (p) { return (G.leftPlayers || []).indexOf(p.id) === -1; });
            if (remaining.length === 0) {
                return { draw: true };
            }
            if (remaining.length === 1) {
                return { winner: remaining[0].id, lastOneStanding: true };
            }
            for (var i = 0; i < remaining.length; i++) {
                var p = remaining[i];
                if (_countUnicorns(G, p.id) >= constants_1.CONSTANTS.stableSeats) {
                    return { winner: p.id };
                }
            }
        }
    },
    // Available in every phase/stage so the host can always bail out, any player
    // can drop out, and the turn timer keeps working.
    moves: { endMatch: endMatch, playerLeft: playerLeft, setTurnTimer: setTurnTimer, forceEndTurnOnTimeout: forceEndTurnOnTimeout },
    setup: function (ctx, setupData) {
        var funny = funnyNames_1.funnyNames(ctx.numPlayers);
        var players = Array.from({ length: ctx.numPlayers }, function (val, idx) {
            return {
                id: "" + idx,
                name: funny[idx]
            };
        });
        var deck = card_1.initializeDeck();
        var discardPile = [];
        var nursery = [];
        var drawPile = underscore_1["default"].shuffle(deck).filter(function (c) { return c.type !== "baby"; }).map(function (c) { return c.id; });
        var hand = {};
        var stable = {};
        var temporaryStable = {};
        var upgradeDowngradeStable = {};
        var playerEffects = {};
        var ready = {};
        players.forEach(function (pl) {
            ready[pl.id] = false;
            hand[pl.id] = underscore_1["default"].first(drawPile, constants_1.CONSTANTS.numberOfHandCardsAtStart);
            drawPile = underscore_1["default"].rest(drawPile, constants_1.CONSTANTS.numberOfHandCardsAtStart);
            stable[pl.id] = [];
            temporaryStable[pl.id] = [];
            upgradeDowngradeStable[pl.id] = [];
            playerEffects[pl.id] = [];
        });
        return {
            players: players,
            deck: deck,
            drawPile: drawPile,
            nursery: nursery,
            discardPile: discardPile,
            hand: hand,
            stable: stable,
            temporaryStable: temporaryStable,
            upgradeDowngradeStable: upgradeDowngradeStable,
            script: { scenes: [] },
            playerEffects: playerEffects,
            mustEndTurnImmediately: false,
            countPlayedCardsInActionPhase: 0,
            clipboard: {},
            endGame: false,
            expansions: [],
            leftPlayers: [],
            turnTimer: { enabled: false, durationSec: 120, turnStartedAt: undefined },
            babyStarter: [],
            ready: ready,
            uiHoverHandIndex: undefined,
            uiExecuteDo: undefined,
            uiCardToCard: undefined,
            lastNeighResult: undefined,
            round: 1,
            roundSeats: [],
            auditLog: []
        };
    },
    phases: {
        pregame: {
            start: true,
            onBegin: function (G, ctx) {
                var _a;
                (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.setActivePlayers({ all: "pregame" });
            }
        },
        main: {
            //start: true,
            onBegin: function (G, ctx) {
            }
        }
    },
    turn: {
        // Skip any seat whose player has left the game.
        order: {
            // Randomize who goes in which order each game. This only shuffles
            // the TURN sequence - the host is still whoever sits in seat "0"
            // (isHost checks are keyed on that, not on turn order), so the
            // host keeps host controls no matter where they land in the order.
            playOrder: function (G, ctx) {
                return underscore_1["default"].shuffle(G.players.map(function (p) { return p.id; }));
            },
            first: function (G, ctx) {
                for (var pos = 0; pos < ctx.numPlayers; pos++) {
                    if ((G.leftPlayers || []).indexOf(ctx.playOrder[pos]) === -1) {
                        return pos;
                    }
                }
                return 0;
            },
            next: function (G, ctx) {
                var pos = ctx.playOrderPos;
                for (var i = 0; i < ctx.numPlayers; i++) {
                    pos = (pos + 1) % ctx.numPlayers;
                    if ((G.leftPlayers || []).indexOf(ctx.playOrder[pos]) === -1) {
                        return pos;
                    }
                }
                return ctx.playOrderPos;
            }
        },
        onBegin: function (G, ctx) {
            var _a, _b;
            if (ctx.phase === "pregame") {
                return;
            }
            // stamp when this turn started so the (optional) turn timer can run
            if (!G.turnTimer) {
                G.turnTimer = { enabled: false, durationSec: 120, turnStartedAt: undefined };
            }
            G.turnTimer.turnStartedAt = Date.now();
            // this is run whenever a new player starts its turn
            // perfect for placing players in a stage
            if (G.drawPile.length > 0) {
                G.script = { scenes: [] };
                G.countPlayedCardsInActionPhase = 0;
                G.mustEndTurnImmediately = false;
                // begin of turn: add scene
                __spreadArrays(G.stable[ctx.currentPlayer], G.upgradeDowngradeStable[ctx.currentPlayer]).forEach(function (c) { return _addSceneFromDo(G, ctx, c, ctx.currentPlayer, "begin_of_turn"); });
                // begin of turn: add effect
                __spreadArrays(G.stable[ctx.currentPlayer], G.upgradeDowngradeStable[ctx.currentPlayer]).forEach(function (c) {
                    var _a;
                    var card = G.deck[c];
                    var cardOnBegin = (_a = card.on) === null || _a === void 0 ? void 0 : _a.filter(function (c) { return c.trigger === "begin_of_turn"; });
                    // all unicorns are basic
                    // trigger no effect
                    if (G.playerEffects[ctx.currentPlayer].find(function (s) { return s.effect.key === "my_unicorns_are_basic"; })) {
                        if (G.playerEffects[ctx.currentPlayer].find(function (s) { return s.effect.key === "pandamonium"; }) === undefined) {
                            if (card.type === "narwhal" || card.type === "unicorn") {
                                return;
                            }
                        }
                    }
                    if (cardOnBegin) {
                        cardOnBegin.filter(function (on) { return on["do"].type === "add_effect"; }).forEach(function (on) {
                            var doAddEffect = on["do"];
                            // check if effect has already been added
                            if (G.playerEffects[ctx.currentPlayer].filter(function (s) { return s.cardID === c; }).length === 0) {
                                G.playerEffects[ctx.currentPlayer] = __spreadArrays(G.playerEffects[ctx.currentPlayer], [{ cardID: c, effect: doAddEffect.info }]);
                            }
                        });
                    }
                });
                (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.setActivePlayers({ all: "beginning" });
            }
            else {
                // no cards to draw
                // need to end the game
                (_b = ctx.events) === null || _b === void 0 ? void 0 : _b.setPhase("end");
            }
        },
        onEnd: function (G, ctx) {
            // Round counting: a round is complete once every active player has
            // taken a turn. Tracking distinct seats makes it immune to bonus
            // turns (Change of Luck) and to a player leaving mid-round.
            if (ctx.phase === "main") {
                if (G.round === undefined) { G.round = 1; }
                if (!Array.isArray(G.roundSeats)) { G.roundSeats = []; }
                if (G.roundSeats.indexOf(ctx.currentPlayer) === -1) {
                    G.roundSeats = __spreadArrays(G.roundSeats, [ctx.currentPlayer]);
                }
                var activeIds = _activePlayers(G).map(function (p) { return p.id; });
                if (activeIds.length > 0 && activeIds.every(function (id) { return G.roundSeats.indexOf(id) !== -1; })) {
                    G.round = G.round + 1;
                    G.roundSeats = [];
                }
            }
        },
        stages: {
            pregame: {
                moves: { ready: ready, selectBaby: selectBaby, changeName: changeName, endMatch: endMatch, setExpansions: setExpansions, playerLeft: playerLeft, setTurnTimer: setTurnTimer, forceEndTurnOnTimeout: forceEndTurnOnTimeout }
            },
            beginning: {
                moves: { drawAndAdvance: drawAndAdvance, executeDo: do_2.executeDo, end: end, commit: commit, skipExecuteDo: skipExecuteDo, setUIHoverHandIndex: setUIHoverHandIndex, setUICardToCard: setUICardToCard, endMatch: endMatch, playerLeft: playerLeft, setTurnTimer: setTurnTimer, forceEndTurnOnTimeout: forceEndTurnOnTimeout }
            },
            action_phase: {
                moves: {
                    commit: commit, executeDo: do_2.executeDo, end: end, drawAndEnd: drawAndEnd, playCard: playCard, playUpgradeDowngradeCard: playUpgradeDowngradeCard, playNeigh: playNeigh, playSuperNeigh: playSuperNeigh, dontPlayNeigh: dontPlayNeigh, skipExecuteDo: skipExecuteDo, setUIHoverHandIndex: setUIHoverHandIndex, setUICardToCard: setUICardToCard, endMatch: endMatch, playerLeft: playerLeft, setTurnTimer: setTurnTimer, forceEndTurnOnTimeout: forceEndTurnOnTimeout
                }
            }
        }
    }
};
function initializeGame(G, ctx) {
    // If the host enabled any expansion packs, rebuild the deck from base + those
    // packs and re-deal hands / draw pile. Card ids 0..12 stay the Baby Unicorns.
    if (G.expansions && G.expansions.length > 0) {
        var fullDeck_1 = card_1.initializeDeck(G.expansions);
        var drawPile_1 = underscore_1["default"].shuffle(fullDeck_1).filter(function (c) { return c.type !== "baby"; }).map(function (c) { return c.id; });
        G.players.forEach(function (pl) {
            G.hand[pl.id] = underscore_1["default"].first(drawPile_1, constants_1.CONSTANTS.numberOfHandCardsAtStart);
            drawPile_1 = underscore_1["default"].rest(drawPile_1, constants_1.CONSTANTS.numberOfHandCardsAtStart);
        });
        G.deck = fullDeck_1;
        G.drawPile = drawPile_1;
        G.discardPile = [];
    }
    var a = [];
    for (var i = 0; i < 13; i++) {
        a.push(i);
    }
    G.babyStarter.forEach(function (_a) {
        var cardID = _a.cardID, owner = _a.owner;
        G.stable[owner].push(cardID);
        a = underscore_1["default"].without(a, cardID);
    });
    a.forEach(function (cardId) {
        G.nursery.push(cardId);
    });
}
function changeName(G, ctx, protagonist, name) {
    G.players[parseInt(protagonist)].name = name;
}
// Host-only: choose which optional expansion packs are in play. Applied when the
// game leaves the lobby (see initializeGame).
function setExpansions(G, ctx, sets) {
    if (ctx.playerID !== "0") {
        return core_1.INVALID_MOVE;
    }
    G.expansions = Array.isArray(sets) ? sets.filter(function (s) { return typeof s === "string"; }) : [];
}
var UNICORN_TYPES = ["baby", "basic", "unicorn", "narwhal"];
// Players still in the game (everyone who has not left). Use this anywhere the
// game waits on "every player" so a seat that left never stalls a scene or vote.
function _activePlayers(G) {
    return G.players.filter(function (p) { return (G.leftPlayers || []).indexOf(p.id) === -1; });
}
// Append an entry to the shared audit log (what each player did).
function _log(G, ctx, playerID, text, cardID) {
    if (!G.auditLog) { G.auditLog = []; }
    var pl = G.players.find(function (p) { return p.id === String(playerID); });
    var hasCard = cardID !== undefined && cardID !== null;
    var entry = {
        id: underscore_1["default"].uniqueId("log_"),
        round: G.round || 1,
        turn: ctx.turn,
        playerID: String(playerID),
        playerName: (pl && pl.name) || ("Player " + playerID),
        text: text,
        cardID: hasCard ? cardID : undefined,
        cardTitle: hasCard ? _cardTitle(G, cardID) : undefined,
        ts: Date.now()
    };
    G.auditLog.push(entry);
    if (G.auditLog.length > 250) {
        G.auditLog = G.auditLog.slice(-250);
    }
    return entry;
}
// Called once a played Magic card's effect actually resolves against another
// player - appends who it hit to the existing "played <Card>" log line. Only
// the first resolved target sticks.
function _recordCardTarget(G, entryId, targetPlayer) {
    if (!entryId || !G.auditLog) { return; }
    var entry = G.auditLog.find(function (e) { return e.id === entryId; });
    if (!entry || entry.targetPlayerID !== undefined) { return; }
    entry.targetPlayerID = targetPlayer;
    entry.text = entry.text + " on " + _playerName(G, targetPlayer);
}
exports._recordCardTarget = _recordCardTarget;
function _cardTitle(G, cardID) {
    var c = G.deck[cardID];
    return (c && c.title) || "a card";
}
function _playerName(G, playerID) {
    var pl = G.players.find(function (p) { return p.id === String(playerID); });
    return (pl && pl.name) || ("Player " + playerID);
}
// Number of unicorns in a player's stable (Baby / Basic / Magical / Narwhal all
// count). A card counts twice if it has the "count_as_two" passive OR it granted
// the player a "count_as_two" effect on entering (e.g. Ginormous Unicorn).
// If the player has "pandamonium" active, every Unicorn in their Stable is a
// Panda instead and none of them count. 7 wins.
function _countUnicorns(G, playerID) {
    var effects = G.playerEffects[playerID] || [];
    if (effects.some(function (e) { return e.effect && e.effect.key === "pandamonium"; })) {
        return 0;
    }
    return (G.stable[playerID] || []).reduce(function (sum, cardID) {
        var card = G.deck[cardID];
        if (!card || UNICORN_TYPES.indexOf(card.type) === -1) {
            return sum;
        }
        var countsAsTwo = (card.passive && card.passive.indexOf("count_as_two") !== -1) ||
            effects.some(function (e) { return e.cardID === cardID && e.effect && e.effect.key === "count_as_two"; });
        return sum + (countsAsTwo ? 2 : 1);
    }, 0);
}
// Only the lobby host (seat 0) may end the match for everyone. endIf picks this up.
function endMatch(G, ctx) {
    if (ctx.playerID !== "0") {
        return core_1.INVALID_MOVE;
    }
    G.endGame = true;
}
// A player leaves for good. Their turn, their cards, and every action they still
// owe are removed so the game never stalls waiting on someone who is gone.
function playerLeft(G, ctx, leaverID) {
    var _a;
    var pid = (leaverID !== undefined && leaverID !== null) ? String(leaverID) : ctx.playerID;
    if (pid === undefined || G.players.find(function (p) { return p.id === pid; }) === undefined) {
        return core_1.INVALID_MOVE;
    }
    // You can only remove yourself from the game.
    if (ctx.playerID != null && pid !== String(ctx.playerID)) {
        return core_1.INVALID_MOVE;
    }
    if (G.leftPlayers.indexOf(pid) !== -1) {
        return; // already gone
    }
    G.leftPlayers = __spreadArrays(G.leftPlayers, [pid]);
    _log(G, ctx, pid, "left the game");
    // 1. Their cards leave play. Baby unicorns go back to the Nursery, everything
    //    else to the discard pile.
    var dump = function (ids) {
        (ids || []).forEach(function (cardID) {
            var card = G.deck[cardID];
            if (card && card.type === "baby") {
                G.nursery.push(cardID);
            }
            else if (card) {
                G.discardPile.push(cardID);
            }
        });
    };
    dump(G.stable[pid]);
    dump(G.temporaryStable[pid]);
    dump(G.upgradeDowngradeStable[pid]);
    dump(G.hand[pid]);
    G.stable[pid] = [];
    G.temporaryStable[pid] = [];
    G.upgradeDowngradeStable[pid] = [];
    G.hand[pid] = [];
    G.playerEffects[pid] = [];
    G.ready[pid] = true; // never block a lobby that is waiting on "everyone ready"
    // 2. Drop every instruction that still needs the leaver, then discard any
    //    scene that is now fully resolved.
    G.script.scenes.forEach(function (scene) {
        scene.actions.forEach(function (action) {
            action.instructions.forEach(function (ins) {
                if (ins.protagonist === pid && ins.state !== "executed") {
                    ins.state = "executed";
                }
            });
        });
    });
    G.script.scenes = G.script.scenes.filter(function (scene) {
        return scene.actions.some(function (action) {
            return action.instructions.some(function (ins) { return ins.state !== "executed"; });
        });
    });
    // 3. A neigh discussion cannot wait on a player who left.
    if (G.neighDiscussion) {
        if (G.neighDiscussion.protagonist === pid || G.neighDiscussion.target === pid) {
            G.discardPile.push(G.neighDiscussion.cardID);
            G.neighDiscussion = undefined;
        }
        else {
            G.neighDiscussion.rounds.forEach(function (round) {
                if (round.playerState[pid]) {
                    delete round.playerState[pid];
                }
            });
        }
    }
    // 4. Clear UI interaction state that might have pointed at them.
    G.uiCardToCard = undefined;
    G.uiExecuteDo = undefined;
    // 5. If it was their turn, move on immediately.
    if (ctx.phase !== "pregame" && ctx.currentPlayer === pid) {
        (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.endTurn();
    }
    // 6. In the lobby, don't let their un-readied seat hold the game hostage.
    if (ctx.phase === "pregame") {
        var remaining = _activePlayers(G);
        if (remaining.length >= 2 && remaining.every(function (p) {
            return G.ready[p.id] === true && G.babyStarter.find(function (s) { return s.owner === p.id; });
        })) {
            initializeGame(G, ctx);
            (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.setPhase("main");
        }
    }
}
function ready(G, ctx, protagonist) {
    var _a;
    G.ready[protagonist] = true;
    if (underscore_1["default"].every(underscore_1["default"].values(G.ready), function (bo) { return bo; })) {
        initializeGame(G, ctx);
        (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.setPhase("main");
    }
}
function selectBaby(G, ctx, protagonist, cardID) {
    // Players may change their pick in the lobby: drop any previous choice first.
    G.babyStarter = G.babyStarter.filter(function (s) { return s.owner !== protagonist; });
    G.babyStarter.push({
        cardID: cardID,
        owner: protagonist
    });
}
var TIMER_MIN_SEC = 60;
var TIMER_MAX_SEC = 300;
// Host-only (seat 0). Toggle the timer on/off (the clock button) and/or adjust
// its duration, any time - no unlock requirement.
function setTurnTimer(G, ctx, patch) {
    if (String(ctx.playerID) !== "0" || (G.leftPlayers || []).indexOf("0") !== -1) {
        return core_1.INVALID_MOVE;
    }
    if (!G.turnTimer) {
        G.turnTimer = { enabled: false, durationSec: 120, turnStartedAt: undefined };
    }
    if (patch && typeof patch.durationSec === "number" && isFinite(patch.durationSec)) {
        G.turnTimer.durationSec = Math.max(TIMER_MIN_SEC, Math.min(TIMER_MAX_SEC, Math.round(patch.durationSec)));
    }
    if (patch && typeof patch.enabled === "boolean") {
        G.turnTimer.enabled = patch.enabled;
    }
}
// Any player may call this once the current turn has run past the timer.
function forceEndTurnOnTimeout(G, ctx) {
    var _a;
    var t = G.turnTimer;
    if (!t || !t.enabled || !t.turnStartedAt || ctx.phase === "pregame") {
        return core_1.INVALID_MOVE;
    }
    if (Date.now() - t.turnStartedAt < t.durationSec * 1000) {
        return core_1.INVALID_MOVE;
    }
    var pid = ctx.currentPlayer;
    G.script.scenes.forEach(function (scene) {
        scene.actions.forEach(function (action) {
            action.instructions.forEach(function (ins) {
                if (ins.protagonist === pid && ins.state !== "executed") {
                    ins.state = "executed";
                }
            });
        });
    });
    G.script.scenes = G.script.scenes.filter(function (scene) {
        return scene.actions.some(function (action) {
            return action.instructions.some(function (ins) { return ins.state !== "executed"; });
        });
    });
    if (G.neighDiscussion) {
        G.discardPile.push(G.neighDiscussion.cardID);
        G.neighDiscussion = undefined;
    }
    G.uiCardToCard = undefined;
    G.uiExecuteDo = undefined;
    G.mustEndTurnImmediately = false;
    _log(G, ctx, ctx.currentPlayer, "ran out of time - turn ended");
    (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.endTurn();
}
function drawAndAdvance(G, ctx) {
    var _a;
    G.hand[ctx.currentPlayer].push(underscore_1["default"].first(G.drawPile));
    G.drawPile = underscore_1["default"].rest(G.drawPile, 1);
    (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.setActivePlayers({ all: "action_phase" });
    G.script = { scenes: [] };
}
function canPlayCard(G, ctx, protagonist, cardID) {
    if (ctx.currentPlayer === protagonist && ctx.activePlayers[protagonist] === "action_phase" && (G.countPlayedCardsInActionPhase === 0 || (G.countPlayedCardsInActionPhase === 1 && G.playerEffects[protagonist].find(function (c) { return c.effect.key === "double_dutch"; })))) {
        return do_1.canEnter(G, ctx, { playerID: protagonist, cardID: cardID });
    }
    return false;
}
exports.canPlayCard = canPlayCard;
function playCard(G, ctx, protagonist, cardID) {
    G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase + 1;
    G.hand[protagonist] = underscore_1["default"].without(G.hand[protagonist], cardID);
    var logEntry = _log(G, ctx, protagonist, "played " + _cardTitle(G, cardID), cardID);
    // A Magic card doesn't know who it's targeting yet - stash the log entry
    // id so enter()/executeDo() in do.js can link it to the eventual target.
    if (G.deck[cardID] && G.deck[cardID].type === "magic") {
        if (!G.clipboard.pendingCardLog) { G.clipboard.pendingCardLog = {}; }
        G.clipboard.pendingCardLog[cardID] = logEntry.id;
    }
    if (G.playerEffects[protagonist].findIndex(function (f) { return f.effect.key === "your_cards_cannot_be_neighed"; }) > -1) {
        do_1.enter(G, ctx, { playerID: protagonist, cardID: cardID });
    }
    else {
        // resolve neigh
        G.neighDiscussion = {
            cardID: cardID, protagonist: protagonist, rounds: [{
                    state: "open",
                    playerState: Object.fromEntries(_activePlayers(G).map(function (pl) { return ([pl.id, { vote: pl.id === protagonist ? "no_neigh" : "undecided" }]); }))
                }],
            target: protagonist
        };
    }
}
function playUpgradeDowngradeCard(G, ctx, protagonist, targetPlayer, cardID) {
    G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase + 1;
    G.hand[protagonist] = underscore_1["default"].without(G.hand[protagonist], cardID);
    _log(G, ctx, protagonist, String(targetPlayer) === String(protagonist)
        ? "played " + _cardTitle(G, cardID) + " on themselves"
        : "played " + _cardTitle(G, cardID) + " on " + _playerName(G, targetPlayer), cardID);
    if (G.playerEffects[protagonist].findIndex(function (f) { return f.effect.key === "your_cards_cannot_be_neighed"; }) > -1) {
        do_1.enter(G, ctx, { playerID: targetPlayer, cardID: cardID });
    }
    else {
        // resolve neigh
        G.neighDiscussion = {
            cardID: cardID, protagonist: protagonist, rounds: [{
                    state: "open",
                    playerState: Object.fromEntries(_activePlayers(G).map(function (pl) { return ([pl.id, { vote: pl.id === protagonist ? "no_neigh" : "undecided" }]); }))
                }],
            target: targetPlayer
        };
    }
}
function playNeigh(G, ctx, cardID, protagonist, roundIndex) {
    if (G.neighDiscussion) {
        G.hand[protagonist] = underscore_1["default"].without(G.hand[protagonist], cardID);
        G.discardPile = __spreadArrays(G.discardPile, [cardID]);
        _log(G, ctx, protagonist, "played " + _cardTitle(G, cardID), cardID);
        var round = G.neighDiscussion.rounds[roundIndex];
        // check if there was already a neigh vote during this round
        // if yes do nothing
        if (round.state !== "open") {
            return;
        }
        // there was no neigh round yet
        // hence neigh the round and add a next round
        round.playerState[protagonist] = { vote: "neigh" };
        round.state = "neigh";
        G.neighDiscussion.rounds.push({
            state: "open",
            playerState: Object.fromEntries(_activePlayers(G).map(function (pl) { return ([pl.id, { vote: pl.id === protagonist ? "no_neigh" : "undecided" }]); }))
        });
    }
}
function playSuperNeigh(G, ctx, cardID, protagonist, roundIndex) {
    if (G.neighDiscussion) {
        G.hand[protagonist] = underscore_1["default"].without(G.hand[protagonist], cardID);
        G.discardPile = __spreadArrays(G.discardPile, [cardID]);
        _log(G, ctx, protagonist, "played " + _cardTitle(G, cardID), cardID);
        var round = G.neighDiscussion.rounds[roundIndex];
        // check if there was already a neigh vote during this round
        // if yes do nothing
        if (round.state !== "open") {
            return;
        }
        // there was no neigh round yet
        // hence neigh the round and add a next round
        round.playerState[protagonist] = { vote: "neigh" };
        round.state = "neigh";
        var cardWasNeighed = (G.neighDiscussion.rounds.length + 1) % 2 === 0;
        if (cardWasNeighed) {
            G.discardPile.push(G.neighDiscussion.cardID);
            G.lastNeighResult = { id: underscore_1["default"].uniqueId(), result: "cardWasNeighed" };
        }
        else {
            do_1.enter(G, ctx, { playerID: G.neighDiscussion.protagonist, cardID: G.neighDiscussion.cardID });
            G.lastNeighResult = { id: underscore_1["default"].uniqueId(), result: "cardWasPlayed" };
        }
        G.neighDiscussion = undefined;
    }
}
function dontPlayNeigh(G, ctx, protagonist, roundIndex) {
    // end
    if (G.neighDiscussion) {
        var round = G.neighDiscussion.rounds[roundIndex];
        round.playerState[protagonist] = { vote: "no_neigh" };
        if (underscore_1["default"].findKey(round.playerState, function (val) { return val.vote === "undecided"; }) === undefined) {
            // everyone has voted => advance the game
            var cardWasNeighed = G.neighDiscussion.rounds.length % 2 === 0;
            if (cardWasNeighed) {
                G.discardPile.push(G.neighDiscussion.cardID);
                G.lastNeighResult = { id: underscore_1["default"].uniqueId(), result: "cardWasNeighed" };
            }
            else {
                do_1.enter(G, ctx, { playerID: G.neighDiscussion.target, cardID: G.neighDiscussion.cardID });
                G.lastNeighResult = { id: underscore_1["default"].uniqueId(), result: "cardWasPlayed" };
            }
            G.neighDiscussion = undefined;
        }
    }
}
function canDraw(G, ctx) {
    if (G.mustEndTurnImmediately === true) {
        return false;
    }
    if (ctx.activePlayers[ctx.currentPlayer] === "beginning") {
        // if there is a mandatory scene => one cannot draw
        if (_findOpenScenesWithProtagonist(G, ctx.currentPlayer).find(function (_a) {
            var instr = _a[0], sc = _a[1];
            return sc.mandatory === true;
        })) {
            return false;
        }
        // if there is an ongoing scene => one cannot draw
        if (_findInProgressScenesWithProtagonist(G, ctx.currentPlayer).length > 0) {
            return false;
        }
        return true;
    }
    if (ctx.activePlayers[ctx.currentPlayer] === "action_phase") {
        return G.countPlayedCardsInActionPhase === 0;
    }
    return false;
}
exports.canDraw = canDraw;
function drawAndEnd(G, ctx) {
    G.script = { scenes: [] };
    G.hand[ctx.currentPlayer].push(underscore_1["default"].first(G.drawPile));
    G.drawPile = underscore_1["default"].rest(G.drawPile, 1);
    G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase + 1;
    _log(G, ctx, ctx.currentPlayer, "drew a card");
}
function end(G, ctx, protagonist) {
    var _a, _b;
    if (G.playerEffects[protagonist].find(function (o) { return o.effect.key === "change_of_luck"; })) {
        G.playerEffects[protagonist] = G.playerEffects[protagonist].filter(function (o) { return o.effect.key !== "change_of_luck"; });
        if (G.hand[protagonist].length > 7) {
            var newScene = {
                id: underscore_1["default"].uniqueId(),
                mandatory: true,
                endTurnImmediately: false,
                actions: [{
                        type: "action",
                        instructions: [{
                                id: underscore_1["default"].uniqueId(),
                                protagonist: protagonist,
                                state: "open",
                                "do": {
                                    key: "discard",
                                    info: { count: G.hand[protagonist].length - 7, type: "any" }
                                },
                                ui: { type: "click_on_own_card_in_hand" }
                            }]
                    }]
            };
            G.script.scenes = __spreadArrays(G.script.scenes, [newScene]);
        }
        else {
            (_a = ctx.events) === null || _a === void 0 ? void 0 : _a.endTurn({ next: protagonist });
        }
    }
    else {
        if (G.hand[protagonist].length > 7) {
            var newScene = {
                id: underscore_1["default"].uniqueId(),
                mandatory: true,
                endTurnImmediately: false,
                actions: [{
                        type: "action",
                        instructions: [{
                                id: underscore_1["default"].uniqueId(),
                                protagonist: protagonist,
                                state: "open",
                                "do": {
                                    key: "discard",
                                    info: { count: G.hand[protagonist].length - 7, type: "any" }
                                },
                                ui: { type: "click_on_own_card_in_hand" }
                            }]
                    }]
            };
            G.script.scenes = __spreadArrays(G.script.scenes, [newScene]);
        }
        else {
            (_b = ctx.events) === null || _b === void 0 ? void 0 : _b.endTurn();
        }
    }
}
function commit(G, ctx, sceneID) {
    var scene = G.script.scenes.find(function (sc) { return sc.id === sceneID; });
    scene.mandatory = true;
    scene.playerCommitted = true;
    // e.g. "Discard 2 cards" committed with an empty hand: settle it immediately
    // instead of leaving the player stuck with nothing to click on.
    do_1._settleUnfulfillableDiscards(G, ctx);
}
function skipExecuteDo(G, ctx, protagonist, instructionID) {
    var found = do_1._findInstructionWithID(G, instructionID);
    if (found === null) {
        return;
    }
    var scene = found[0], instruction = found[2];
    // has any part of this scene actually run yet (for anyone)?
    var anyExecuted = scene.actions.some(function (ac) {
        return ac.instructions.some(function (ins) { return ins.state === "executed"; });
    });
    var sourceCardID = (instruction.ui && instruction.ui.info) ? instruction.ui.info.source : undefined;
    // Nothing has actually happened yet and the trigger was a Magic card that is
    // still mid-play (sitting in the temporary stable): take it back to hand and
    // refund the play - exactly as if it was never played.
    if (!anyExecuted && sourceCardID !== undefined &&
        (G.temporaryStable[protagonist] || []).indexOf(sourceCardID) !== -1) {
        G.temporaryStable[protagonist] = underscore_1["default"].without(G.temporaryStable[protagonist], sourceCardID);
        G.hand[protagonist] = __spreadArrays(G.hand[protagonist], [sourceCardID]);
        if (G.countPlayedCardsInActionPhase > 0) {
            G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase - 1;
        }
        G.script.scenes = G.script.scenes.filter(function (sc) { return sc.id !== scene.id; });
        G.uiCardToCard = undefined;
        G.uiExecuteDo = undefined;
        _log(G, ctx, protagonist, "took back " + _cardTitle(G, sourceCardID), sourceCardID);
        return;
    }
    // Otherwise reset every step that has not actually run yet back to "open", so
    // the effect is exactly as it was before the player started aiming it and can
    // be triggered again. Nothing is marked "executed" / skipped, so a later step
    // can never unlock by cancelling an earlier one.
    scene.actions.forEach(function (ac) {
        ac.instructions
            .filter(function (ins) { return ins.protagonist === protagonist && ins.state !== "executed"; })
            .forEach(function (ins) { ins.state = "open"; });
    });
    // If the player voluntarily opted into this "you may..." scene (clicked
    // e.g. "Discard 2 cards") but hasn't actually done anything yet, cancelling
    // fully un-commits it too. A scene that was mandatory from the moment it was
    // created (a forced effect, never opted into) is never touched here, so
    // Cancel can't be used to dodge a genuinely required action.
    if (!anyExecuted && scene.playerCommitted === true) {
        scene.mandatory = false;
    }
}
//
function setUIHoverHandIndex(G, ctx, index) {
    if (index === undefined || G.hand[ctx.currentPlayer].length > index) {
        G.uiHoverHandIndex = index;
    }
}
function setUICardToCard(G, ctx, param) {
    if (param !== undefined) {
        G.uiCardToCard = __assign(__assign({}, param), { id: underscore_1["default"].uniqueId() });
    }
    else {
        G.uiCardToCard = undefined;
    }
}
exports["default"] = UnstableUnicorns;
// Helper
function _addSceneFromDo(G, ctx, cardID, owner, trigger) {
    var card = G.deck[cardID];
    if (!card.on) {
        return;
    }
    // all unicorns are basic
    // trigger no effect
    if (G.playerEffects[owner].find(function (s) { return s.effect.key === "my_unicorns_are_basic"; })) {
        if (G.playerEffects[owner].find(function (s) { return s.effect.key === "pandamonium"; }) === undefined) {
            if (card.type === "narwhal" || card.type === "unicorn") {
                return;
            }
        }
    }
    card.on.forEach(function (on) {
        if (on["do"].type === "add_scene" && (on.trigger === trigger || trigger === "any")) {
            var newScene = {
                id: underscore_1["default"].uniqueId(),
                mandatory: on["do"].info.mandatory,
                endTurnImmediately: on["do"].info.endTurnImmediately,
                actions: on["do"].info.actions.map(function (ac) {
                    var instructions = [];
                    ac.instructions.forEach(function (c) {
                        var protagonists = [];
                        if (c.protagonist === "owner") {
                            protagonists.push(owner);
                        }
                        else if (c.protagonist === "all") {
                            protagonists = _activePlayers(G).map(function (pl) { return pl.id; });
                        }
                        protagonists.forEach(function (pid) {
                            instructions.push({
                                id: underscore_1["default"].uniqueId(),
                                protagonist: pid,
                                state: "open",
                                // deep-clone: c["do"] comes from the static card definition
                                // and is shared by every copy of this card and every future
                                // turn; executeDo mutates do.info.count in place, so without
                                // cloning a card's second-ever activation would find count
                                // already exhausted and never mark itself executed.
                                "do": JSON.parse(JSON.stringify(c["do"])),
                                ui: __assign(__assign({}, c.ui), { info: __assign({ source: card.id }, c.ui.info) })
                            });
                        });
                    });
                    var action = {
                        type: "action",
                        instructions: instructions
                    };
                    return action;
                })
            };
            G.script.scenes = __spreadArrays(G.script.scenes, [newScene]);
        }
    });
    do_1._settleUnfulfillableDiscards(G, ctx);
}
exports._addSceneFromDo = _addSceneFromDo;
// find all scenes that have already started and are not finished
// or all scenes that have not started yet
function _findOpenScenesWithProtagonist(G, protagonist) {
    var scenes = [];
    var stop = false;
    G.script.scenes.forEach(function (scene) {
        scene.actions.forEach(function (action) {
            if (stop) {
                return;
            }
            // find most recent action
            if (action.instructions.filter(function (ins) { return ins.state === "open" || ins.state === "in_progress"; }).length > 0) {
                stop = true;
                var inst = action.instructions.filter(function (ins) { return ins.protagonist === protagonist && (ins.state === "open" || ins.state === "in_progress"); });
                inst.forEach(function (i) { return scenes.push([i, scene]); });
            }
        });
        stop = false;
    });
    return scenes;
}
exports._findOpenScenesWithProtagonist = _findOpenScenesWithProtagonist;
// a scene is in progress if its first action is finished
function _findInProgressScenesWithProtagonist(G, protagonist) {
    var scenes = [];
    var stop = false;
    G.script.scenes.forEach(function (scene) {
        if (scene.mandatory) {
            var action = underscore_1["default"].first(scene.actions);
            if (action.instructions.filter(function (ins) { return ins.state === "open" || ins.state === "in_progress"; }).length > 0) {
                stop = true;
                var inst = action.instructions.filter(function (ins) { return ins.protagonist === protagonist && (ins.state === "open" || ins.state === "in_progress"); });
                inst.forEach(function (i) { return scenes.push([i, scene]); });
            }
        }
        scene.actions.forEach(function (action, idx) {
            if (stop || idx === 0) {
                return;
            }
            // find most recent open action excluding the first action
            if (action.instructions.filter(function (ins) { return ins.state === "open" || ins.state === "in_progress"; }).length > 0) {
                // check if the prior action was completed
                if (scene.actions[idx - 1].instructions.filter(function (ins) { return ins.state === "executed"; }).length === scene.actions[idx - 1].instructions.length) {
                    stop = true;
                    var inst = action.instructions.filter(function (ins) { return ins.protagonist === protagonist && (ins.state === "open" || ins.state === "in_progress"); });
                    inst.forEach(function (i) { return scenes.push([i, scene]); });
                }
            }
        });
        stop = false;
    });
    return scenes;
}
exports._findInProgressScenesWithProtagonist = _findInProgressScenesWithProtagonist;
function _findInstruction(G, instructionID) {
    var instruction, action, scene = undefined;
    G.script.scenes.forEach(function (sc) {
        sc.actions.forEach(function (ac) {
            ac.instructions.forEach(function (ic) {
                if (ic.id === instructionID) {
                    instruction = ic;
                    action = ac;
                    scene = sc;
                }
            });
        });
    });
    if (instruction === undefined || action === undefined || scene === undefined) {
        return undefined;
    }
    return [instruction, action, scene];
}
exports._findInstruction = _findInstruction;
