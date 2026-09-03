import type { ComponentType } from 'react';
import UnstableUnicorns from '../game/game';
import UnstableUnicornsBoard from '../Board';
import { createMockGame } from './mockGame';
import { CRITTERS_DECK, GALAXY_DECK } from './mockCards';
import MockBoard from './MockBoard';

export type GameDef = {
  /** URL slug. */
  id: string;
  name: string;
  tagline: string;
  /** Emoji shown on the picker tile. */
  icon: string;
  minPlayers: number;
  maxPlayers: number;
  /** Accent colour for the picker card. */
  accent: string;
  /** Marks placeholder games in the UI. */
  mock?: boolean;
  /** boardgame.io Game object. Its `.name` MUST match the server's registration. */
  bgGame: any;
  /** Board component boardgame.io renders. */
  board: ComponentType<any>;
};

// Add new games here (and register the same bgGame on the server - see
// server/games.js). Keep `id` stable: it lives in shared lobby URLs.
export const GAMES: GameDef[] = [
  {
    id: 'unstable-unicorns',
    name: 'Unstable Unicorns',
    tagline: 'Build a unicorn army. Betray your friends.',
    icon: '🦄',
    minPlayers: 2,
    maxPlayers: 8,
    accent: '#e0447d',
    bgGame: UnstableUnicorns,
    board: UnstableUnicornsBoard,
  },
  {
    id: 'clash-of-critters',
    name: 'Clash of Critters',
    tagline: 'Mock game — placeholder cards, real multiplayer plumbing.',
    icon: '🐿️',
    minPlayers: 2,
    maxPlayers: 6,
    accent: '#2fbf71',
    mock: true,
    bgGame: createMockGame({ name: 'clash_of_critters', deck: CRITTERS_DECK }),
    board: MockBoard,
  },
  {
    id: 'galaxy-gambit',
    name: 'Galaxy Gambit',
    tagline: 'Mock game — placeholder cards, real multiplayer plumbing.',
    icon: '🚀',
    minPlayers: 2,
    maxPlayers: 4,
    accent: '#5b7cfa',
    mock: true,
    bgGame: createMockGame({ name: 'galaxy_gambit', deck: GALAXY_DECK }),
    board: MockBoard,
  },
];

export const DEFAULT_GAME_ID = GAMES[0].id;

export const getGameById = (id?: string): GameDef | undefined => GAMES.find((g) => g.id === id);

export const getGameByServerName = (name?: string): GameDef | undefined =>
  GAMES.find((g) => g.bgGame && g.bgGame.name === name);
