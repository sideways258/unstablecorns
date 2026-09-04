"use strict";
// CJS mirror of src/game/expansions.ts - ORIGINAL homebrew expansion packs that
// reuse mechanics the engine already implements. Keep in sync with the TS file.
exports.__esModule = true;
exports.EXPANSION_CARDS = exports.EXPANSION_PACKS = void 0;

exports.EXPANSION_PACKS = [
    { id: 'prism', name: 'Prism Pack', blurb: '23 homebrew light-themed cards — more unicorns, upgrades and a few spells.' },
    { id: 'ruckus', name: 'Ruckus Pack', blurb: '22 homebrew chaos cards — disruptive magic and mean downgrades.' },
    { id: 'neigh_nation', name: 'Neigh Nation', blurb: 'Adds 15 more Neigh and 5 more Super Neigh cards to the deck — chaos guaranteed.' }
];

function enterEffect(key) {
    return [{ trigger: 'enter', "do": { type: 'add_effect', info: { key: key }, ui: { type: 'none' } } }];
}
function botEffect(key) {
    return [{ trigger: 'begin_of_turn', "do": { type: 'add_effect', info: { key: key }, ui: { type: 'none' } } }];
}
function returnOnLoss() {
    return [{ trigger: 'this_destroyed_or_sacrificed', "do": { type: 'return_to_hand' } }];
}
function popup(t) {
    return { type: 'single_action_popup', info: { singleActionText: t } };
}
function step(doObj, ui) {
    return { instructions: [{ protagonist: 'owner', "do": doObj, ui: ui }] };
}
function scene(mandatory, trigger, actions) {
    return [{ trigger: trigger, "do": { type: 'add_scene', info: { actions: actions, mandatory: mandatory, endTurnImmediately: false } } }];
}
function card(set, title, type, image, count, descEn, extra) {
    var base = { set: set, title: title, type: type, image: image, count: count, description: { en: descEn, de: descEn }, on: [] };
    if (extra) {
        for (var k in extra) {
            if (Object.prototype.hasOwnProperty.call(extra, k)) {
                base[k] = extra[k];
            }
        }
    }
    return base;
}

exports.EXPANSION_CARDS = [
    // ======================= PRISM PACK =======================
    card('prism', 'Prism Foal', 'basic', 'basic0', 2, 'Just a shiny little unicorn. No powers.'),
    card('prism', 'Glasswing Colt', 'basic', 'basic1', 2, 'Catches the light beautifully. Nothing else.'),
    card('prism', 'Opaline Mare', 'basic', 'basic2', 2, 'A calm, iridescent unicorn with no special ability.'),
    card('prism', 'Sunbeam Pony', 'basic', 'basic3', 2, 'Warm and bright. That is the whole résumé.'),
    card('prism', 'Dewdrop Filly', 'basic', 'basic4', 2, 'Sparkles in the morning. Powerless, but adorable.'),
    card('prism', 'Halcyon Unicorn', 'basic', 'basic5', 2, 'Serene and ordinary. A dependable Basic Unicorn.'),

    card('prism', 'Lantern Unicorn', 'unicorn', 'magical_flying_unicorn', 2,
        'If this card is in your Stable at the beginning of your turn, you may DISCARD 2 cards, then DESTROY a Unicorn card.',
        { on: scene(false, 'begin_of_turn', [
            step({ key: 'discard', info: { count: 2, type: 'any' } }, popup('Discard 2 cards')),
            step({ key: 'destroy', info: { type: 'unicorn' } }, { type: 'click_on_card_in_stable' })
        ]) }),
    card('prism', 'Aurora Unicorn', 'unicorn', 'majestic_flying_unicorn', 1,
        'If this card is in your Stable at the beginning of your turn, you may SACRIFICE a card, then DESTROY a card.',
        { on: scene(false, 'begin_of_turn', [
            step({ key: 'sacrifice', info: { type: 'any' } }, { type: 'card_to_card' }),
            step({ key: 'destroy', info: { type: 'any' } }, { type: 'click_on_card_in_stable' })
        ]) }),
    card('prism', 'Mirror Unicorn', 'unicorn', 'magical_kittencorn', 1,
        'If this card is in your Stable at the beginning of your turn, you may DISCARD 3 cards, then STEAL a Unicorn card.',
        { on: scene(false, 'begin_of_turn', [
            step({ key: 'discard', info: { count: 3, type: 'any' } }, popup('Discard 3 cards to steal')),
            step({ key: 'steal', info: { type: 'unicorn' } }, { type: 'card_to_card' })
        ]) }),
    card('prism', 'Beacon Unicorn', 'unicorn', 'swift_flying_unicorn', 2,
        'If this card is in your Stable at the beginning of your turn, you may DRAW a card.',
        { on: scene(false, 'begin_of_turn', [
            step({ key: 'draw', info: { count: 1 } }, popup('Draw a card'))
        ]) }),
    card('prism', 'Kaleido Unicorn', 'unicorn', 'greedy_flying_unicorn', 2,
        'If this card is in your Stable at the beginning of your turn, you may DISCARD a card, then DRAW a card.',
        { on: scene(false, 'begin_of_turn', [
            step({ key: 'discard', info: { count: 1, type: 'any' } }, popup('Discard to draw')),
            step({ key: 'draw', info: { count: 1 } }, popup('Draw a card'))
        ]) }),
    card('prism', 'Spectral Unicorn', 'unicorn', 'dark_angel_unicorn', 1,
        'This card counts as 2 Unicorns.', { passive: ['count_as_two'] }),
    card('prism', 'Warded Unicorn', 'unicorn', 'black_knight_unicorn', 2,
        'This card cannot be destroyed by Magic cards.', { passive: ['cannot_be_destroyed_by_magic'] }),
    card('prism', 'Phoenix Unicorn', 'unicorn', 'necromancer_unicorn', 1,
        'If this card would be destroyed or sacrificed, return it to your hand instead.',
        { on: returnOnLoss() }),
    card('prism', 'Radiant Unicorn', 'unicorn', 'seductive_unicorn', 1,
        'When this card enters your Stable, you may DRAW a card.',
        { on: scene(false, 'enter', [step({ key: 'draw', info: { count: 1 } }, popup('Draw a card'))]) }),

    card('prism', 'Sunny Disposition', 'upgrade', 'yay', 2,
        'Cards you play cannot be Neigh’d.', { on: enterEffect('your_cards_cannot_be_neighed') }),
    card('prism', 'Prism Shield', 'upgrade', 'rainbow_aura', 1,
        'Your Unicorn cards cannot be destroyed.', { on: enterEffect('your_unicorns_cannot_be_destroyed') }),
    card('prism', 'Light Cannon', 'upgrade', 'stable_artillery', 3,
        'If this card is in your Stable at the beginning of your turn, you may DISCARD 2 cards, then DESTROY a Unicorn card.',
        { on: scene(false, 'begin_of_turn', [
            step({ key: 'discard', info: { count: 2, type: 'any' } }, popup('Discard 2 cards')),
            step({ key: 'destroy', info: { type: 'unicorn' } }, { type: 'click_on_card_in_stable' })
        ]) }),
    card('prism', 'Fast Pass', 'upgrade', 'double_dutch', 1,
        'If this card is in your Stable at the beginning of your turn, you may play 2 cards during your Action phase.',
        { on: botEffect('double_dutch') }),
    card('prism', 'Trail Rations', 'upgrade', 'claw_machine', 2,
        'If this card is in your Stable at the beginning of your turn, you may DISCARD a card, then DRAW a card.',
        { on: scene(false, 'begin_of_turn', [
            step({ key: 'discard', info: { count: 1, type: 'any' } }, popup('Discard to draw')),
            step({ key: 'draw', info: { count: 1 } }, popup('Draw a card'))
        ]) }),

    card('prism', 'Blinding Flash', 'magic', 'blinding_light', 2, 'DESTROY a Unicorn card.',
        { on: scene(true, 'enter', [step({ key: 'destroy', info: { type: 'unicorn' } }, { type: 'card_to_card' })]) }),
    card('prism', 'Sleight of Hoof', 'magic', 'alignment_change', 2, 'DISCARD 2 cards, then STEAL a Unicorn card.',
        { on: scene(true, 'enter', [
            step({ key: 'discard', info: { count: 2, type: 'any' } }, popup('Discard to steal')),
            step({ key: 'steal', info: { type: 'unicorn' } }, { type: 'card_to_card' })
        ]) }),
    card('prism', 'Colour Bomb', 'magic', 'glitter_bomb', 1, 'SACRIFICE a card, then DESTROY a card.',
        { on: scene(true, 'enter', [
            step({ key: 'sacrifice', info: { type: 'any' } }, { type: 'card_to_card' }),
            step({ key: 'destroy', info: { type: 'any' } }, { type: 'card_to_card' })
        ]) }),

    // ======================= RUCKUS PACK =======================
    card('ruckus', 'Rowdy Foal', 'basic', 'basic6', 2, 'Loud, small, no powers. Classic Basic Unicorn.'),
    card('ruckus', 'Grumble Colt', 'basic', 'basic7', 2, 'Perpetually unimpressed. Has no special ability.'),
    card('ruckus', 'Scrappy Mare', 'basic', 'vagabond_unicorn', 2, 'Been around the block. Still just a Basic Unicorn.'),
    card('ruckus', 'Ornery Pony', 'basic', 'survivalist_unicorn', 2, 'Bites. Metaphorically. No card effect.'),
    card('ruckus', 'Contrary Colt', 'basic', 'annoying_flying_unicorn', 2, 'Does the opposite of nothing, which is nothing.'),

    card('ruckus', 'Yoink', 'magic', 'unicorn_swap', 2, 'STEAL a Unicorn card.',
        { on: scene(true, 'enter', [step({ key: 'steal', info: { type: 'unicorn' } }, { type: 'card_to_card' })]) }),
    card('ruckus', 'Smash', 'magic', 'unicorn_poison', 2, 'DESTROY a Unicorn card.',
        { on: scene(true, 'enter', [step({ key: 'destroy', info: { type: 'unicorn' } }, { type: 'card_to_card' })]) }),
    card('ruckus', 'Double Trouble', 'magic', 'two-for-one', 1, 'SACRIFICE a card, then DESTROY 2 cards.',
        { on: scene(true, 'enter', [
            step({ key: 'sacrifice', info: { type: 'any' } }, { type: 'card_to_card' }),
            step({ key: 'destroy', info: { type: 'any', count: 2 } }, { type: 'card_to_card' })
        ]) }),
    card('ruckus', 'Ransack', 'magic', 'caffeine_overload', 2, 'DRAW 2 cards.',
        { on: scene(true, 'enter', [step({ key: 'draw', info: { count: 2 } }, { type: 'click_on_drawPile' })]) }),
    card('ruckus', 'Hand-Off', 'magic', 'unfair_bargain', 2, 'Trade hands with any other player.',
        { on: scene(true, 'enter', [step({ key: 'swapHands' }, { type: 'card_to_player' })]) }),
    card('ruckus', 'Deck Dive', 'magic', 'mystical_vortex', 1, 'Search the deck for a Unicorn card and add it to your hand, then shuffle the deck.',
        { on: scene(true, 'enter', [step({ key: 'search', info: { type: 'unicorn' } }, popup('Search'))]) }),
    card('ruckus', 'Second Wind', 'magic', 'kiss_of_life', 2, 'Return a Unicorn card from the discard pile to your Stable.',
        { on: scene(true, 'enter', [step({ key: 'revive', info: { type: 'unicorn' } }, popup('Revive'))]) }),
    card('ruckus', 'Dumpster Dip', 'magic', 'good_deal', 1, 'Add a Unicorn card from the discard pile to your hand.',
        { on: scene(true, 'enter', [step({ key: 'addFromDiscardPileToHand', info: { type: 'unicorn' } }, popup('Add card from discard pile'))]) }),
    card('ruckus', 'Nursery Break', 'magic', 'mother_goose_unicorn', 1, 'Bring a Baby Unicorn from the Nursery directly into your Stable.',
        { on: scene(true, 'enter', [step({ key: 'reviveFromNursery' }, popup('Revive Baby Unicorn'))]) }),
    card('ruckus', 'Big Reset', 'magic', 'reset_button', 1, 'Each player (including you) must SACRIFICE all Upgrade and Downgrade cards in their Stable. Shuffle the discard pile into the deck.',
        { on: scene(true, 'enter', [step({ key: 'reset' }, popup('Reset all Upgrades and Downgrades'))]) }),

    card('ruckus', 'Sticky Hooves', 'downgrade', 'barbed_wire', 2,
        'You cannot play Neigh cards.', { on: enterEffect('you_cannot_play_neigh') }),
    card('ruckus', 'Butter Hooves', 'downgrade', 'broken_stable', 2,
        'You cannot play Upgrade cards.', { on: enterEffect('you_cannot_play_upgrades') }),
    card('ruckus', 'Cramped Stall', 'downgrade', 'tiny_stable', 1,
        'If you have 5 or more Unicorns in your Stable, SACRIFICE a Unicorn at the beginning of your turn.',
        { on: enterEffect('tiny_stable') }),
    card('ruckus', 'Glass Walls', 'downgrade', 'nanny_cam', 1,
        'Your hand must be visible to all players.', { on: enterEffect('your_hand_is_visible') }),
    card('ruckus', 'Plain Jane', 'downgrade', 'slowdown', 1,
        'Treat all of your Unicorns as Basic Unicorns.', { on: enterEffect('my_unicorns_are_basic') }),

    card('ruckus', 'Chonk Unicorn', 'unicorn', 'rhinocorn', 1,
        'This card counts as 2 Unicorns.', { passive: ['count_as_two'] }),
    card('ruckus', 'Bunker Unicorn', 'unicorn', 'chainsaw_unicorn', 2,
        'This card cannot be destroyed by Magic cards.', { passive: ['cannot_be_destroyed_by_magic'] }),

    // ======================= NEIGH NATION =======================
    // Reuses the base game's own Neigh / Super Neigh art and text - just more of them.
    card('neigh_nation', 'Neigh', 'neigh', 'neigh', 15,
        "Play this card when another player tries to play a card. Stop their card from being played and send it to the discard pile."),
    card('neigh_nation', 'Super Neigh', 'super_neigh', 'super_neigh', 5,
        "Play this card when another player tries to play a card. Stop their card from being played and send it to the discard pile. This card cannot be Neigh'd.")
];
