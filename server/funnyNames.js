"use strict";
// CommonJS mirror of src/funnyNames.ts (kept in sync by hand).
// Cheeky / adult-humour player names, strictly no profanity.
exports.__esModule = true;

var ADJ = [
  "Sneaky", "Sweaty", "Thicc", "Feral", "Cursed", "Sussy", "Moist", "Unhinged", "Chaotic", "Crusty",
  "Rancid", "Menacing", "Cheeky", "Salty", "Spicy", "Deranged", "Flatulent", "Nefarious", "Greasy", "Sticky",
  "Slippery", "Suspicious", "Forbidden", "Concerning", "Feisty", "Rowdy", "Naughty", "Chonky", "Tipsy", "Goblin",
  "Bootylicious", "Discount", "Bargain-Bin", "Off-Brand", "Haunted", "Emotionally Unstable", "Deeply Confused",
  "Legally Distinct", "Aggressively Average", "Chronically Online"
];

var NOUN = [
  "Goblin", "Gremlin", "Menace", "Degenerate", "Rascal", "Scoundrel", "Trash Panda", "Chaos Demon", "Hot Mess", "Disaster",
  "Wine Aunt", "Beer Uncle", "Simp Lord", "Buffoon", "Numpty", "Wet Sock", "Couch Goblin", "Feral Raccoon", "Situationship", "Bad Decision",
  "Dumpster Fire", "Cryptid", "Nuisance", "Loose Cannon", "Dump Truck", "Badonkadonk", "Gas Station Sushi", "Divorced Dad", "Wet Bandit", "Sleep Paralysis Demon",
  "Final Boss", "Side Quest", "Red Flag", "Walking Ick", "Villain Origin Story", "Group Project", "Participation Trophy", "Emotional Support Goblin", "Absolute Unit", "Yapper"
];

var NAMES = [
  "Sir Yeets-a-Lot", "Baron von Cheeks", "Lil Sussy", "Big Chungus", "Moist Towelette", "Two Beers Deep",
  "Uncle at the BBQ", "Divorced Dad Energy", "Grandma's Boyfriend", "Hot Single In Your Area", "Certified Menace",
  "Local Cryptid", "Gyatt Enjoyer", "Rizz Goblin", "The Group Chat's Problem", "Emotional Damage",
  "Professional Yapper", "Dr. Sus, PhD", "Beloved Nuisance", "Reformed Gremlin", "Danger Noodle",
  "Feral But Friendly", "Menace II Society", "Goblin Mode Activated", "Barely Old Enough To Rent A Car",
  "Your Situationship", "Discount Wolverine", "Chaotic Neutral", "Two Snacks Away From A Nap", "Unsupervised"
];

function pick(a) {
  return a[Math.floor(Math.random() * a.length)];
}

function randomFunnyName() {
  return Math.random() < 0.4 ? pick(NAMES) : pick(ADJ) + " " + pick(NOUN);
}

function funnyNames(count) {
  var out = [];
  var seen = {};
  while (out.length < count) {
    var n = randomFunnyName();
    var guard = 0;
    while (seen[n] && guard++ < 40) n = randomFunnyName();
    if (seen[n]) n = n + " " + (out.length + 1);
    seen[n] = true;
    out.push(n);
  }
  return out;
}

exports.randomFunnyName = randomFunnyName;
exports.funnyNames = funnyNames;
