// Auto-assigned player names: cheeky / adult-humour, but strictly no profanity.
// Kept in sync by hand with server/funnyNames.js.

const ADJ = [
  'Sneaky', 'Sweaty', 'Thicc', 'Feral', 'Cursed', 'Sussy', 'Moist', 'Unhinged', 'Chaotic', 'Crusty',
  'Rancid', 'Menacing', 'Cheeky', 'Salty', 'Spicy', 'Deranged', 'Flatulent', 'Nefarious', 'Greasy', 'Sticky',
  'Slippery', 'Suspicious', 'Forbidden', 'Concerning', 'Feisty', 'Rowdy', 'Naughty', 'Chonky', 'Tipsy', 'Goblin',
  'Bootylicious', 'Discount', 'Bargain-Bin', 'Off-Brand', 'Haunted', 'Emotionally Unstable', 'Deeply Confused',
  'Legally Distinct', 'Aggressively Average', 'Chronically Online',
];

const NOUN = [
  'Goblin', 'Gremlin', 'Menace', 'Degenerate', 'Rascal', 'Scoundrel', 'Trash Panda', 'Chaos Demon', 'Hot Mess', 'Disaster',
  'Wine Aunt', 'Beer Uncle', 'Simp Lord', 'Buffoon', 'Numpty', 'Wet Sock', 'Couch Goblin', 'Feral Raccoon', 'Situationship', 'Bad Decision',
  'Dumpster Fire', 'Cryptid', 'Nuisance', 'Loose Cannon', 'Dump Truck', 'Badonkadonk', 'Gas Station Sushi', 'Divorced Dad', 'Wet Bandit', 'Sleep Paralysis Demon',
  'Final Boss', 'Side Quest', 'Red Flag', 'Walking Ick', 'Villain Origin Story', 'Group Project', 'Participation Trophy', 'Emotional Support Goblin', 'Absolute Unit', 'Yapper',
];

const NAMES = [
  'Sir Yeets-a-Lot', 'Baron von Cheeks', 'Lil Sussy', 'Big Chungus', 'Moist Towelette', 'Two Beers Deep',
  'Uncle at the BBQ', 'Divorced Dad Energy', "Grandma's Boyfriend", 'Hot Single In Your Area', 'Certified Menace',
  'Local Cryptid', 'Gyatt Enjoyer', 'Rizz Goblin', "The Group Chat's Problem", 'Emotional Damage',
  'Professional Yapper', 'Dr. Sus, PhD', 'Beloved Nuisance', 'Reformed Gremlin', 'Danger Noodle',
  'Feral But Friendly', 'Menace II Society', 'Goblin Mode Activated', 'Barely Old Enough To Rent A Car',
  'Your Situationship', 'Discount Wolverine', 'Chaotic Neutral', 'Two Snacks Away From A Nap', 'Unsupervised',
];

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

export function randomFunnyName(): string {
  return Math.random() < 0.4 ? pick(NAMES) : `${pick(ADJ)} ${pick(NOUN)}`;
}

// `count` distinct funny names, for seeding a whole lobby at once.
export function funnyNames(count: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  while (out.length < count) {
    let n = randomFunnyName();
    let guard = 0;
    while (seen.has(n) && guard++ < 40) n = randomFunnyName();
    if (seen.has(n)) n = `${n} ${out.length + 1}`;
    seen.add(n);
    out.push(n);
  }
  return out;
}
