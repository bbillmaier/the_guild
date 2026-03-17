const maleFirstStarts = [
  'Bog', 'Brak', 'Drak', 'Dug', 'Gar', 'Grak', 'Griz', 'Gruk', 'Dok', 'Krag',
  'Kruk', 'Krug', 'Kur', 'Morg', 'Nag', 'Nar', 'Ruk', 'Skar', 'Skrag', 'Snag',
  'Thar', 'Thog', 'Thrak', 'Vrak', 'Worg', 'Zug',
];

const maleFirstEnds = [
  'ag', 'ak', 'ark', 'arz', 'ash', 'ek', 'eth', 'ik', 'ink', 'og',
  'ok', 'oth', 'rag', 'rug', 'ug', 'uk', 'unk', 'urk', 'urz', 'ush',
];

const femaleFirstStarts = [
  'Dra', 'Gra', 'Grix', 'Hex', 'Kira', 'Krix', 'Mara', 'Mora', 'Myx', 'Nira',
  'Nyx', 'Rix', 'Sha', 'Shara', 'Shrix', 'Vix', 'Vrax', 'Zel', 'Zala',
];

const femaleFirstEnds = [
  'ara', 'ax', 'brix', 'drax', 'ga', 'ira', 'ix', 'ka', 'mix', 'na',
  'nix', 'ora', 'ra', 'rix', 'sha', 'tha', 'vix', 'wix', 'za',
];

const lastStarts = [
  'Ash', 'Bile', 'Blood', 'Bone', 'Crag', 'Dark', 'Death', 'Dread', 'Fang', 'Grave',
  'Grim', 'Gut', 'Hate', 'Hell', 'Iron', 'Mire', 'Mud', 'Night', 'Pain', 'Rage',
  'Ruin', 'Rust', 'Shadow', 'Skull', 'Slime', 'Snarl', 'Stone', 'Swamp', 'Vile', 'War',
  'Wrath',
];

const lastEnds = [
  'bite', 'brand', 'breaker', 'claw', 'crusher', 'fang', 'gnaw', 'gore', 'gut', 'hide',
  'jaw', 'maul', 'maw', 'rend', 'rot', 'scar', 'shank', 'skull', 'slash', 'smash',
  'snarl', 'spike', 'stomp', 'tear', 'tusk', 'venom', 'wail', 'wound',
];

export type EnemyGender = 'male' | 'female';

const maleFirstNames = buildNames(maleFirstStarts, maleFirstEnds, 320);
const femaleFirstNames = buildNames(femaleFirstStarts, femaleFirstEnds, 320);
const lastNames = buildNames(lastStarts, lastEnds, 420);

export function generateRandomEnemyName(gender?: EnemyGender) {
  const selectedGender = gender ?? (Math.random() < 0.5 ? 'male' : 'female');
  const firstPool = selectedGender === 'male' ? maleFirstNames : femaleFirstNames;
  const firstName = pickRandom(firstPool);
  const lastName = pickRandom(lastNames);
  return `${firstName} ${lastName}`;
}

function pickRandom(values: string[]) {
  return values[Math.floor(Math.random() * values.length)];
}

function buildNames(starts: string[], ends: string[], limit: number) {
  const names: string[] = [];
  for (const start of starts) {
    for (const end of ends) {
      names.push(`${start}${end}`);
      if (names.length >= limit) {
        return names;
      }
    }
  }

  return names;
}
