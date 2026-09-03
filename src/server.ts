// src/server.ts
//
// TypeScript source for the game server. Compile it with:
//   tsc src/server.ts --outDir server
// The Docker image runs the compiled output at server/server.js.
import * as path from 'path';
const serve = require('koa-static');
const { Server } = require('boardgame.io/server');
import UnstableUnicorns from './game/game';

// Single listening port for everything: static front-end, game WebSocket, and
// the boardgame.io lobby REST API are all mounted on this one server. Do NOT
// pass lobbyConfig.apiPort -- that forks the lobby API onto a second port, which
// collides with PORT and breaks single-port deploys (Docker/Unraid/Heroku).
const PORT = process.env.PORT == null ? 8090 : parseInt(process.env.PORT, 10);

const server = Server({ games: [UnstableUnicorns] });

const frontEndAppBuildPath = path.resolve(__dirname, '../build');
server.app.use(serve(frontEndAppBuildPath));

server.run({ port: PORT }, () => {
  // SPA fallback: serve build/index.html for any route the static handler missed
  // (e.g. deep links like /<matchID>/<numPlayers>/<playerID>).
  server.app.use(
    async (ctx: any, next: any) => await serve(frontEndAppBuildPath)(
      Object.assign(ctx, { path: 'index.html' }),
      next
    )
  );
  console.log(`Unstable Unicorns server (front-end + game + lobby API) listening on port ${PORT}`);
});
