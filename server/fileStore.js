"use strict";
// A minimal, dependency-free implementation of boardgame.io's Async storage
// interface (StorageAPI.Async - createMatch/setState/setMetadata/fetch/wipe/
// listMatches), storing one JSON file per match under `dir`.
//
// This replaces boardgame.io's own FlatFile adapter, which turned out to be
// broken in production: FlatFile calls `this.games.keys()` (in both
// listMatches and wipe), where `this.games` is node-persist's default export.
// node-persist only mixes its real methods (getItem/setItem/keys/...) onto
// that export AFTER its own init() completes, and in practice that left
// `.keys` missing at runtime ("this.games.keys is not a function" in the
// logs) even though FlatFile's connect() does await games.init(...) first -
// some interaction between that lazy-mixin pattern and how boardgame.io
// actually drives the store that wasn't worth chasing further. A brand new
// match hanging on "connecting..." forever (its first fetch never resolved)
// is a bad failure mode for something this simple to just do ourselves.
//
// Every operation here is a plain fs.promises call against a file this code
// names itself - there's no other package's initialization order to get
// out of sync with.
exports.__esModule = true;

var fs = require("fs");
var path = require("path");

var ASYNC_TYPE = 1; // matches boardgame.io's StorageAPI Type.ASYNC

// matchID is boardgame.io-generated (safe alnum), but sanitize regardless -
// this must never let a crafted id write outside `dir`.
function matchFile(dir, matchID) {
    var safe = String(matchID).replace(/[^A-Za-z0-9_-]/g, "_");
    return path.join(dir, safe + ".json");
}

async function readMatch(dir, matchID) {
    try {
        var raw = await fs.promises.readFile(matchFile(dir, matchID), "utf8");
        return JSON.parse(raw);
    } catch (e) {
        if (e && e.code === "ENOENT") { return undefined; }
        throw e;
    }
}

// Write to a temp file then rename - rename is atomic on the same
// filesystem, so a crash or restart mid-write can never leave a half-written
// (corrupt / unparsable) match file behind.
async function writeMatch(dir, matchID, data) {
    var file = matchFile(dir, matchID);
    var tmp = file + "." + process.pid + "." + Date.now() + ".tmp";
    await fs.promises.writeFile(tmp, JSON.stringify(data), "utf8");
    await fs.promises.rename(tmp, file);
}

function FileStore(opts) {
    this.dir = (opts && opts.dir) || path.join(__dirname, "matches");
}

FileStore.prototype.type = function () {
    return ASYNC_TYPE;
};

FileStore.prototype.connect = async function () {
    await fs.promises.mkdir(this.dir, { recursive: true });
};

FileStore.prototype.createMatch = async function (matchID, opts) {
    await writeMatch(this.dir, matchID, {
        state: opts.initialState,
        initialState: opts.initialState,
        log: [],
        metadata: opts.metadata,
    });
};

FileStore.prototype.setState = async function (matchID, state, deltalog) {
    var existing = (await readMatch(this.dir, matchID)) || { log: [] };
    var log = Array.isArray(existing.log) ? existing.log : [];
    if (deltalog && deltalog.length > 0) {
        log = log.concat(deltalog);
    }
    existing.state = state;
    existing.log = log;
    await writeMatch(this.dir, matchID, existing);
};

FileStore.prototype.setMetadata = async function (matchID, metadata) {
    var existing = (await readMatch(this.dir, matchID)) || { log: [] };
    existing.metadata = metadata;
    await writeMatch(this.dir, matchID, existing);
};

FileStore.prototype.fetch = async function (matchID, opts) {
    var existing = await readMatch(this.dir, matchID);
    var result = {};
    if (!existing) { return result; }
    if (opts && opts.state) { result.state = existing.state; }
    if (opts && opts.metadata) { result.metadata = existing.metadata; }
    if (opts && opts.log) { result.log = existing.log; }
    if (opts && opts.initialState) { result.initialState = existing.initialState; }
    return result;
};

FileStore.prototype.wipe = async function (matchID) {
    try {
        await fs.promises.unlink(matchFile(this.dir, matchID));
    } catch (e) {
        if (!e || e.code !== "ENOENT") { throw e; }
    }
};

FileStore.prototype.listMatches = async function (opts) {
    var files;
    try {
        files = await fs.promises.readdir(this.dir);
    } catch (e) {
        if (e && e.code === "ENOENT") { return []; }
        throw e;
    }
    var matchIDs = files
        .filter(function (f) { return f.slice(-5) === ".json"; })
        .map(function (f) { return f.slice(0, -5); });

    if (!opts) { return matchIDs; }

    var self = this;
    var results = await Promise.all(matchIDs.map(async function (matchID) {
        var existing = await readMatch(self.dir, matchID);
        var metadata = existing && existing.metadata;
        if (!metadata) { return null; }
        if (opts.gameName && opts.gameName !== metadata.gameName) { return null; }
        if (opts.where) {
            if (typeof opts.where.isGameover !== "undefined") {
                var isGameover = typeof metadata.gameover !== "undefined";
                if (isGameover !== opts.where.isGameover) { return null; }
            }
            if (typeof opts.where.updatedBefore !== "undefined" && metadata.updatedAt >= opts.where.updatedBefore) {
                return null;
            }
            if (typeof opts.where.updatedAfter !== "undefined" && metadata.updatedAt <= opts.where.updatedAfter) {
                return null;
            }
        }
        return matchID;
    }));
    return results.filter(function (r) { return r !== null; });
};

exports.FileStore = FileStore;
