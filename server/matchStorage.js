"use strict";
// Persists match state (hands, stables, everything in G) to DATA_DIR so a
// container restart - a deploy, a crash, an Unraid reboot - doesn't wipe out
// every game in progress. Without this, boardgame.io keeps match state only
// in the Node process's memory, and a new container starts from nothing.
//
// Storage itself is boardgame.io's own FlatFile adapter (one JSON file per
// match under DATA_DIR/matches), so no extra database is needed and it lives
// on the same volume already used for admin.json / custom expansions.
exports.__esModule = true;

var fs = require("fs");
var path = require("path");
var ce = require("./customExpansions");

var MATCHES_DIR = path.join(ce.DATA_DIR, "matches");

// Matches whose last real activity was longer ago than this are deleted on
// the next sweep, so abandoned lobbies and long-finished games don't sit in
// /data forever. 30 days, in ms.
var MATCH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// How often to sweep for expired matches.
var CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

// boardgame.io stamps metadata.updatedAt once, when the match is first
// created, and never touches it again - NOT on every move like the name
// suggests. Left as-is, a match played every day for months would still look
// 30+ days "old" and get swept the moment nobody happens to join/leave it,
// silently deleting an active game. This wraps setState (which boardgame.io
// calls on every move) so metadata.updatedAt actually reflects the last time
// someone did something, which is what the cleanup sweep needs it to mean.
function wrapDbWithActivityTracking(db) {
    var originalSetState = db.setState.bind(db);
    db.setState = async function (matchID, state, deltalog) {
        var result = await originalSetState(matchID, state, deltalog);
        try {
            var existing = await db.fetch(matchID, { metadata: true });
            if (existing && existing.metadata) {
                existing.metadata.updatedAt = Date.now();
                await db.setMetadata(matchID, existing.metadata);
            }
        } catch (e) {
            console.warn("Match storage: failed to bump activity timestamp for " + matchID + ":", e && e.message);
        }
        return result;
    };
    return db;
}

// Builds the persistent match store. Returns undefined (falling back to
// boardgame.io's default in-memory storage) if FlatFile isn't available for
// any reason - a missing/broken store should never stop the server from
// starting, it should just mean state doesn't survive a restart.
function createDb() {
    try {
        fs.mkdirSync(MATCHES_DIR, { recursive: true });
    } catch (e) {
        console.warn("Match storage: couldn't create " + MATCHES_DIR + ", falling back to in-memory:", e && e.message);
        return undefined;
    }

    var FlatFile;
    try {
        FlatFile = require("boardgame.io/server").FlatFile;
    } catch (e) {
        FlatFile = undefined;
    }
    if (typeof FlatFile !== "function") {
        console.warn("Match storage: boardgame.io FlatFile isn't available - match state will not survive a restart.");
        return undefined;
    }

    try {
        // `ttl` makes node-persist stop returning an expired key's data as
        // soon as anyone tries to read it, but it does NOT delete the file on
        // its own (node-persist expires lazily, on access) - the periodic
        // sweep below (cleanupOldMatches) is what actually reclaims disk
        // space for matches nobody ever touches again. Belt and suspenders.
        var db = new FlatFile({ dir: MATCHES_DIR, logging: false, ttl: MATCH_MAX_AGE_MS });
        return wrapDbWithActivityTracking(db);
    } catch (e) {
        console.warn("Match storage: failed to initialize FlatFile, falling back to in-memory:", e && e.message);
        return undefined;
    }
}

// Deletes any stored match that hasn't seen a move (or, for one never
// played, hasn't been created) in over MATCH_MAX_AGE_MS. Entirely
// best-effort: any failure (listing matches,
// reading one match's metadata, deleting one match) is logged and skipped,
// never thrown - a cleanup bug should never be able to take the server down.
async function cleanupOldMatches(db) {
    if (!db || typeof db.listMatches !== "function") {
        return;
    }

    var matchIDs;
    try {
        matchIDs = (await db.listMatches()) || [];
    } catch (e) {
        console.warn("Match cleanup: failed to list matches:", e && e.message);
        return;
    }

    var removed = 0;
    for (var i = 0; i < matchIDs.length; i++) {
        var matchID = matchIDs[i];
        try {
            var result = (await db.fetch(matchID, { metadata: true })) || {};
            var metadata = result.metadata;
            var ts = metadata && (metadata.updatedAt || metadata.createdAt);
            if (typeof ts === "number" && (Date.now() - ts) > MATCH_MAX_AGE_MS) {
                await db.wipe(matchID);
                removed++;
            }
        } catch (e) {
            console.warn("Match cleanup: failed to check/remove match " + matchID + ":", e && e.message);
        }
    }

    if (removed > 0) {
        console.log("Match cleanup: removed " + removed + " match(es) older than 30 days.");
    }
}

// Runs an immediate sweep (so long-dead matches from before a restart don't
// linger until the first daily tick) and then keeps sweeping once a day.
function startCleanupSchedule(db) {
    if (!db) {
        return;
    }
    cleanupOldMatches(db).catch(function (e) {
        console.warn("Match cleanup: sweep failed:", e && e.message);
    });
    setInterval(function () {
        cleanupOldMatches(db).catch(function (e) {
            console.warn("Match cleanup: sweep failed:", e && e.message);
        });
    }, CLEANUP_INTERVAL_MS);
}

exports.createDb = createDb;
exports.cleanupOldMatches = cleanupOldMatches;
exports.startCleanupSchedule = startCleanupSchedule;
