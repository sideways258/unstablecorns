// src/server.js
import * as path from 'path';
const serve = require('koa-static');
const { Server } = require('boardgame.io/server');
import UnstableUnicorns from './game/game';


const server = Server({ games: [UnstableUnicorns] });
const lobbyConfig = {
  apiPort: process.env.LOBBY_PORT == null ? 8090 : parseInt(process.env.LOBBY_PORT),
  apiCallback: () => console.log(`Running Lobby API on port ${process.env.LOBBY_PORT || 8090}...`),
};

const frontEndAppBuildPath = path.resolve(__dirname, '../build');
server.app.use(serve(frontEndAppBuildPath))

const lobbyConfig = {
  apiPort: 8090,
  apiCallback: () => console.log('Running Lobby API on port 8080...'),
};

server.run({port: PORT, lobbyConfig}, () => {
  server.app.use(
    async (ctx: any, next: any) => await serve(frontEndAppBuildPath)(
      Object.assign(ctx, { path: 'index.html' }),
      next
    )
  )
});
