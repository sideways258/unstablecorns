"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
// src/server.js

// Since adding on-disk match persistence, a storage hiccup (a slow/full
// disk, a transient file-I/O error) surfacing as an unhandled promise
// rejection could otherwise take the ENTIRE process down - Node's default
// since v15 is to terminate on any unhandled rejection. Writes are already
// made non-throwing in matchStorage.js, but this is the last line of
// defense against a failure ANYWHERE (a fetch failure, or anything
// unrelated) crashing every in-progress match on the server. Trading "might
// keep running in a slightly odd state" for "never goes down over one bad
// promise" is the right call for a game server with people mid-match.
process.on('unhandledRejection', function (reason) {
    console.error('Unhandled promise rejection (server staying up):', reason);
});
process.on('uncaughtException', function (err) {
    console.error('Uncaught exception (server staying up):', err);
});

var path = require("path");
var serve = require('koa-static');
var Server = require('boardgame.io/server').Server;
var games_1 = require("./games");
var admin_1 = require("./admin");
var matchStorage_1 = require("./matchStorage");
// Persist match state to DATA_DIR so games survive a container restart (a
// deploy, a crash, a reboot) instead of vanishing with the old process's
// memory. Falls back to boardgame.io's default in-memory storage (today's
// behavior) if the persistent store can't be set up for any reason.
var db = matchStorage_1.createDb();
var server = Server({ games: games_1.games, db: db });
// Sweep out matches nobody has touched in 30+ days so /data doesn't grow
// without bound.
matchStorage_1.startCleanupSchedule(db);
// Admin panel API + uploaded card art. Mounted BEFORE the static handler so
// /api/* and /uploads/* are answered here and never fall through to the SPA.
admin_1.mount(server.app);
// Single listening port for everything: static front-end, game WebSocket, and
// the boardgame.io lobby REST API are all mounted on this one server. Do NOT
// set lobbyConfig.apiPort here -- that forks the lobby API onto a second port,
// which collides with PORT and breaks single-port deploys (Docker/Unraid/Heroku).
var PORT = process.env.PORT == null ? 8090 : parseInt(process.env.PORT, 10);
var frontEndAppBuildPath = path.resolve(__dirname, '../build');
server.app.use(serve(frontEndAppBuildPath));
server.run({ port: PORT }, function () {
    // SPA fallback: serve build/index.html for any route the static handler missed
    // (e.g. deep links like /<matchID>/<numPlayers>/<playerID>).
    server.app.use(function (ctx, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, serve(frontEndAppBuildPath)(Object.assign(ctx, { path: 'index.html' }), next)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    console.log('Unstable Unicorns server (front-end + game + lobby API) listening on port ' + PORT);
});
