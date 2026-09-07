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
