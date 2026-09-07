"use strict";
// Admin panel API. Mounted on the same Koa app / port as the game + front-end.
// Handles /api/admin/* (auth-guarded) and serves uploaded card art from
// /uploads/*. No extra npm deps: bodies are read straight off the request
// stream and images arrive as base64 data URLs.
exports.__esModule = true;

var crypto = require("crypto");
var fs = require("fs");
var path = require("path");
var ce = require("./customExpansions");

var ADMIN_FILE = path.join(ce.DATA_DIR, "admin.json");
var DEFAULT_USERNAME = "Sideways";
var DEFAULT_PASSWORD = "123456789";
var MIN_PASSWORD_LEN = 8;
var TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
var MAX_BODY = 12 * 1024 * 1024; // ~12MB raw (base64 image ~= 1.33x the PNG)

// --- password + token helpers ------------------------------------------------
function hashPw(pw, salt) {
    return crypto.pbkdf2Sync(String(pw), salt, 100000, 32, "sha256").toString("hex");
}
function timingEqualHex(a, b) {
    if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) { return false; }
    try {
        return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
    } catch (e) {
        return false;
    }
}

function loadAdmin() {
    try {
        var raw = fs.readFileSync(ADMIN_FILE, "utf8");
        var a = JSON.parse(raw);
        if (a && a.username && a.salt && a.hash && a.secret) { return a; }
    } catch (e) { /* fall through to seed */ }
    return seedAdmin();
}

function seedAdmin() {
    ce.ensureDirs();
    var salt = crypto.randomBytes(16).toString("hex");
    var admin = {
        username: DEFAULT_USERNAME,
        salt: salt,
        hash: hashPw(DEFAULT_PASSWORD, salt),
        mustChangePassword: true,
        secret: crypto.randomBytes(32).toString("hex"),
        createdAt: Date.now(),
    };
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2), "utf8");
    return admin;
}

function saveAdmin(admin) {
    ce.ensureDirs();
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2), "utf8");
    return admin;
}

function makeToken(admin) {
    var payload = Buffer.from(JSON.stringify({ iat: Date.now() })).toString("base64");
    var sig = crypto.createHmac("sha256", admin.secret).update(payload).digest("hex");
    return payload + "." + sig;
}

function verifyToken(admin, token) {
    if (!token || typeof token !== "string") { return false; }
    var parts = token.split(".");
    if (parts.length !== 2) { return false; }
    var expected = crypto.createHmac("sha256", admin.secret).update(parts[0]).digest("hex");
    if (!timingEqualHex(expected, parts[1])) { return false; }
    try {
        var p = JSON.parse(Buffer.from(parts[0], "base64").toString("utf8"));
        if (!p || typeof p.iat !== "number") { return false; }
        if (Date.now() - p.iat > TOKEN_TTL_MS) { return false; }
        return true;
    } catch (e) {
        return false;
    }
}

function bearer(ctx) {
    var h = ctx.headers && ctx.headers.authorization;
    if (!h) { return ""; }
    var m = /^Bearer\s+(.+)$/i.exec(h);
    return m ? m[1].trim() : "";
}

// --- request body ----------------------------------------------------------
function readJsonBody(ctx) {
    return new Promise(function (resolve, reject) {
        var chunks = [];
        var size = 0;
        var req = ctx.req;
        req.on("data", function (c) {
            size += c.length;
            if (size > MAX_BODY) {
                var err = new Error("Request body too large");
                err.status = 413;
                reject(err);
                try { req.destroy(); } catch (e) { /* ignore */ }
                return;
            }
            chunks.push(c);
        });
        req.on("end", function () {
            var text = Buffer.concat(chunks).toString("utf8").trim();
            if (!text) { return resolve({}); }
            try {
                resolve(JSON.parse(text));
            } catch (e) {
                var err = new Error("Invalid JSON body");
                err.status = 400;
                reject(err);
            }
        });
        req.on("error", reject);
    });
}

function httpError(status, message) {
    var e = new Error(message);
    e.status = status;
    return e;
}

// --- data helpers --------------------------------------------------------
function randId(prefix) {
    return prefix + crypto.randomBytes(4).toString("hex");
}

function findPack(state, id) {
    return state.packs.find(function (p) { return p.id === id; });
}

function safeUploadName(name) {
    return /^[A-Za-z0-9_.-]+$/.test(name) && name.indexOf("..") === -1;
}

function removeUpload(imageField) {
    if (!imageField || typeof imageField !== "string") { return; }
    var base = imageField.replace(/^\/uploads\//, "");
    if (!safeUploadName(base)) { return; }
    try { fs.unlinkSync(path.join(ce.UPLOADS_DIR, base)); } catch (e) { /* ignore */ }
}

// decode a "data:image/png;base64,...." string -> { ext, buffer }
function decodeImageDataUrl(dataUrl) {
    if (typeof dataUrl !== "string") { throw httpError(400, "Card image is required"); }
    var m = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
    if (!m) { throw httpError(400, "Card image must be a PNG, JPEG or WebP data URL"); }
    var ext = m[1] === "jpeg" ? "jpg" : m[1];
    var buffer = Buffer.from(m[2].replace(/\s+/g, ""), "base64");
    if (buffer.length === 0) { throw httpError(400, "Card image is empty"); }
    if (buffer.length > 8 * 1024 * 1024) { throw httpError(413, "Card image must be under 8MB"); }
    return { ext: ext, buffer: buffer };
}

var CONTENT_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

// --- route handling ------------------------------------------------------
function serveUpload(ctx) {
    var file = decodeURIComponent(ctx.path.replace(/^\/uploads\//, ""));
    if (!safeUploadName(file)) { ctx.status = 404; ctx.body = { error: "not found" }; return; }
    var full = path.join(ce.UPLOADS_DIR, file);
    var data;
    try {
        data = fs.readFileSync(full);
    } catch (e) {
        ctx.status = 404;
        ctx.body = { error: "not found" };
        return;
    }
    var ext = (path.extname(file).slice(1) || "png").toLowerCase();
    ctx.type = CONTENT_TYPES[ext] || "application/octet-stream";
    ctx.set("Cache-Control", "public, max-age=86400");
    ctx.body = data;
}

function requireAuth(ctx, admin) {
    if (!verifyToken(admin, bearer(ctx))) {
        throw httpError(401, "Not signed in");
    }
}

function requirePasswordChanged(admin) {
    if (admin.mustChangePassword) {
        throw httpError(403, "Change your password before making changes");
    }
}

function publicState(admin) {
    return { mustChangePassword: !!admin.mustChangePassword, packs: ce.loadState().packs };
}

function handle(ctx) {
    var p = ctx.path;
    var method = ctx.method.toUpperCase();

    if (p.indexOf("/uploads/") === 0) {
        serveUpload(ctx);
        return Promise.resolve();
    }

    // public: list packs for the lobby
    if (p === "/api/expansions" && method === "GET") {
        ctx.body = { packs: ce.publicPacks() };
        return Promise.resolve();
    }

    if (p.indexOf("/api/admin/") !== 0) {
        ctx.status = 404;
        ctx.body = { error: "not found" };
        return Promise.resolve();
    }

    var admin = loadAdmin();

    // login (no token required)
    if (p === "/api/admin/login" && method === "POST") {
        return readJsonBody(ctx).then(function (body) {
            var user = (body.username || "").trim();
            var pw = body.password || "";
            var okUser = user.toLowerCase() === String(admin.username).toLowerCase();
            var okPw = timingEqualHex(hashPw(pw, admin.salt), admin.hash);
            if (!okUser || !okPw) {
                throw httpError(401, "Wrong username or password");
            }
            ctx.body = {
                token: makeToken(admin),
                username: admin.username,
                mustChangePassword: !!admin.mustChangePassword,
            };
        });
    }

    // everything below needs a valid token
    requireAuth(ctx, admin);

    if (p === "/api/admin/change-password" && method === "POST") {
        return readJsonBody(ctx).then(function (body) {
            var current = body.currentPassword || "";
            var next = body.newPassword || "";
            if (!timingEqualHex(hashPw(current, admin.salt), admin.hash)) {
                throw httpError(400, "Current password is incorrect");
            }
            if (String(next).length < MIN_PASSWORD_LEN) {
                throw httpError(400, "New password must be at least " + MIN_PASSWORD_LEN + " characters");
            }
            if (timingEqualHex(hashPw(next, admin.salt), admin.hash)) {
                throw httpError(400, "New password must be different from the current one");
            }
            var salt = crypto.randomBytes(16).toString("hex");
            admin.salt = salt;
            admin.hash = hashPw(next, salt);
            admin.mustChangePassword = false;
            admin.updatedAt = Date.now();
            saveAdmin(admin);
            ctx.body = { ok: true, token: makeToken(admin), mustChangePassword: false };
        });
    }

    if (p === "/api/admin/state" && method === "GET") {
        ctx.body = publicState(admin);
        return Promise.resolve();
    }

    if (p === "/api/admin/effects" && method === "GET") {
        ctx.body = {
            effects: Object.keys(ce.EFFECTS).map(function (k) {
                return { key: k, label: ce.EFFECTS[k].label, types: ce.EFFECTS[k].types };
            }),
            cardTypes: ce.CARD_TYPES,
        };
        return Promise.resolve();
    }

    // Catalog of fully-implemented cards an upload can "play as".
    if (p === "/api/admin/base-cards" && method === "GET") {
        ctx.body = { cards: ce.getBaseCardCatalog() };
        return Promise.resolve();
    }

    // Building blocks for the custom-ability builder.
    if (p === "/api/admin/ability-catalog" && method === "GET") {
        ctx.body = ce.getAbilityCatalog();
        return Promise.resolve();
    }

    // all mutations require the password to have been changed off the default
    if (p === "/api/admin/packs" && method === "POST") {
        requirePasswordChanged(admin);
        return readJsonBody(ctx).then(function (body) {
            var name = (body.name || "").trim();
            var blurb = (body.blurb || "").trim();
            if (name.length < 2 || name.length > 60) {
                throw httpError(400, "Pack name must be 2-60 characters");
            }
            var state = ce.loadState();
            var pack = { id: randId("custom_"), name: name, blurb: blurb.slice(0, 240), cards: [], createdAt: Date.now() };
            state.packs.push(pack);
            ce.saveState(state);
            ctx.body = { pack: pack };
        });
    }

    var mPack = /^\/api\/admin\/packs\/([A-Za-z0-9_]+)$/.exec(p);
    if (mPack && method === "DELETE") {
        requirePasswordChanged(admin);
        var state = ce.loadState();
        var idx = state.packs.findIndex(function (x) { return x.id === mPack[1]; });
        if (idx === -1) { throw httpError(404, "Pack not found"); }
        (state.packs[idx].cards || []).forEach(function (c) { removeUpload(c.image); });
        state.packs.splice(idx, 1);
        ce.saveState(state);
        ctx.body = { ok: true };
        return Promise.resolve();
    }

    var mCards = /^\/api\/admin\/packs\/([A-Za-z0-9_]+)\/cards$/.exec(p);
    if (mCards && method === "POST") {
        requirePasswordChanged(admin);
        return readJsonBody(ctx).then(function (body) {
            var state = ce.loadState();
            var pack = findPack(state, mCards[1]);
            if (!pack) { throw httpError(404, "Pack not found"); }

            var title = (body.title || "").trim();
            var type = (body.type || "").trim();
            var count = parseInt(body.count, 10);
            var description = (body.description || "").trim();
            var effectKey = (body.effectKey || "none").trim();

            // Precedence: fully custom ability > "plays as" > preset effect.
            var ability = null;
            if (body.ability && typeof body.ability === "object") {
                ce.compileAbility(body.ability); // throws httpError(400) if invalid
                ability = body.ability;
            }

            var baseCardTitle = ability ? "" : ce.resolveBaseCardTitle(body.baseCardTitle);
            if (baseCardTitle) {
                // type + mechanics come from the base card; ignore the picked ones
                var baseCard = ce.getBaseCardCatalog().filter(function (b) { return b.title === baseCardTitle; })[0];
                if (baseCard) { type = baseCard.type; }
                effectKey = "none";
                if (type === "baby") {
                    throw httpError(400, "Baby Unicorns are the fixed starter pool and can't be added as custom cards");
                }
            }
            if (ability) { effectKey = "none"; }

            if (title.length < 1 || title.length > 60) { throw httpError(400, "Card name must be 1-60 characters"); }
            if (ce.CARD_TYPES.indexOf(type) === -1) { throw httpError(400, "Unknown card type"); }
            if (!(count >= 1 && count <= 20)) { throw httpError(400, "Count must be 1-20"); }
            if (!baseCardTitle && !ability && !ce.effectAllowed(type, effectKey)) { effectKey = "none"; }

            var img = decodeImageDataUrl(body.image);
            var cardId = randId("c_");
            var fileName = pack.id + "_" + cardId + "." + img.ext;
            ce.ensureDirs();
            fs.writeFileSync(path.join(ce.UPLOADS_DIR, fileName), img.buffer);

            var card = {
                id: cardId,
                title: title,
                type: type,
                count: count,
                description: description.slice(0, 400),
                effectKey: effectKey,
                baseCardTitle: baseCardTitle || undefined,
                ability: ability || undefined,
                image: "/uploads/" + fileName,
                createdAt: Date.now(),
            };
            pack.cards = pack.cards || [];
            pack.cards.push(card);
            ce.saveState(state);
            ctx.body = { card: card };
        });
    }

    var mCard = /^\/api\/admin\/packs\/([A-Za-z0-9_]+)\/cards\/([A-Za-z0-9_]+)$/.exec(p);
    if (mCard && method === "DELETE") {
        requirePasswordChanged(admin);
        var st2 = ce.loadState();
        var pk = findPack(st2, mCard[1]);
        if (!pk) { throw httpError(404, "Pack not found"); }
        var ci = (pk.cards || []).findIndex(function (c) { return c.id === mCard[2]; });
        if (ci === -1) { throw httpError(404, "Card not found"); }
        removeUpload(pk.cards[ci].image);
        pk.cards.splice(ci, 1);
        ce.saveState(st2);
        ctx.body = { ok: true };
        return Promise.resolve();
    }

    ctx.status = 404;
    ctx.body = { error: "not found" };
    return Promise.resolve();
}

// Koa middleware. Only claims /api/* and /uploads/*; everything else falls
// through to the static front-end handler.
function mount(app) {
    ce.ensureDirs();
    loadAdmin(); // seed admin.json on boot so the default login works immediately
    app.use(function (ctx, next) {
        var p = ctx.path || "";
        if (p.indexOf("/api/") !== 0 && p.indexOf("/uploads/") !== 0) {
            return next();
        }
        return Promise.resolve()
            .then(function () { return handle(ctx); })
            .catch(function (err) {
                ctx.status = (err && err.status) || 500;
                ctx.body = { error: (err && err.message) || "Server error" };
                if (!err || !err.status) {
                    // unexpected - log it
                    console.error("[admin] error handling " + ctx.method + " " + ctx.path + ":", err);
                }
            });
    });
}

exports.mount = mount;
