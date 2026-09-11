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
//
// Captures raw, unwrapped references to fetch/setMetadata at wrap time (not a
// live `db.fetch` lookup) specifically so this keeps working correctly once
// wrapDbWithMatchLock (below) is layered on top - those calls must bypass the
// per-match queue, not re-enter it (see that function's comment for why).
function wrapDbWithActivityTracking(db) {
    var originalSetState = db.setState.bind(db);
    var rawFetch = db.fetch.bind(db);
    var rawSetMetadata = db.setMetadata.bind(db);
    db.setState = async function (matchID, state, deltalog) {
        var result = await originalSetState(matchID, state, deltalog);
        try {
            var existing = await rawFetch(matchID, { metadata: true });
            if (existing && existing.metadata) {
                existing.metadata.updatedAt = Date.now();
                await rawSetMetadata(matchID, existing.metadata);
            }
        } catch (e) {
            console.warn("Match storage: failed to bump activity timestamp for " + matchID + ":", e && e.message);
        }
        return result;
    };
    return db;
}

// boardgame.io processes a move as fetch(state) -> apply the move -> setState
// (new state). With the default in-memory store that whole cycle is
// synchronous, so two players reacting to the same thing (e.g. both racing to
// respond to a neigh discussion) can never interleave. FlatFile's fetch/write
// are real, async file I/O though, which opens a genuine window: player B's
// fetch can land before player A's write finishes, so B computes their move
// against stale state and silently clobbers A's write when it lands (seen in
// practice as two Super Neighs landing back-to-back on the same discussion,
// even though the move logic unconditionally ends it after the first one).
//
// This serializes every fetch/setState/setMetadata/wipe/createMatch call for
// a given matchID into one FIFO queue, so a match's read-modify-write cycles
// can never interleave with each other regardless of I/O timing. It must be
// the OUTERMOST wrapper (applied after wrapDbWithActivityTracking) - that
// wrapper's own internal fetch/setMetadata calls use raw, pre-wrap references
// specifically so they don't re-enter this queue from inside an already
// in-flight job for the same matchID, which would deadlock it forever.
function wrapDbWithMatchLock(db) {
    var queueTails = {}; // matchID -> tail of that match's pending job chain

    function serialize(matchID, fn) {
        var tail = queueTails[matchID] || Promise.resolve();
        var run = tail.then(fn, fn);
        // keep the chain moving even if a job throws/rejects - don't let one
        // failed move permanently wedge every later move for that match.
        queueTails[matchID] = run.then(function () {}, function () {});
        return run;
    }

    ["fetch", "setState", "setMetadata", "wipe", "createMatch"].forEach(function (method) {
        if (typeof db[method] !== "function") { return; }
        var original = db[method].bind(db);
        db[method] = function (matchID) {
            var args = arguments;
            return serialize(matchID, function () {
                return original.apply(null, args);
            });
        };
    });

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
        db = wrapDbWithActivityTracking(db);
        db = wrapDbWithMatchLock(db);
        return db;
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
