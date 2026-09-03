"use strict";
// CommonJS mirror of src/games/mockCards.ts (kept in sync by hand).
exports.__esModule = true;

function card(id, title, kind, text) {
  return { id: id, title: title, kind: kind, text: text };
}

exports.CRITTERS_DECK = [
  card('cr_bite', 'Rabid Bite', 'attack', 'Deal 2 damage to a rival critter.'),
  card('cr_swarm', 'Swarm Rush', 'attack', 'Deal 1 damage to every rival.'),
  card('cr_ambush', 'Burrow Ambush', 'attack', 'Deal 3 damage if you went last.'),
  card('cr_shell', 'Shell Up', 'defense', 'Prevent the next 2 damage to you.'),
  card('cr_den', 'Cozy Den', 'defense', 'Heal 2. Draw a card next turn.'),
  card('cr_thorns', 'Thorn Hide', 'defense', 'Reflect 1 damage back at attackers.'),
  card('cr_forage', 'Forage', 'resource', 'Draw 2 cards.'),
  card('cr_hoard', 'Acorn Hoard', 'resource', 'Gain 3 nuts. Spend nuts to replay cards.'),
  card('cr_scout', 'Send Scout', 'resource', 'Look at the top 3 cards; keep 1.'),
  card('cr_totem', 'Critter Totem', 'wild', 'Copy the last card any player played.'),
  card('cr_trade', 'Fair Trade', 'wild', 'Swap a card with another player.'),
  card('cr_chaos', 'Feral Chaos', 'wild', 'Everyone passes their hand left.')
];

exports.GALAXY_DECK = [
  card('gx_laser', 'Ion Lance', 'attack', 'Deal 2 hull damage to a ship.'),
  card('gx_missile', 'Void Missiles', 'attack', 'Deal 4 damage; discard a card.'),
  card('gx_board', 'Boarding Party', 'attack', 'Steal a card from the target player.'),
  card('gx_shield', 'Deflector Field', 'defense', 'Block the next attack entirely.'),
  card('gx_repair', 'Nanite Repair', 'defense', 'Restore 3 hull over 2 turns.'),
  card('gx_cloak', 'Cloaking Run', 'defense', 'You cannot be targeted next round.'),
  card('gx_mine', 'Asteroid Mining', 'resource', 'Gain 4 credits.'),
  card('gx_jump', 'Hyperspace Jump', 'resource', 'Draw 3, then discard 1.'),
  card('gx_probe', 'Deep Probe', 'resource', 'Reveal a random card from each hand.'),
  card('gx_wild', 'Wormhole', 'wild', 'Move any card from the table to your hand.'),
  card('gx_ai', 'Rogue AI', 'wild', 'Take another turn after this one.'),
  card('gx_flux', 'Quantum Flux', 'wild', 'Reshuffle the discard pile into the deck.')
];
