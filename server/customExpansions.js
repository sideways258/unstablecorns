"use strict";
// Runtime-editable expansion packs. The admin panel (server/admin.js) writes
// packs + uploaded card art into DATA_DIR; the game server reads them here when
// building a match deck. Everything is plain JSON on disk so it survives a
// container restart as long as DATA_DIR is a mounted volume.
exports.__esModule = true;

var fs = require("fs");
var path = require("path");

var DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, "../data");
var UPLOADS_DIR = path.join(DATA_DIR, "uploads");
var STATE_FILE = path.join(DATA_DIR, "expansions.json");

exports.DATA_DIR = DATA_DIR;
exports.UPLOADS_DIR = UPLOADS_DIR;
exports.STATE_FILE = STATE_FILE;

function ensureDirs() {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { /* ignore */ }
    try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) { /* ignore */ }
}
exports.ensureDirs = ensureDirs;

// --- disk state (cached, refreshed when the file's mtime changes) -------------
var _cache = null;
var _cacheMtime = 0;

function loadState() {
    try {
        var st = fs.statSync(STATE_FILE);
        if (_cache && st.mtimeMs === _cacheMtime) {
            return _cache;
        }
        var raw = fs.readFileSync(STATE_FILE, "utf8");
        var parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.packs)) {
            parsed = { packs: [] };
        }
        _cache = parsed;
        _cacheMtime = st.mtimeMs;
        return parsed;
    } catch (e) {
        // missing file / bad JSON -> empty
        _cache = { packs: [] };
        _cacheMtime = 0;
        return _cache;
    }
}
exports.loadState = loadState;

function saveState(state) {
    ensureDirs();
    var clean = { packs: Array.isArray(state.packs) ? state.packs : [] };
    fs.writeFileSync(STATE_FILE, JSON.stringify(clean, null, 2), "utf8");
    _cache = clean;
    try { _cacheMtime = fs.statSync(STATE_FILE).mtimeMs; } catch (e) { _cacheMtime = 0; }
    return clean;
}
exports.saveState = saveState;

// Lightweight list for the lobby / public endpoint (no card internals).
function publicPacks() {
    return loadState().packs.map(function (p) {
        return {
            id: p.id,
            name: p.name,
            blurb: p.blurb || "",
            cardCount: (p.cards || []).reduce(function (n, c) { return n + (c.count || 1); }, 0),
        };
    });
}
exports.publicPacks = publicPacks;

// ---------------------------------------------------------------------------
// Preset effects. Each uploaded card may pick ONE of these; they reuse
// mechanics the engine already implements. `types` limits which card types the
// effect is offered for. Keep this list in sync with src/customEffects.ts.
// ---------------------------------------------------------------------------
function enterEffect(key) {
    return [{ trigger: "enter", "do": { type: "add_effect", info: { key: key }, ui: { type: "none" } } }];
}
function botEffect(key) {
    return [{ trigger: "begin_of_turn", "do": { type: "add_effect", info: { key: key }, ui: { type: "none" } } }];
}
function returnOnLoss() {
    return [{ trigger: "this_destroyed_or_sacrificed", "do": { type: "return_to_hand" } }];
}
function popup(t) {
    return { type: "single_action_popup", info: { singleActionText: t } };
}
function step(doObj, ui) {
    return { instructions: [{ protagonist: "owner", "do": doObj, ui: ui }] };
}
function scene(mandatory, trigger, actions) {
    return [{ trigger: trigger, "do": { type: "add_scene", info: { actions: actions, mandatory: mandatory, endTurnImmediately: false } } }];
}

var EFFECTS = {
    none: {
        label: "No special effect",
        types: ["baby", "basic", "unicorn", "narwhal", "magic", "upgrade", "downgrade", "neigh", "super_neigh"],
        build: function () { return []; },
    },

    // ---- magic (one-shot on enter, Neigh-able, mandatory once played) ----
    magic_destroy_unicorn: {
        label: "Magic: DESTROY a Unicorn card",
        types: ["magic"],
        build: function () { return scene(true, "enter", [step({ key: "destroy", info: { type: "unicorn" } }, { type: "card_to_card" })]); },
    },
    magic_steal_unicorn: {
        label: "Magic: STEAL a Unicorn card",
        types: ["magic"],
        build: function () { return scene(true, "enter", [step({ key: "steal", info: { type: "unicorn" } }, { type: "card_to_card" })]); },
    },
    magic_destroy_upgrade: {
        label: "Magic: DESTROY an Upgrade card",
        types: ["magic"],
        build: function () { return scene(true, "enter", [step({ key: "destroy", info: { type: "upgrade" } }, { type: "card_to_card" })]); },
    },
    magic_draw_2: {
        label: "Magic: DRAW 2 cards",
        types: ["magic"],
        build: function () { return scene(true, "enter", [step({ key: "draw", info: { count: 2 } }, { type: "click_on_drawPile" })]); },
    },
    magic_discard2_steal_unicorn: {
        label: "Magic: DISCARD 2 cards, then STEAL a Unicorn card",
        types: ["magic"],
        build: function () {
            return scene(true, "enter", [
                step({ key: "discard", info: { count: 2, type: "any" } }, popup("Discard to steal")),
                step({ key: "steal", info: { type: "unicorn" } }, { type: "card_to_card" }),
            ]);
        },
    },

    // ---- unicorn (triggered while in your stable) ----
    unicorn_enter_draw: {
        label: "Unicorn: when it enters your Stable, you may DRAW a card",
        types: ["unicorn", "narwhal"],
        build: function () { return scene(false, "enter", [step({ key: "draw", info: { count: 1 } }, popup("Draw a card"))]); },
    },
    unicorn_bot_draw: {
        label: "Unicorn: at the start of your turn, you may DRAW a card",
        types: ["unicorn", "narwhal"],
        build: function () { return scene(false, "begin_of_turn", [step({ key: "draw", info: { count: 1 } }, popup("Draw a card"))]); },
    },
    unicorn_bot_discard_draw: {
        label: "Unicorn: at the start of your turn, you may DISCARD a card, then DRAW a card",
        types: ["unicorn", "narwhal"],
        build: function () {
            return scene(false, "begin_of_turn", [
                step({ key: "discard", info: { count: 1, type: "any" } }, popup("Discard to draw")),
                step({ key: "draw", info: { count: 1 } }, popup("Draw a card")),
            ]);
        },
    },
    unicorn_return_on_loss: {
        label: "Unicorn: if destroyed or sacrificed, return it to your hand",
        types: ["unicorn", "narwhal"],
        build: function () { return returnOnLoss(); },
    },
    unicorn_cannot_be_destroyed_by_magic: {
        label: "Unicorn: cannot be destroyed by Magic cards",
        types: ["unicorn", "narwhal"],
        build: function () { return []; },
        passive: ["cannot_be_destroyed_by_magic"],
    },

    // ---- upgrade ----
    upgrade_cannot_be_neighed: {
        label: "Upgrade: cards you play cannot be Neigh'd",
        types: ["upgrade"],
        build: function () { return enterEffect("your_cards_cannot_be_neighed"); },
    },
    upgrade_unicorns_cannot_be_destroyed: {
        label: "Upgrade: your Unicorn cards cannot be destroyed",
        types: ["upgrade"],
        build: function () { return enterEffect("your_unicorns_cannot_be_destroyed"); },
    },
    upgrade_double_dutch: {
        label: "Upgrade: at the start of your turn you may play 2 cards this turn",
        types: ["upgrade"],
        build: function () { return botEffect("double_dutch"); },
    },
    upgrade_bot_discard_draw: {
        label: "Upgrade: at the start of your turn, you may DISCARD a card, then DRAW a card",
        types: ["upgrade"],
        build: function () {
            return scene(false, "begin_of_turn", [
                step({ key: "discard", info: { count: 1, type: "any" } }, popup("Discard to draw")),
                step({ key: "draw", info: { count: 1 } }, popup("Draw a card")),
            ]);
        },
    },

    // ---- downgrade ----
    downgrade_cannot_play_neigh: {
        label: "Downgrade: you cannot play Neigh cards",
        types: ["downgrade"],
        build: function () { return enterEffect("you_cannot_play_neigh"); },
    },
    downgrade_cannot_play_upgrades: {
        label: "Downgrade: you cannot play Upgrade cards",
        types: ["downgrade"],
        build: function () { return enterEffect("you_cannot_play_upgrades"); },
    },

    // ---- more magic one-shots (from the real-card catalog) ----
    magic_sacrifice_or_destroy_up_down: {
        label: "Magic: SACRIFICE a Downgrade of yours, or DESTROY an opponent's Upgrade",
        types: ["magic"],
        build: function () { return scene(true, "enter", [step({ key: "destroy", info: { type: "my_downgrade_other_upgrade" } }, { type: "card_to_card" })]); },
    },
    magic_return_stable_card_to_hand: {
        label: "Magic: return a card in another player's Stable to their hand",
        types: ["magic"],
        build: function () { return scene(true, "enter", [step({ key: "returnToHand", info: { who: "another" } }, { type: "card_to_card" })]); },
    },
    magic_shake_up: {
        label: "Magic: shuffle your hand + discard pile into the deck, then DRAW 5",
        types: ["magic"],
        build: function () { return scene(true, "enter", [step({ key: "shakeUp" }, popup("Shake it up"))]); },
    },
    magic_look_at_hand_take_card: {
        label: "Magic: look at another player's hand and take a card",
        types: ["magic"],
        build: function () { return scene(true, "enter", [step({ key: "blatantThievery1" }, { type: "card_to_player" })]); },
    },
    magic_take_another_turn: {
        label: "Magic: DISCARD 3 cards, then take another turn",
        types: ["magic"],
        build: function () { return scene(true, "enter", [step({ key: "discard", info: { count: 3, type: "any", changeOfLuck: true } }, popup("Discard 3 cards"))]); },
    },

    // ---- more unicorn "when it enters" one-shots ----
    unicorn_enter_bring_basic: {
        label: "Unicorn: when it enters, bring a Basic Unicorn from your hand into your Stable",
        types: ["unicorn", "narwhal"],
        build: function () { return scene(false, "enter", [step({ key: "bringToStable", info: { type: "basic_unicorn" } }, popup("Bring a Basic Unicorn into your Stable"))]); },
    },
    unicorn_enter_return_stable_card: {
        label: "Unicorn: when it enters, return a card in a player's Stable to their hand",
        types: ["unicorn", "narwhal"],
        build: function () { return scene(false, "enter", [step({ key: "returnToHand", info: { who: "another" } }, { type: "card_to_card" })]); },
    },
    unicorn_enter_look_take_card: {
        label: "Unicorn: when it enters, look at a player's hand and take a card",
        types: ["unicorn", "narwhal"],
        build: function () { return scene(false, "enter", [step({ key: "blatantThievery1" }, { type: "card_to_player" })]); },
    },
    unicorn_bodyguard: {
        label: "Unicorn: if one of your Unicorns would be destroyed, you may SACRIFICE this instead",
        types: ["unicorn", "narwhal"],
        build: function () { return enterEffect("save_mate_by_sacrifice"); },
    },

    // ---- more upgrades / downgrades ----
    upgrade_basic_unicorns_only_yours: {
        label: "Upgrade: Basic Unicorns cannot enter any other player's Stable",
        types: ["upgrade", "unicorn"],
        build: function () { return enterEffect("basic_unicorns_can_only_join_your_stable"); },
    },
    downgrade_overcrowded_stable: {
        label: "Downgrade: if you have more than 5 Unicorns, SACRIFICE one",
        types: ["downgrade"],
        build: function () { return enterEffect("tiny_stable"); },
    },
    downgrade_triggers_disabled: {
        label: "Downgrade: triggered effects of your Unicorn cards do not activate",
        types: ["downgrade"],
        build: function () { return enterEffect("my_unicorns_are_basic"); },
    },
    downgrade_unicorns_are_pandas: {
        label: "Downgrade: your Unicorns count as Pandas (immune to Unicorn-targeting cards)",
        types: ["downgrade"],
        build: function () { return enterEffect("pandamonium"); },
    },
};
exports.EFFECTS = EFFECTS;

// "baby" is intentionally excluded: Baby Unicorns are the fixed starter-pick
// pool (card ids 0-12) and custom ones can't slot into that system.
var CARD_TYPES = ["basic", "unicorn", "narwhal", "magic", "upgrade", "downgrade", "neigh", "super_neigh"];
exports.CARD_TYPES = CARD_TYPES;

function effectAllowed(type, key) {
    var e = EFFECTS[key];
    if (!e) { return false; }
    return e.types.indexOf(type) !== -1;
}
exports.effectAllowed = effectAllowed;

// ===========================================================================
// Custom ability builder. Lets an uploaded card define its OWN behaviour by
// composing vetted building blocks (or, for power users, pasting a raw `on`
// array that is then validated against the same whitelists). Nothing an admin
// types is ever handed to the game engine unchecked.
// ===========================================================================

function clampInt(v, lo, hi, dflt) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) { n = dflt; }
    return Math.max(lo, Math.min(hi, n));
}

// The trigger a whole ability fires on.
var ABILITY_TRIGGERS = {
    enter: "When this card is played / enters your Stable",
    begin_of_turn: "At the start of your turn (while it's in your Stable)",
    this_destroyed_or_sacrificed: "When this card is destroyed or sacrificed",
};

// One selectable step. build(params) -> a scene "action" ({ instructions:[...] }).
function actionStep(protagonist, doObj, ui) {
    return { instructions: [{ protagonist: protagonist || "owner", "do": doObj, ui: ui }] };
}

var ABILITY_ACTIONS = {
    destroy_unicorn: {
        label: "DESTROY a Unicorn card (any stable)",
        params: [],
        build: function () { return actionStep("owner", { key: "destroy", info: { type: "unicorn" } }, { type: "card_to_card" }); },
    },
    destroy_any: {
        label: "DESTROY any card (Unicorn / Upgrade / Downgrade)",
        params: [],
        build: function () { return actionStep("owner", { key: "destroy", info: { type: "any" } }, { type: "card_to_card" }); },
    },
    destroy_upgrade: {
        label: "DESTROY an Upgrade card",
        params: [],
        build: function () { return actionStep("owner", { key: "destroy", info: { type: "upgrade" } }, { type: "card_to_card" }); },
    },
    steal_unicorn: {
        label: "STEAL a Unicorn card",
        params: [],
        build: function () { return actionStep("owner", { key: "steal", info: { type: "unicorn" } }, { type: "card_to_card" }); },
    },
    steal_upgrade: {
        label: "STEAL an Upgrade card",
        params: [],
        build: function () { return actionStep("owner", { key: "steal", info: { type: "upgrade" } }, { type: "card_to_card" }); },
    },
    sacrifice_any: {
        label: "SACRIFICE one of your cards",
        params: [],
        build: function () { return actionStep("owner", { key: "sacrifice", info: { type: "any" } }, { type: "click_on_card_in_stable" }); },
    },
    sacrifice_downgrade: {
        label: "SACRIFICE one of your Downgrade cards",
        params: [],
        build: function () { return actionStep("owner", { key: "sacrifice", info: { type: "downgrade" } }, { type: "click_on_card_in_stable" }); },
    },
    draw: {
        label: "DRAW cards",
        params: [{ name: "count", label: "How many", type: "int", min: 1, max: 5, dflt: 1 }],
        build: function (p) { return actionStep("owner", { key: "draw", info: { count: clampInt(p.count, 1, 5, 1) } }, { type: "click_on_drawPile" }); },
    },
    discard: {
        label: "DISCARD cards from your hand",
        params: [{ name: "count", label: "How many", type: "int", min: 1, max: 5, dflt: 1 }],
        build: function (p) {
            var n = clampInt(p.count, 1, 5, 1);
            return actionStep("owner", { key: "discard", info: { count: n, type: "any" } }, popup("Discard " + n + (n === 1 ? " card" : " cards")));
        },
    },
    search_unicorn: {
        label: "SEARCH the deck for a Unicorn, then shuffle",
        params: [],
        build: function () { return actionStep("owner", { key: "search", info: { type: "unicorn" } }, popup("Search the deck")); },
    },
    search_upgrade: {
        label: "SEARCH the deck for an Upgrade, then shuffle",
        params: [],
        build: function () { return actionStep("owner", { key: "search", info: { type: "upgrade" } }, popup("Search the deck")); },
    },
    search_downgrade: {
        label: "SEARCH the deck for a Downgrade, then shuffle",
        params: [],
        build: function () { return actionStep("owner", { key: "search", info: { type: "downgrade" } }, popup("Search the deck")); },
    },
    revive_unicorn: {
        label: "Return a Unicorn from the discard pile to your Stable",
        params: [],
        build: function () { return actionStep("owner", { key: "revive", info: { type: "unicorn" } }, popup("Revive a Unicorn")); },
    },
    discard_to_hand_unicorn: {
        label: "Add a Unicorn from the discard pile to your hand",
        params: [],
        build: function () { return actionStep("owner", { key: "addFromDiscardPileToHand", info: { type: "unicorn" } }, popup("Take from discard pile")); },
    },
    revive_from_nursery: {
        label: "Bring a Baby Unicorn from the Nursery into your Stable",
        params: [],
        build: function () { return actionStep("owner", { key: "reviveFromNursery" }, popup("Bring a Baby Unicorn")); },
    },
    everyone_discards: {
        label: "Each player (including you) discards a card",
        params: [],
        build: function () { return actionStep("all", { key: "discard", info: { count: 1, type: "any" } }, popup("Discard a card")); },
    },
    swap_hands: {
        label: "Trade hands with any other player",
        params: [],
        build: function () { return actionStep("owner", { key: "swapHands" }, { type: "card_to_player" }); },
    },
    pull_random: {
        label: "Pull a random card from another player's hand",
        params: [],
        build: function () { return actionStep("owner", { key: "pullRandom" }, { type: "card_to_player" }); },
    },
    make_someone_discard: {
        label: "Choose a player; they discard a card",
        params: [],
        build: function () { return actionStep("owner", { key: "makeSomeoneDiscard" }, { type: "card_to_player" }); },
    },
    shuffle_discard_into_deck: {
        label: "Shuffle the discard pile into the deck",
        params: [],
        build: function () { return actionStep("owner", { key: "shuffleDiscardPileIntoDrawPile" }, popup("Shuffle discard into deck")); },
    },
    reset_upgrades_downgrades: {
        label: "Every player sacrifices all their Upgrades & Downgrades",
        params: [],
        build: function () { return actionStep("owner", { key: "reset" }, popup("Reset all Upgrades / Downgrades")); },
    },

    // ---- added from the real-card catalog (existing engine mechanics) ----
    sacrifice_or_destroy_up_down: {
        label: "SACRIFICE one of your Downgrades, or DESTROY an opponent's Upgrade",
        params: [],
        build: function () { return actionStep("owner", { key: "destroy", info: { type: "my_downgrade_other_upgrade" } }, { type: "card_to_card" }); },
    },
    return_stable_card_to_hand: {
        label: "Return a card in another player's Stable to their hand",
        params: [],
        build: function () { return actionStep("owner", { key: "returnToHand", info: { who: "another" } }, { type: "card_to_card" }); },
    },
    back_kick: {
        label: "Return a Stable card to its owner's hand; that player then DISCARDs a card",
        params: [],
        build: function () { return actionStep("owner", { key: "backKick" }, { type: "card_to_card" }); },
    },
    bring_basic_unicorn_from_hand: {
        label: "Bring a Basic Unicorn from your hand directly into your Stable",
        params: [],
        build: function () { return actionStep("owner", { key: "bringToStable", info: { type: "basic_unicorn" } }, popup("Bring a Basic Unicorn into your Stable")); },
    },
    look_at_hand_take_card: {
        label: "Look at another player's hand and take a card from it",
        params: [],
        build: function () { return actionStep("owner", { key: "blatantThievery1" }, { type: "card_to_player" }); },
    },
    shake_up: {
        label: "Shuffle your hand + the discard pile into the deck, then DRAW 5 cards",
        params: [],
        build: function () { return actionStep("owner", { key: "shakeUp" }, popup("Shake it up")); },
    },
    search_narwhal: {
        label: "SEARCH the deck for a Narwhal card, then shuffle",
        params: [],
        build: function () { return actionStep("owner", { key: "search", info: { type: "narwhal" } }, popup("Search the deck")); },
    },
    take_magic_from_discard: {
        label: "Add a Magic card from the discard pile to your hand",
        params: [],
        build: function () { return actionStep("owner", { key: "addFromDiscardPileToHand", info: { type: "magic" } }, popup("Take from discard pile")); },
    },
    discard_then_take_another_turn: {
        label: "DISCARD cards, then take another turn",
        params: [{ name: "count", label: "How many", type: "int", min: 1, max: 4, dflt: 2 }],
        build: function (p) {
            var n = clampInt(p.count, 1, 4, 2);
            return actionStep("owner", { key: "discard", info: { count: n, type: "any", changeOfLuck: true } }, popup("Discard " + n + (n === 1 ? " card" : " cards")));
        },
    },
};
exports.ABILITY_ACTIONS = ABILITY_ACTIONS;

// Persistent / passive effects a card can carry.
var ABILITY_EFFECTS = {
    cannot_be_neighed: { label: "Cards you play cannot be Neigh'd", on: enterEffect("your_cards_cannot_be_neighed") },
    unicorns_cannot_be_destroyed: { label: "Your Unicorn cards cannot be destroyed", on: enterEffect("your_unicorns_cannot_be_destroyed") },
    cannot_play_neigh: { label: "You cannot play Neigh cards", on: enterEffect("you_cannot_play_neigh") },
    cannot_play_upgrades: { label: "You cannot play Upgrade cards", on: enterEffect("you_cannot_play_upgrades") },
    hand_visible: { label: "Your hand is visible to everyone", on: enterEffect("your_hand_is_visible") },
    extra_card_per_turn: { label: "You may play an extra card each turn", on: botEffect("double_dutch") },
    count_as_two: { label: "This card counts as 2 Unicorns", passive: ["count_as_two"] },
    immune_to_magic_destroy: { label: "This card cannot be destroyed by Magic cards", passive: ["cannot_be_destroyed_by_magic"] },
    return_when_lost: { label: "If destroyed or sacrificed, return it to your hand instead", on: returnOnLoss() },

    // ---- added from the real-card catalog (existing engine effect keys) ----
    basic_unicorns_only_join_you: { label: "Basic Unicorn cards cannot enter any other player's Stable (Queen Bee)", on: enterEffect("basic_unicorns_can_only_join_your_stable") },
    your_unicorn_triggers_disabled: { label: "Triggered effects of your Unicorn cards do not activate (Blinding Light)", on: enterEffect("my_unicorns_are_basic") },
    your_unicorns_are_pandas: { label: "Your Unicorns count as Pandas - cards that affect Unicorns don't affect them (Pandamonium)", on: enterEffect("pandamonium") },
    overcrowded_stable: { label: "If you ever have more than 5 Unicorns in your Stable, SACRIFICE one (Tiny Stable)", on: enterEffect("tiny_stable") },
    bodyguard: { label: "If one of your Unicorns would be destroyed, you may SACRIFICE this card instead (Black Knight)", on: enterEffect("save_mate_by_sacrifice") },
};
exports.ABILITY_EFFECTS = ABILITY_EFFECTS;

// whitelists for the raw-JSON escape hatch
var RAW_DO_KEYS = {};
["steal", "pull", "pullRandom", "discard", "destroy", "sacrifice", "search", "revive", "draw",
 "addFromDiscardPileToHand", "reviveFromNursery", "returnToHand", "bringToStable", "makeSomeoneDiscard",
 "swapHands", "shakeUp", "move", "move2", "reset", "shuffleDiscardPileIntoDrawPile", "backKick",
 "unicornSwap1", "unicornSwap2", "blatantThievery1"].forEach(function (k) { RAW_DO_KEYS[k] = true; });

var RAW_UI_TYPES = { card_to_card: 1, card_to_player: 1, click_on_card_in_stable: 1, click_on_own_card_in_hand: 1, click_on_drawPile: 1, single_action_popup: 1, none: 1, yes_no_popup: 1 };
var RAW_EFFECT_KEYS = { your_cards_cannot_be_neighed: 1, your_unicorns_cannot_be_destroyed: 1, you_cannot_play_neigh: 1, you_cannot_play_upgrades: 1, your_hand_is_visible: 1, double_dutch: 1, basic_unicorns_can_only_join_your_stable: 1, my_unicorns_are_basic: 1, pandamonium: 1, tiny_stable: 1, count_as_two: 1, save_mate_by_sacrifice: 1 };
var RAW_PASSIVES = { count_as_two: 1, cannot_be_destroyed_by_magic: 1 };
var RAW_TRIGGERS = { enter: 1, begin_of_turn: 1, this_destroyed_or_sacrificed: 1 };
var RAW_AUTO_KEYS = { sacrifice_all_downgrades: 1 };

function abilityError(msg) {
    var e = new Error(msg);
    e.status = 400;
    return e;
}

function validateRawOn(arr) {
    if (!Array.isArray(arr)) { throw abilityError("Raw ability must be a JSON array of { trigger, do } objects"); }
    if (arr.length > 6) { throw abilityError("Too many trigger entries (max 6)"); }
    arr.forEach(function (entry, i) {
        if (!entry || typeof entry !== "object") { throw abilityError("Entry " + i + " is not an object"); }
        if (!RAW_TRIGGERS[entry.trigger]) { throw abilityError("Entry " + i + ": unknown trigger '" + entry.trigger + "'"); }
        var d = entry["do"];
        if (!d || typeof d !== "object") { throw abilityError("Entry " + i + ": missing 'do'"); }
        if (d.type === "return_to_hand") { return; }
        if (d.type === "auto") {
            if (!d.info || !RAW_AUTO_KEYS[d.info.key]) { throw abilityError("Entry " + i + ": unknown auto key"); }
            return;
        }
        if (d.type === "add_effect") {
            if (!d.info || !RAW_EFFECT_KEYS[d.info.key]) { throw abilityError("Entry " + i + ": unknown effect key '" + (d.info && d.info.key) + "'"); }
            return;
        }
        if (d.type === "add_scene") {
            var info = d.info || {};
            if (!Array.isArray(info.actions) || info.actions.length === 0) { throw abilityError("Entry " + i + ": add_scene needs actions"); }
            if (info.actions.length > 6) { throw abilityError("Entry " + i + ": too many steps (max 6)"); }
            info.actions.forEach(function (ac, j) {
                if (!ac || !Array.isArray(ac.instructions) || !ac.instructions.length) { throw abilityError("Step " + j + " has no instructions"); }
                ac.instructions.forEach(function (ins) {
                    if (["owner", "all"].indexOf(ins.protagonist) === -1) { throw abilityError("Step " + j + ": protagonist must be 'owner' or 'all'"); }
                    if (!ins["do"] || !RAW_DO_KEYS[ins["do"].key]) { throw abilityError("Step " + j + ": disallowed action key '" + (ins["do"] && ins["do"].key) + "'"); }
                    if (ins["do"].info && ins["do"].info.count !== undefined) {
                        ins["do"].info.count = clampInt(ins["do"].info.count, 0, 10, 1);
                    }
                    if (!ins.ui || !RAW_UI_TYPES[ins.ui.type]) { throw abilityError("Step " + j + ": disallowed ui type '" + (ins.ui && ins.ui.type) + "'"); }
                });
            });
            info.mandatory = !!info.mandatory;
            info.endTurnImmediately = !!info.endTurnImmediately;
            return;
        }
        throw abilityError("Entry " + i + ": unknown do.type '" + d.type + "'");
    });
    return arr;
}

// spec -> { on: [...], passive: [...]|undefined }. Throws (err.status = 400) on
// anything invalid. Safe to call both at save time and at deck-build time.
function compileAbility(spec) {
    if (!spec || typeof spec !== "object") { throw abilityError("Missing ability spec"); }

    if (spec.mode === "raw") {
        var on = [];
        var passive;
        if (spec.onJson && String(spec.onJson).trim()) {
            var parsed;
            try { parsed = JSON.parse(spec.onJson); }
            catch (e) { throw abilityError("Ability JSON is not valid JSON"); }
            on = validateRawOn(parsed);
        }
        if (spec.passiveJson && String(spec.passiveJson).trim()) {
            var pp;
            try { pp = JSON.parse(spec.passiveJson); }
            catch (e2) { throw abilityError("Passive JSON is not valid JSON"); }
            if (!Array.isArray(pp)) { throw abilityError("Passive JSON must be an array of strings"); }
            pp.forEach(function (x) { if (!RAW_PASSIVES[x]) { throw abilityError("Unknown passive '" + x + "'"); } });
            passive = pp.slice();
        }
        if (on.length === 0 && !passive) { throw abilityError("Custom ability is empty"); }
        return { on: on, passive: passive && passive.length ? passive : undefined };
    }

    // builder mode
    var trigger = spec.trigger;
    if (!ABILITY_TRIGGERS[trigger]) { throw abilityError("Choose when the ability happens"); }
    var steps = Array.isArray(spec.steps) ? spec.steps : [];
    var effects = Array.isArray(spec.effects) ? spec.effects : [];
    if (steps.length === 0 && effects.length === 0) { throw abilityError("Add at least one step or effect"); }
    if (steps.length > 6) { throw abilityError("Too many steps (max 6)"); }

    var out = [];
    var passiveOut = [];

    if (steps.length) {
        if (trigger === "this_destroyed_or_sacrificed") {
            throw abilityError("The 'when destroyed or sacrificed' trigger only supports the 'return to hand' effect");
        }
        var actions = steps.map(function (s, i) {
            var def = ABILITY_ACTIONS[s && s.action];
            if (!def) { throw abilityError("Step " + (i + 1) + ": unknown action"); }
            return def.build(s.params || {});
        });
        out.push({
            trigger: trigger,
            "do": { type: "add_scene", info: { actions: actions, mandatory: !!spec.mandatory, endTurnImmediately: !!spec.endTurnImmediately } },
        });
    }

    effects.forEach(function (id) {
        var e = ABILITY_EFFECTS[id];
        if (!e) { throw abilityError("Unknown effect '" + id + "'"); }
        if (e.passive) {
            e.passive.forEach(function (p) { if (passiveOut.indexOf(p) === -1) { passiveOut.push(p); } });
        }
        if (e.on) {
            // clone so the shared catalog object is never mutated
            JSON.parse(JSON.stringify(e.on)).forEach(function (o) { out.push(o); });
        }
    });

    return { on: out, passive: passiveOut.length ? passiveOut : undefined };
}
exports.compileAbility = compileAbility;

// Short human summary for the card list / tiles.
function describeAbility(spec) {
    try {
        if (!spec) { return ""; }
        if (spec.mode === "raw") { return "custom (advanced)"; }
        var bits = [];
        (spec.steps || []).forEach(function (s) {
            var d = ABILITY_ACTIONS[s && s.action];
            if (d) { bits.push(d.label.replace(/\s*\(.*\)$/, "")); }
        });
        (spec.effects || []).forEach(function (id) {
            var e = ABILITY_EFFECTS[id];
            if (e) { bits.push(e.label); }
        });
        return bits.join(" · ");
    } catch (e) { return "custom"; }
}
exports.describeAbility = describeAbility;

function getAbilityCatalog() {
    return {
        triggers: Object.keys(ABILITY_TRIGGERS).map(function (k) { return { id: k, label: ABILITY_TRIGGERS[k] }; }),
        actions: Object.keys(ABILITY_ACTIONS).map(function (k) {
            return { id: k, label: ABILITY_ACTIONS[k].label, params: ABILITY_ACTIONS[k].params || [] };
        }),
        effects: Object.keys(ABILITY_EFFECTS).map(function (k) { return { id: k, label: ABILITY_EFFECTS[k].label }; }),
    };
}
exports.getAbilityCatalog = getAbilityCatalog;

// ---------------------------------------------------------------------------
// "Plays as" support: an uploaded card can borrow the real mechanics of any
// fully-implemented card (base game + built-in homebrew). We read the live
// card definitions from ./game/card lazily (avoids a require cycle at load).
// ---------------------------------------------------------------------------
function baseDefsByTitle() {
    var map = {};
    try {
        var cardMod = require("./game/card");
        var defs = typeof cardMod.getAllCardDefs === "function" ? cardMod.getAllCardDefs() : [];
        defs.forEach(function (d) {
            if (!d || !d.title) { return; }
            var key = String(d.title).toLowerCase();
            if (!map[key]) { map[key] = d; } // first definition wins on duplicate titles
        });
    } catch (e) { /* ignore - falls back to preset effects */ }
    return map;
}

// Catalog for the admin panel's "Plays as" picker.
function getBaseCardCatalog() {
    var seen = {};
    var list = [];
    var map = baseDefsByTitle();
    Object.keys(map).forEach(function (k) {
        var d = map[k];
        if (seen[d.title]) { return; }
        seen[d.title] = true;
        list.push({
            title: d.title,
            type: d.type,
            description: (d.description && (d.description.en || d.description.de)) || "",
        });
    });
    list.sort(function (a, b) { return a.title.localeCompare(b.title); });
    return list;
}
exports.getBaseCardCatalog = getBaseCardCatalog;

// Resolve a user-supplied "plays as" name to a canonical implemented title,
// or "" if there's no match.
function resolveBaseCardTitle(name) {
    if (!name || typeof name !== "string") { return ""; }
    var map = baseDefsByTitle();
    var d = map[name.trim().toLowerCase()];
    return d ? d.title : "";
}
exports.resolveBaseCardTitle = resolveBaseCardTitle;

// Turn stored cards into the CardDefinition shape initializeDeck() expects.
function buildCustomCardDefs(enabledIds) {
    var ids = Array.isArray(enabledIds) ? enabledIds : [];
    var out = [];
    try {
        var baseMap = baseDefsByTitle();
        var packs = loadState().packs || [];
        packs.forEach(function (p) {
            if (ids.indexOf(p.id) === -1) { return; }
            (p.cards || []).forEach(function (c) {
                var count = Math.max(1, Math.min(20, c.count || 1));

                // 1. fully custom ability wins
                if (c.ability) {
                    try {
                        var compiled = compileAbility(c.ability);
                        out.push({
                            set: p.id,
                            title: c.title,
                            type: c.type,
                            image: c.image,
                            count: count,
                            description: { en: c.description || "", de: c.description || "" },
                            on: compiled.on || [],
                            passive: compiled.passive,
                        });
                        return;
                    } catch (e) {
                        // a broken saved ability -> treat the card as plain rather
                        // than dropping it from the deck entirely
                    }
                }

                var base = c.baseCardTitle ? baseMap[String(c.baseCardTitle).toLowerCase()] : null;

                if (base) {
                    // Play exactly as the implemented card: inherit its type,
                    // on-triggers and passives. Only art + name + copies (and
                    // optionally the printed rules text) are the user's.
                    out.push({
                        set: p.id,
                        title: c.title,
                        type: base.type,
                        image: c.image,
                        count: count,
                        description: {
                            en: c.description || (base.description && base.description.en) || "",
                            de: c.description || (base.description && base.description.de) || "",
                        },
                        // deep clone so nothing mutates the shared base definition
                        on: base.on ? JSON.parse(JSON.stringify(base.on)) : [],
                        passive: base.passive ? base.passive.slice() : undefined,
                    });
                    return;
                }

                // No "plays as" link -> use the chosen preset effect (or none).
                var key = effectAllowed(c.type, c.effectKey) ? c.effectKey : "none";
                var eff = EFFECTS[key] || EFFECTS.none;
                out.push({
                    set: p.id,
                    title: c.title,
                    type: c.type,
                    image: c.image, // "/uploads/<file>" -> imageLoader passes URLs through
                    count: count,
                    description: { en: c.description || "", de: c.description || "" },
                    on: eff.build(),
                    passive: eff.passive,
                });
            });
        });
    } catch (e) {
        // never let a bad custom pack break match creation
        return [];
    }
    return out;
}
exports.buildCustomCardDefs = buildCustomCardDefs;

// Every custom card definition across every pack (each carries its `set`).
// The front-end fetches this so its own initializeDeck() builds a deck
// identical to the server's - otherwise G.deck[customCardId] is undefined on
// the client and the board crashes when such a card is drawn.
function buildAllCustomCardDefs() {
    try {
        return buildCustomCardDefs((loadState().packs || []).map(function (p) { return p.id; }));
    } catch (e) {
        return [];
    }
}
exports.buildAllCustomCardDefs = buildAllCustomCardDefs;
