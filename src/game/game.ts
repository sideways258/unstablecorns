import type { Game, Ctx } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import type { Player, PlayerID } from './player';
import type { CardID, Card, CardUI, OnEnterAddEffect } from './card';
import { canEnter, Do, enter, _findInstructionWithID, _settleUnfulfillableDiscards } from './do';
import { initializeDeck } from './card';
import { CONSTANTS } from './constants';
import { executeDo } from './do';
import { Effect } from './effect';
import _ from 'underscore';
import type { NeighDiscussion } from './neigh';
import { funnyNames } from '../funnyNames';

export type { Ctx };

export interface UnstableUnicornsGame extends Game {
    players: Player[];
    deck: Card[];
    drawPile: CardID[];
    discardPile: CardID[];
    nursery: CardID[];
    hand: { [key: string]: CardID[] };
    stable: { [key: string]: CardID[] };
    temporaryStable: { [key: string]: CardID[] }; // may contain magic cards which are immediately put on the discard pile after their effect is used
    upgradeDowngradeStable: { [key: string]: CardID[] };
    script: Script;
    playerEffects: { [key: string]: { cardID?: CardID, effect: Effect }[] };
    mustEndTurnImmediately: boolean;
    countPlayedCardsInActionPhase: number;
    neighDiscussion?: NeighDiscussion;
    clipboard: {[key: string]: any};
    endGame: boolean;
    expansions: string[];
    /** Seats whose player has left the game. They are skipped in the turn
     *  order, hold no cards, and owe no actions. */
    leftPlayers: PlayerID[];
    /** Optional host-run turn timer, toggled on/off directly (the clock button
     *  on the board). When `enabled`, a turn that runs past `durationSec`
     *  (60-300) is force-ended. */
    turnTimer: {
        enabled: boolean;
        durationSec: number;
        turnStartedAt: number | undefined;
    };
    babyStarter: { cardID: CardID, owner: PlayerID }[];
    ready: { [key: string]: boolean };
    uiHoverHandIndex: number | undefined;
    uiExecuteDo: {id: string, cardID: CardID | undefined, do: Do} | undefined;
    uiCardToCard: {
        protagonist: PlayerID,
        sourceCardID: CardID,
        instructionID: string,
        targetCardID: CardID,
        id: string,
    } | undefined;
    lastNeighResult: {id: string, result: "cardWasPlayed" | "cardWasNeighed"} | undefined;
    /** Round counter. A round is one full cycle of turns (every active player has
     *  played once). Starts at 1 in the main phase. */
    round: number;
    /** seats that have already taken a turn this round - internal, drives `round`
     *  (immune to bonus turns and to players leaving mid-round). */
    roundSeats: PlayerID[];
    /** Shared, append-only history of what each player did (card plays, neighs,
     *  draws, ...), shown to everyone in the audit-log window. */
    auditLog: AuditEntry[];
}

export interface AuditEntry {
    id: string;
    round: number;
    turn: number;
    playerID: PlayerID;
    playerName: string;
    text: string;
    /** the card this entry is about (for the hover preview in the log window) */
    cardID?: CardID;
    cardTitle?: string;
    /** who a played upgrade/downgrade/magic card ended up targeting, if anyone */
    targetPlayerID?: PlayerID;
    ts: number;
}

interface Script {
    scenes: Scene[];
}

type SceneID = string;

export interface Scene {
    id: SceneID;
    actions: Action[];
    mandatory: boolean;
    endTurnImmediately: boolean;
    /** true once the player has explicitly opted into an optional "you may..."
     *  scene via the commit move (e.g. clicking "Discard 2 cards"). Lets Cancel
     *  fully undo that choice - as opposed to a scene that was mandatory from
     *  the moment it was created (a forced effect), which Cancel must never be
     *  able to uncommit. */
    playerCommitted?: boolean;
    /** links this scene back to the "played <Card>" audit-log entry that
     *  created it, so a Magic card's eventual target (only known once its
     *  effect actually resolves) can be appended to that same log line. */
    auditLogEntryId?: string;
}

export interface Action {
    type: "action";
    instructions: Instruction[];
}

export interface Instruction {
    id: string;
    protagonist: PlayerID;
    state: "executed" | "open" | "in_progress";
    do: Do;
    ui: {
        type: "single_action_popup",
        info?: { source: CardID, singleActionText?: string },
    } | {
        type: "card_to_card" | "card_to_handcard" | "card_to_player" | "click_on_own_card_in_stable" | "click_on_own_card_in_hand" | "yes_no_popup" | "click_on_card_in_stable" | "yes_no_popup" | "click_on_drawPile" | "custom",
        info?: { source: CardID },
    }
}






const UnstableUnicorns = {
    name: "unstable_unicorns",
    // Win conditions: the host ends the match, a player reaches 7 unicorns in
    // their stable, OR everyone else has left the game.
    endIf: (G: UnstableUnicornsGame, ctx: Ctx) => {
        if (G.endGame) {
            return { endedByHost: true };
        }
        if (ctx.phase === "main") {
            const remaining = G.players.filter(p => (G.leftPlayers || []).indexOf(p.id) === -1);
            if (remaining.length === 0) {
                return { draw: true };
            }
            if (remaining.length === 1) {
                return { winner: remaining[0].id, lastOneStanding: true };
            }
            for (const p of remaining) {
                if (_countUnicorns(G, p.id) >= CONSTANTS.stableSeats) {
                    return { winner: p.id };
                }
            }
        }
    },
    // Available in every phase/stage so the host can always bail out, any player
    // can drop out, and the turn timer keeps working.
    moves: { endMatch, playerLeft, setTurnTimer, forceEndTurnOnTimeout },
    setup: (ctx: Ctx, setupData: any): UnstableUnicornsGame => {
        const funny = funnyNames(ctx.numPlayers);
        const players: Player[] = Array.from({ length: ctx.numPlayers }, (val, idx) => {
            return {
                id: `${idx}`,
                name: funny[idx],
            };
        });

        const deck = initializeDeck();
        const discardPile: CardID[] = [];
        let nursery: CardID[] = [];
        let drawPile = _.shuffle(deck).filter(c => c.type !== "baby").map(c => c.id);
        let hand: { [key: string]: CardID[] } = {};
        let stable: { [key: string]: CardID[] } = {};
        let temporaryStable: { [key: string]: CardID[] } = {};
        let upgradeDowngradeStable: { [key: string]: CardID[] } = {};
        let playerEffects: { [key: string]: { cardID: CardID, effect: Effect }[] } = {};
        let ready: {[key: string]: boolean} = {};

        players.forEach(pl => {
            ready[pl.id] = false;
            hand[pl.id] = _.first(drawPile, CONSTANTS.numberOfHandCardsAtStart);
            drawPile = _.rest(drawPile, CONSTANTS.numberOfHandCardsAtStart);
            stable[pl.id] = []; 
            temporaryStable[pl.id] = [];
            upgradeDowngradeStable[pl.id] = []; 
            playerEffects[pl.id] = [];
        });

        return {
            players,
            deck,
            drawPile,
            nursery,
            discardPile,
            hand,
            stable,
            temporaryStable,
            upgradeDowngradeStable,
            script: { scenes: [] },
            playerEffects,
            mustEndTurnImmediately: false,
            countPlayedCardsInActionPhase: 0,
            clipboard: {},
            endGame: false,
            expansions: [],
            leftPlayers: [],
            turnTimer: { enabled: false, durationSec: 120, turnStartedAt: undefined },
            babyStarter: [],
            ready,
            uiHoverHandIndex: undefined,
            uiExecuteDo: undefined,
            uiCardToCard: undefined,
            lastNeighResult: undefined,
            round: 1,
            roundSeats: [],
            auditLog: [],
        };
    },
    phases: {
        pregame: {
            start: true,
            onBegin: (G: UnstableUnicornsGame, ctx: Ctx) => {
                ctx.events?.setActivePlayers!({all: "pregame"})
            }
        },
        main: {
            //start: true,
            onBegin: (G: UnstableUnicornsGame, ctx: Ctx) => {

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
            playOrder: (G: UnstableUnicornsGame, ctx: Ctx) => _.shuffle(G.players.map(p => p.id)),
            first: (G: UnstableUnicornsGame, ctx: Ctx) => {
                for (let pos = 0; pos < ctx.numPlayers; pos++) {
                    if ((G.leftPlayers || []).indexOf(ctx.playOrder[pos]) === -1) {
                        return pos;
                    }
                }
                return 0;
            },
            next: (G: UnstableUnicornsGame, ctx: Ctx) => {
                let pos = ctx.playOrderPos;
                for (let i = 0; i < ctx.numPlayers; i++) {
                    pos = (pos + 1) % ctx.numPlayers;
                    if ((G.leftPlayers || []).indexOf(ctx.playOrder[pos]) === -1) {
                        return pos;
                    }
                }
                return ctx.playOrderPos;
            },
        },
        onBegin: (G: UnstableUnicornsGame, ctx: Ctx) => {
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
                [...G.stable[ctx.currentPlayer], ...G.upgradeDowngradeStable[ctx.currentPlayer]].forEach(c => _addSceneFromDo(G, ctx, c, ctx.currentPlayer, "begin_of_turn"));

                // begin of turn: add effect
                [...G.stable[ctx.currentPlayer], ...G.upgradeDowngradeStable[ctx.currentPlayer]].forEach(c => {
                    const card = G.deck[c];
                    const cardOnBegin = card.on?.filter(c => c.trigger === "begin_of_turn");
                    // all unicorns are basic
                    // trigger no effect
                    if (G.playerEffects[ctx.currentPlayer].find(s => s.effect.key === "my_unicorns_are_basic")) {
                        if (G.playerEffects[ctx.currentPlayer].find(s => s.effect.key === "pandamonium") === undefined) {
                            if (card.type === "narwhal" || card.type === "unicorn") {
                                return;
                            }
                        }
                    }

                    if (cardOnBegin) {
                        cardOnBegin.filter(on => on.do.type === "add_effect").forEach(on => {
                            const doAddEffect = <OnEnterAddEffect>on.do;
                            // check if effect has already been added
                            if (G.playerEffects[ctx.currentPlayer].filter(s => s.cardID === c).length === 0) {
                                G.playerEffects[ctx.currentPlayer] = [...G.playerEffects[ctx.currentPlayer], { cardID: c, effect: doAddEffect.info }];
                            }
                        });
                    }
                });


                ctx.events?.setActivePlayers!({ all: "beginning" });
            } else {
                // no cards to draw
                // need to end the game
                ctx.events?.setPhase!("end");
            }
        },
        onEnd: (G: UnstableUnicornsGame, ctx: Ctx) => {
            // Round counting: a round is complete once every active player has
            // taken a turn. Tracking distinct seats makes it immune to bonus
            // turns (Change of Luck) and to a player leaving mid-round.
            if (ctx.phase === "main") {
                if (G.round === undefined) { G.round = 1; }
                if (!Array.isArray(G.roundSeats)) { G.roundSeats = []; }
                if (G.roundSeats.indexOf(ctx.currentPlayer) === -1) {
                    G.roundSeats = [...G.roundSeats, ctx.currentPlayer];
                }
                const activeIds = _activePlayers(G).map(p => p.id);
                if (activeIds.length > 0 && activeIds.every(id => G.roundSeats.indexOf(id) !== -1)) {
                    G.round = G.round + 1;
                    G.roundSeats = [];
                }
            }
        },
        stages: {
            pregame: {
                moves: { ready, selectBaby, changeName, endMatch, setExpansions, playerLeft, setTurnTimer, forceEndTurnOnTimeout }
            },
            beginning: {
                moves: { drawAndAdvance, executeDo, end, commit, skipExecuteDo, setUIHoverHandIndex, setUICardToCard, endMatch, playerLeft, setTurnTimer, forceEndTurnOnTimeout }
            },
            action_phase: {
                moves: {
                    commit, executeDo, end, drawAndEnd, playCard, playUpgradeDowngradeCard, playNeigh, playSuperNeigh, dontPlayNeigh, skipExecuteDo, setUIHoverHandIndex, setUICardToCard, endMatch, playerLeft, setTurnTimer, forceEndTurnOnTimeout
                }
            }
        }
    }
}

function initializeGame(G: UnstableUnicornsGame, ctx: Ctx) {
    // If the host enabled any expansion packs, rebuild the deck from base + those
    // packs and re-deal hands / draw pile. Card ids 0..12 stay the Baby Unicorns
    // so babyStarter picks and the nursery logic below still line up.
    if (G.expansions && G.expansions.length > 0) {
        const fullDeck = initializeDeck(G.expansions);
        let drawPile = _.shuffle(fullDeck).filter(c => c.type !== "baby").map(c => c.id);
        G.players.forEach(pl => {
            G.hand[pl.id] = _.first(drawPile, CONSTANTS.numberOfHandCardsAtStart);
            drawPile = _.rest(drawPile, CONSTANTS.numberOfHandCardsAtStart);
        });
        G.deck = fullDeck;
        G.drawPile = drawPile;
        G.discardPile = [];
    }

    let a: number[] = [];
    for (let i=0; i<13; i++) {
        a.push(i);
    }

    G.babyStarter.forEach(({cardID, owner}) => {
        G.stable[owner].push(cardID);
        a = _.without(a, cardID);
    });

    a.forEach(cardId => {
        G.nursery.push(cardId);
    })
}

// Host-only: choose which optional expansion packs are in play. Applied when the
// game leaves the lobby (see initializeGame).
function setExpansions(G: UnstableUnicornsGame, ctx: Ctx, sets: string[]) {
    if (ctx.playerID !== "0") {
        return INVALID_MOVE;
    }
    G.expansions = Array.isArray(sets) ? sets.filter(s => typeof s === "string") : [];
}

function changeName(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, name: string) {
    G.players[parseInt(protagonist)].name = name;
}

const UNICORN_TYPES = ["baby", "basic", "unicorn", "narwhal"];

// Players still in the game (everyone who has not left). Use this anywhere the
// game waits on "every player" so a seat that left never stalls a scene or a
// neigh vote.
export function _activePlayers(G: UnstableUnicornsGame): Player[] {
    return G.players.filter(p => (G.leftPlayers || []).indexOf(p.id) === -1);
}

// Append an entry to the shared audit log (what each player did). Returns the
// entry so the caller can hold onto its id (see _recordCardTarget).
function _log(G: UnstableUnicornsGame, ctx: Ctx, playerID: PlayerID, text: string, cardID?: CardID): AuditEntry {
    if (!G.auditLog) { G.auditLog = []; }
    const pl = G.players.find(p => p.id === String(playerID));
    const entry: AuditEntry = {
        id: _.uniqueId("log_"),
        round: G.round || 1,
        turn: ctx.turn,
        playerID: String(playerID),
        playerName: (pl && pl.name) || `Player ${playerID}`,
        text,
        cardID: (cardID !== undefined && cardID !== null) ? cardID : undefined,
        cardTitle: (cardID !== undefined && cardID !== null) ? _cardTitle(G, cardID) : undefined,
        ts: Date.now(),
    };
    G.auditLog.push(entry);
    if (G.auditLog.length > 250) {
        G.auditLog = G.auditLog.slice(-250);
    }
    return entry;
}

// Called once a played Magic card's effect actually resolves against another
// player (a "steal"/"destroy"/... step, not a self-only cost step like
// discard/sacrifice) - appends who it hit to the existing "played <Card>" log
// line, same shape as upgrade/downgrade's "played <Card> on <Player>". Only
// the first resolved target sticks (multi-step cards may hit more than one
// player; the log stays a one-line summary rather than enumerating all of them).
export function _recordCardTarget(G: UnstableUnicornsGame, entryId: string | undefined, targetPlayer: PlayerID) {
    if (!entryId || !G.auditLog) { return; }
    const entry = G.auditLog.find(e => e.id === entryId);
    if (!entry || entry.targetPlayerID !== undefined) { return; }
    entry.targetPlayerID = targetPlayer;
    entry.text = `${entry.text} on ${_playerName(G, targetPlayer)}`;
}

function _cardTitle(G: UnstableUnicornsGame, cardID: CardID): string {
    const c = G.deck[cardID];
    return (c && c.title) || "a card";
}

function _playerName(G: UnstableUnicornsGame, playerID: PlayerID): string {
    const pl = G.players.find(p => p.id === String(playerID));
    return (pl && pl.name) || `Player ${playerID}`;
}

// Number of unicorns in a player's stable (Baby / Basic / Magical / Narwhal all
// count). A card counts twice if it has the "count_as_two" passive OR it granted
// the player a "count_as_two" effect on entering (e.g. Ginormous Unicorn).
// If the player has "pandamonium" active, every Unicorn in their Stable is a
// Panda instead and none of them count. Reaching CONSTANTS.stableSeats (7) wins.
export function _countUnicorns(G: UnstableUnicornsGame, playerID: PlayerID): number {
    const effects = G.playerEffects[playerID] || [];
    if (effects.some(e => e.effect && e.effect.key === "pandamonium")) {
        return 0;
    }
    return (G.stable[playerID] || []).reduce((sum, cardID) => {
        const card = G.deck[cardID];
        if (!card || UNICORN_TYPES.indexOf(card.type) === -1) {
            return sum;
        }
        const countsAsTwo =
            (card.passive && card.passive.indexOf("count_as_two") !== -1) ||
            effects.some(e => e.cardID === cardID && e.effect && e.effect.key === "count_as_two");
        return sum + (countsAsTwo ? 2 : 1);
    }, 0);
}

// Only the lobby host (seat 0) may end the match for everyone. endIf picks this up.
function endMatch(G: UnstableUnicornsGame, ctx: Ctx) {
    if (ctx.playerID !== "0") {
        return INVALID_MOVE;
    }
    G.endGame = true;
}

// A player leaves for good. Their turn, their cards, and every action they still
// owe are removed so the game never stalls waiting on someone who is gone. The
// turn order (see turn.order) skips them from here on, and endIf ends the game
// once only one player is left.
function playerLeft(G: UnstableUnicornsGame, ctx: Ctx, leaverID?: PlayerID) {
    const pid: PlayerID | undefined =
        leaverID !== undefined && leaverID !== null ? String(leaverID) : (ctx.playerID as PlayerID | undefined);
    if (pid === undefined || G.players.find(p => p.id === pid) === undefined) {
        return INVALID_MOVE;
    }
    // You can only remove yourself from the game.
    if (ctx.playerID != null && pid !== String(ctx.playerID)) {
        return INVALID_MOVE;
    }
    if (G.leftPlayers.indexOf(pid) !== -1) {
        return; // already gone
    }

    G.leftPlayers = [...G.leftPlayers, pid];
    _log(G, ctx, pid, "left the game");

    // 1. Their cards leave play. Baby unicorns go back to the Nursery (their
    //    printed rule), everything else to the discard pile.
    const dump = (ids: CardID[]) => {
        (ids || []).forEach(cardID => {
            const card = G.deck[cardID];
            if (card && card.type === "baby") {
                G.nursery.push(cardID);
            } else if (card) {
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

    // 2. Drop every instruction that still needs the leaver so no scene waits on
    //    them, then discard any scene that is now fully resolved.
    G.script.scenes.forEach(scene => {
        scene.actions.forEach(action => {
            action.instructions.forEach(ins => {
                if (ins.protagonist === pid && ins.state !== "executed") {
                    ins.state = "executed";
                }
            });
        });
    });
    G.script.scenes = G.script.scenes.filter(scene =>
        scene.actions.some(action =>
            action.instructions.some(ins => ins.state !== "executed")
        )
    );

    // 3. A neigh discussion cannot wait on a player who left.
    if (G.neighDiscussion) {
        if (G.neighDiscussion.protagonist === pid || G.neighDiscussion.target === pid) {
            // The card in question just fizzles onto the discard pile.
            G.discardPile.push(G.neighDiscussion.cardID);
            G.neighDiscussion = undefined;
        } else {
            G.neighDiscussion.rounds.forEach(round => {
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
        ctx.events?.endTurn!();
    }

    // 6. In the lobby, don't let their un-readied seat hold the game hostage:
    //    if every remaining player is ready (and has a baby), start.
    if (ctx.phase === "pregame") {
        const remaining = _activePlayers(G);
        if (remaining.length >= 2 &&
            remaining.every(p => G.ready[p.id] === true && G.babyStarter.find(s => s.owner === p.id))) {
            initializeGame(G, ctx);
            ctx.events?.setPhase!("main");
        }
    }
}

function ready(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID) {
    G.ready[protagonist] = true;

    if (_.every(_.values(G.ready), bo => bo)) {
        initializeGame(G, ctx);
        ctx.events?.setPhase!("main");
    }
}

const TIMER_MIN_SEC = 60;
const TIMER_MAX_SEC = 300;

// Host-only (seat 0). Toggle the timer on/off (the clock button) and/or adjust
// its duration, any time - no unlock requirement.
function setTurnTimer(G: UnstableUnicornsGame, ctx: Ctx, patch: { enabled?: boolean; durationSec?: number }) {
    if (String(ctx.playerID) !== "0" || (G.leftPlayers || []).indexOf("0") !== -1) {
        return INVALID_MOVE;
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

// Any player may call this once the current turn has run past the timer. Guarded
// so it is a no-op unless the timer is really enabled and really expired; the
// current player's pending actions are cleared so the turn can actually end.
function forceEndTurnOnTimeout(G: UnstableUnicornsGame, ctx: Ctx) {
    const t = G.turnTimer;
    if (!t || !t.enabled || !t.turnStartedAt || ctx.phase === "pregame") {
        return INVALID_MOVE;
    }
    if (Date.now() - t.turnStartedAt < t.durationSec * 1000) {
        return INVALID_MOVE;
    }

    const pid = ctx.currentPlayer;

    // clear anything the slow player still owes so the turn can end cleanly
    G.script.scenes.forEach(scene => {
        scene.actions.forEach(action => {
            action.instructions.forEach(ins => {
                if (ins.protagonist === pid && ins.state !== "executed") {
                    ins.state = "executed";
                }
            });
        });
    });
    G.script.scenes = G.script.scenes.filter(scene =>
        scene.actions.some(action =>
            action.instructions.some(ins => ins.state !== "executed")
        )
    );
    if (G.neighDiscussion) {
        G.discardPile.push(G.neighDiscussion.cardID);
        G.neighDiscussion = undefined;
    }
    G.uiCardToCard = undefined;
    G.uiExecuteDo = undefined;
    G.mustEndTurnImmediately = false;
    _log(G, ctx, pid, "ran out of time - turn ended");

    ctx.events?.endTurn!();
}

function selectBaby(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, cardID: CardID) {
    // Players may change their pick in the lobby: drop any previous choice first.
    G.babyStarter = G.babyStarter.filter(s => s.owner !== protagonist);
    G.babyStarter.push({
        cardID, owner: protagonist
    });
}

function drawAndAdvance(G: UnstableUnicornsGame, ctx: Ctx) {
    G.hand[ctx.currentPlayer].push(_.first(G.drawPile)!);
    G.drawPile = _.rest(G.drawPile, 1);
    ctx.events?.setActivePlayers!({ all: "action_phase" });

    G.script = { scenes: [] };
}

export function canPlayCard(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, cardID: CardID) {
    if (ctx.currentPlayer === protagonist && ctx.activePlayers![protagonist] === "action_phase" && (G.countPlayedCardsInActionPhase === 0 || (G.countPlayedCardsInActionPhase === 1 && G.playerEffects[protagonist].find(c => c.effect.key === "double_dutch")))) {
        return canEnter(G, ctx, { playerID: protagonist, cardID });
    }

    return false;
}

function playCard(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, cardID: CardID) {
    G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase + 1;
    G.hand[protagonist] = _.without(G.hand[protagonist], cardID);
    const logEntry = _log(G, ctx, protagonist, `played ${_cardTitle(G, cardID)}`, cardID);

    // A Magic card doesn't know who it's targeting yet - that's resolved once
    // its effect actually runs (see enter() / executeDo()). Stash the log
    // entry id so whichever code creates its scene can link the two.
    if (G.deck[cardID] && G.deck[cardID].type === "magic") {
        if (!G.clipboard.pendingCardLog) { G.clipboard.pendingCardLog = {}; }
        G.clipboard.pendingCardLog[cardID] = logEntry.id;
    }

    if (G.playerEffects[protagonist].findIndex(f => f.effect.key === "your_cards_cannot_be_neighed") > -1) {
        enter(G, ctx, { playerID: protagonist, cardID });
    } else {
        // resolve neigh
        G.neighDiscussion = {
            cardID, protagonist, rounds: [{
                state: "open",
                playerState: Object.fromEntries(_activePlayers(G).map(pl => ([pl.id, { vote: pl.id === protagonist ? "no_neigh" : "undecided" }])))
            }],
            target: protagonist,
        };
    }
}

function playUpgradeDowngradeCard(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, targetPlayer: PlayerID, cardID: CardID) {
    G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase + 1;
    G.hand[protagonist] = _.without(G.hand[protagonist], cardID);
    _log(G, ctx, protagonist, String(targetPlayer) === String(protagonist)
        ? `played ${_cardTitle(G, cardID)} on themselves`
        : `played ${_cardTitle(G, cardID)} on ${_playerName(G, targetPlayer)}`, cardID);

    if (G.playerEffects[protagonist].findIndex(f => f.effect.key === "your_cards_cannot_be_neighed") > -1) {
        enter(G, ctx, { playerID: targetPlayer, cardID });
    } else {
        // resolve neigh
        G.neighDiscussion = {
            cardID, protagonist, rounds: [{
                state: "open",
                playerState: Object.fromEntries(_activePlayers(G).map(pl => ([pl.id, { vote: pl.id === protagonist ? "no_neigh" : "undecided" }]))),
            }],
            target: targetPlayer,
        };
    }
}

function playNeigh(G: UnstableUnicornsGame, ctx: Ctx, cardID: CardID, protagonist: PlayerID, roundIndex: number) {
    if (G.neighDiscussion) {
        G.hand[protagonist] = _.without(G.hand[protagonist], cardID);
        G.discardPile = [...G.discardPile, cardID];
        _log(G, ctx, protagonist, `played ${_cardTitle(G, cardID)}`, cardID);

        const round = G.neighDiscussion.rounds[roundIndex];
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
            playerState: Object.fromEntries(_activePlayers(G).map(pl => ([pl.id, { vote: pl.id === protagonist ? "no_neigh" : "undecided" }])))
        });
    }
}

function playSuperNeigh(G: UnstableUnicornsGame, ctx: Ctx, cardID: CardID, protagonist: PlayerID, roundIndex: number) {
    if (G.neighDiscussion) {
        G.hand[protagonist] = _.without(G.hand[protagonist], cardID);
        G.discardPile = [...G.discardPile, cardID];
        _log(G, ctx, protagonist, `played ${_cardTitle(G, cardID)}`, cardID);

        const round = G.neighDiscussion.rounds[roundIndex];
        // check if there was already a neigh vote during this round
        // if yes do nothing
        if (round.state !== "open") {
            return;
        }
        // there was no neigh round yet
        // hence neigh the round and add a next round
        round.playerState[protagonist] = { vote: "neigh" };
        round.state = "neigh";

        const cardWasNeighed = (G.neighDiscussion.rounds.length+1) % 2 === 0;
        if (cardWasNeighed) {
            G.discardPile.push(G.neighDiscussion.cardID);
            G.lastNeighResult = {id: _.uniqueId(), result: "cardWasNeighed"};
        } else {
            enter(G, ctx, { playerID: G.neighDiscussion.protagonist, cardID: G.neighDiscussion.cardID })
            G.lastNeighResult = {id: _.uniqueId(), result: "cardWasPlayed"};
        }
        G.neighDiscussion = undefined;
    }
}

function dontPlayNeigh(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, roundIndex: number) {
    // end
    if (G.neighDiscussion) {
        const round = G.neighDiscussion.rounds[roundIndex];
        round.playerState[protagonist] = { vote: "no_neigh" };

        if (_.findKey(round.playerState, val => val.vote === "undecided") === undefined) {
            // everyone has voted => advance the game
            const cardWasNeighed = G.neighDiscussion.rounds.length % 2 === 0;
            if (cardWasNeighed) {
                G.discardPile.push(G.neighDiscussion.cardID);
                G.lastNeighResult = {id: _.uniqueId(), result: "cardWasNeighed"};
            } else {
                enter(G, ctx, { playerID: G.neighDiscussion.target, cardID: G.neighDiscussion.cardID })
                G.lastNeighResult = {id: _.uniqueId(), result: "cardWasPlayed"};
            }
            G.neighDiscussion = undefined;
        }
    }
}

export function canDraw(G: UnstableUnicornsGame, ctx: Ctx) {
    if (G.mustEndTurnImmediately === true) {
        return false;
    }

    if (ctx.activePlayers![ctx.currentPlayer] === "beginning") {
        // if there is a mandatory scene => one cannot draw
        if (_findOpenScenesWithProtagonist(G, ctx.currentPlayer!).find(([instr, sc]) => sc.mandatory === true)) {
            return false;
        }

        // if there is an ongoing scene => one cannot draw
        if (_findInProgressScenesWithProtagonist(G, ctx.currentPlayer).length > 0) {
            return false;
        }

        return true;
    }

    if (ctx.activePlayers![ctx.currentPlayer] === "action_phase") {
        return G.countPlayedCardsInActionPhase === 0;
    }

    return false;
}

function drawAndEnd(G: UnstableUnicornsGame, ctx: Ctx) {
    G.script = { scenes: [] };
    G.hand[ctx.currentPlayer].push(_.first(G.drawPile)!);
    G.drawPile = _.rest(G.drawPile, 1);
    G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase + 1;
    _log(G, ctx, ctx.currentPlayer, "drew a card");
}

function end(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID) {
    if (G.playerEffects[protagonist].find(o => o.effect.key === "change_of_luck")) {
        G.playerEffects[protagonist] = G.playerEffects[protagonist].filter(o => o.effect.key !== "change_of_luck");

        if (G.hand[protagonist].length > 7) {
            const newScene: Scene = {
                id: _.uniqueId(),
                mandatory: true,
                endTurnImmediately: false,
                actions: [{
                    type: "action",
                    instructions: [{
                        id: _.uniqueId(),
                            protagonist,
                            state: "open",
                            do: {
                                key: "discard",
                                info: {count: G.hand[protagonist].length - 7, type: "any"}
                            },
                            ui: { type: "click_on_own_card_in_hand" }
                    }]
                }]
            };

            G.script.scenes = [...G.script.scenes, newScene];
        } else {
            ctx.events?.endTurn!({next: protagonist});
        }

    } else {
        if (G.hand[protagonist].length > 7) {
            const newScene: Scene = {
                id: _.uniqueId(),
                mandatory: true,
                endTurnImmediately: false,
                actions: [{
                    type: "action",
                    instructions: [{
                        id: _.uniqueId(),
                            protagonist,
                            state: "open",
                            do: {
                                key: "discard",
                                info: {count: G.hand[protagonist].length - 7, type: "any"}
                            },
                            ui: { type: "click_on_own_card_in_hand" }
                    }]
                }]
            };

            G.script.scenes = [...G.script.scenes, newScene];
        } else {
            ctx.events?.endTurn!();
        }

    }
}

function commit(G: UnstableUnicornsGame, ctx: Ctx, sceneID: string) {
    const scene = G.script.scenes.find(sc => sc.id === sceneID)!;
    scene.mandatory = true;
    scene.playerCommitted = true;
    // e.g. "Discard 2 cards" committed with an empty hand: settle it immediately
    // instead of leaving the player stuck with nothing to click on.
    _settleUnfulfillableDiscards(G, ctx);
}

function skipExecuteDo(G: UnstableUnicornsGame, ctx: Ctx, protagonist: PlayerID, instructionID: string) {
    const found = _findInstructionWithID(G, instructionID);
    if (found === null) {
        return;
    }
    const [scene, , instruction] = found;

    // has any part of this scene actually run yet (for anyone)?
    const anyExecuted = scene.actions.some(ac =>
        ac.instructions.some(ins => ins.state === "executed"));

    const sourceCardID = instruction.ui.info?.source;

    // Nothing has actually happened yet and the trigger was a Magic card that is
    // still mid-play (sitting in the temporary stable): take it back to hand and
    // refund the play - exactly as if it was never played.
    if (!anyExecuted && sourceCardID !== undefined &&
        (G.temporaryStable[protagonist] || []).indexOf(sourceCardID) !== -1) {
        G.temporaryStable[protagonist] = _.without(G.temporaryStable[protagonist], sourceCardID);
        G.hand[protagonist] = [...G.hand[protagonist], sourceCardID];
        if (G.countPlayedCardsInActionPhase > 0) {
            G.countPlayedCardsInActionPhase = G.countPlayedCardsInActionPhase - 1;
        }
        G.script.scenes = G.script.scenes.filter(sc => sc.id !== scene.id);
        G.uiCardToCard = undefined;
        G.uiExecuteDo = undefined;
        _log(G, ctx, protagonist, `took back ${_cardTitle(G, sourceCardID)}`, sourceCardID);
        return;
    }

    // Otherwise reset every step that has not actually run yet back to "open", so
    // the effect is exactly as it was before the player started aiming it and can
    // be triggered again. Nothing is marked "executed" / skipped, so a later step
    // can never unlock by cancelling an earlier one.
    scene.actions.forEach(ac => {
        ac.instructions
            .filter(ins => ins.protagonist === protagonist && ins.state !== "executed")
            .forEach(ins => { ins.state = "open"; });
    });

    // If the player voluntarily opted into this "you may..." scene (clicked
    // e.g. "Discard 2 cards") but hasn't actually done anything yet, cancelling
    // fully un-commits it too - back to a plain offer they can ignore (draw /
    // end turn) or activate again. A scene that was mandatory from the moment
    // it was created (a forced effect, never opted into) is never touched here,
    // so Cancel can't be used to dodge a genuinely required action.
    if (!anyExecuted && scene.playerCommitted === true) {
        scene.mandatory = false;
    }
}

//

function setUIHoverHandIndex(G: UnstableUnicornsGame, ctx: Ctx, index: number | undefined) {
    if (index === undefined || G.hand[ctx.currentPlayer].length > index) {
        G.uiHoverHandIndex = index;
    }
}

function setUICardToCard(G: UnstableUnicornsGame, ctx: Ctx, param: {protagonist: PlayerID, sourceCardID: CardID, instructionID: string, targetCardID: CardID} | undefined) {
    if (param !== undefined) {
        G.uiCardToCard = {...param, id: _.uniqueId()};
    } else {
        G.uiCardToCard = undefined;
    }
}

export default UnstableUnicorns;


// Helper


export function _addSceneFromDo(G: UnstableUnicornsGame, ctx: Ctx, cardID: CardID, owner: PlayerID, trigger: "enter" | "begin_of_turn" | "any") {
    const card = G.deck[cardID];

    if (!card.on) {
        return;
    }

    // all unicorns are basic
    // trigger no effect
    if (G.playerEffects[owner].find(s => s.effect.key === "my_unicorns_are_basic")) {
        if (G.playerEffects[owner].find(s => s.effect.key === "pandamonium") === undefined) {
            if (card.type === "narwhal" || card.type === "unicorn") {
                return;
            }
        }
    }

    card.on.forEach(on => {
        if (on.do.type === "add_scene" && (on.trigger === trigger || trigger === "any")) {
            const newScene: Scene = {
                id: _.uniqueId(),
                mandatory: on.do.info.mandatory,
                endTurnImmediately: on.do.info.endTurnImmediately,
                actions: on.do.info.actions.map(ac => {
                    let instructions: Instruction[] = [];
                    ac.instructions.forEach(c => {
                        let protagonists: PlayerID[] = [];
                        if (c.protagonist === "owner") {
                            protagonists.push(owner);
                        } else if (c.protagonist === "all") {
                            protagonists = _activePlayers(G).map(pl => pl.id);
                        }

                        protagonists.forEach(pid => {
                            instructions.push({
                                id: _.uniqueId(),
                                protagonist: pid,
                                state: "open",
                                // Deep-clone: `c.do` comes straight from the static card
                                // definition and is shared by every copy of this card and
                                // every future turn. executeDo mutates do.info.count in
                                // place (discard/destroy), so without cloning, a card's
                                // second-ever activation anywhere in the game would find
                                // count already exhausted and never mark itself executed -
                                // permanently stalling the next step (e.g. a "discard, then
                                // draw" card would stop letting you draw after turn one).
                                do: JSON.parse(JSON.stringify(c.do)),
                                ui: { ...c.ui, info: { source: card.id, ...c.ui.info } },
                            });
                        });
                    });

                    const action: Action = {
                        type: "action",
                        instructions: instructions
                    };

                    return action;
                })
            };

            G.script.scenes = [...G.script.scenes, newScene];
        }
    });

    _settleUnfulfillableDiscards(G, ctx);
}


// find all scenes that have already started and are not finished
// or all scenes that have not started yet
export function _findOpenScenesWithProtagonist(G: UnstableUnicornsGame, protagonist: PlayerID): Array<[Instruction, Scene]> {
    let scenes: Array<[Instruction, Scene]> = [];
    let stop = false;

    G.script.scenes.forEach(scene => {
        scene.actions.forEach(action => {
            if (stop) {
                return;
            }

            // find most recent action
            if (action.instructions.filter(ins => ins.state === "open" || ins.state === "in_progress").length > 0) {
                stop = true;
                const inst = action.instructions.filter(ins => ins.protagonist === protagonist && (ins.state === "open" || ins.state === "in_progress"));
                inst.forEach(i => scenes.push([i, scene]))
            }
        });
        stop = false;
    });

    return scenes;
}

// a scene is in progress if its first action is finished
export function _findInProgressScenesWithProtagonist(G: UnstableUnicornsGame, protagonist: PlayerID): Array<[Instruction, Scene]> {
    let scenes: Array<[Instruction, Scene]> = [];
    let stop = false;

    G.script.scenes.forEach(scene => {
        if (scene.mandatory) {
            const action = _.first(scene.actions)!;
            if (action.instructions.filter(ins => ins.state === "open" || ins.state === "in_progress").length > 0) {
                stop = true;
                const inst = action.instructions.filter(ins => ins.protagonist === protagonist && (ins.state === "open" || ins.state === "in_progress"));
                inst.forEach(i => scenes.push([i, scene]))
            }
        }

        scene.actions.forEach((action, idx) => {
            if (stop || idx === 0) {
                return;
            }

            // find most recent open action excluding the first action
            if (action.instructions.filter(ins => ins.state === "open" || ins.state === "in_progress").length > 0) {
                // check if the prior action was completed
                if (scene.actions[idx - 1].instructions.filter(ins => ins.state === "executed").length === scene.actions[idx - 1].instructions.length) {
                    stop = true;
                    const inst = action.instructions.filter(ins => ins.protagonist === protagonist && (ins.state === "open" || ins.state === "in_progress"));
                    inst.forEach(i => scenes.push([i, scene]))
                }
            }
        });
        stop = false;
    });

    return scenes;
}

export function _findInstruction(G: UnstableUnicornsGame, instructionID: string): [Instruction, Action, Scene] | undefined {
    let instruction, action, scene = undefined;

    G.script.scenes.forEach(sc => {
        sc.actions.forEach(ac => {
            ac.instructions.forEach(ic => {
                if (ic.id === instructionID) {
                    instruction = ic;
                    action = ac;
                    scene = sc;
                }
            })
        })
    });

    if (instruction === undefined || action === undefined || scene === undefined) {
        return undefined;
    }

    return [instruction, action, scene];
}