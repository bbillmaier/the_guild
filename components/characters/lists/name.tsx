const maleFirstStarts = [
  'Al', 'Ar', 'Bal', 'Bel', 'Bor', 'Bran', 'Cal', 'Cor', 'Dar', 'Del', 'Ed', 'El', 'Fen', 'Gar',
  'Had', 'Hor', 'Ith', 'Jar', 'Kael', 'Kor', 'Laz', 'Lor', 'Mal', 'Mor', 'Nor', 'Or', 'Per', 'Quin',
  'Ral', 'Ren', 'Ser', 'Tal', 'Tor', 'Ul', 'Val', 'Vor', 'Wen', 'Xan', 'Yor', 'Zan',
];

const maleFirstEnds = [
  'an', 'ar', 'as', 'ath', 'dan', 'dar', 'den', 'dric', 'drin', 'ek', 'en', 'er', 'eth', 'ian',
  'ik', 'il', 'in', 'ion', 'is', 'or', 'orn', 'os', 'rak', 'ric', 'rin', 'ron', 'thas', 'thor',
  'tor', 'us',
];

const femaleFirstStarts = [
  'Ael', 'Ara', 'Bel', 'Bri', 'Cae', 'Cali', 'Dae', 'Dela', 'Eli', 'Elu', 'Fae', 'Fio', 'Gwe', 'Hela',
  'Ili', 'Isa', 'Jas', 'Kae', 'Kira', 'Lia', 'Luna', 'Mira', 'Nae', 'Nora', 'Ori', 'Phae', 'Qira',
  'Rina', 'Sera', 'Tali', 'Una', 'Vela', 'Wyna', 'Xira', 'Ys', 'Zara',
];

const femaleFirstEnds = [
  'a', 'ae', 'ara', 'ella', 'ena', 'enne', 'era', 'essa', 'eth', 'ia', 'iel', 'ielle', 'ina', 'ira',
  'is', 'issa', 'ith', 'ora', 'oria', 'riel', 'rine', 'sha', 'sra', 'tha', 'una', 'ya',
];

const lastStarts = [
  'Amber', 'Ash', 'Black', 'Bright', 'Bronze', 'Cinder', 'Cloud', 'Cold', 'Dawn', 'Deep', 'Dragon',
  'Dusk', 'Eagle', 'Ember', 'Even', 'Falcon', 'Frost', 'Glimmer', 'Gold', 'Gray', 'Green', 'Grim',
  'High', 'Hollow', 'Ice', 'Iron', 'Light', 'Long', 'Moon', 'Night', 'Oak', 'Quick', 'Raven', 'Red',
  'River', 'Shadow', 'Silver', 'Sky', 'Snow', 'Star', 'Steel', 'Stone', 'Storm', 'Sun', 'Swift',
  'Thorn', 'True', 'Umber', 'Vale', 'White', 'Wild', 'Wind', 'Winter', 'Wolf', 'Wyrm',
];

const lastEnds = [
  'bane', 'barrow', 'beck', 'blade', 'bloom', 'born', 'branch', 'brand', 'brook', 'crest', 'dale',
  'dancer', 'fall', 'field', 'fire', 'forge', 'gaze', 'guard', 'hall', 'haven', 'heart', 'helm',
  'keep', 'mane', 'mark', 'mere', 'mont', 'more', 'peak', 'rest', 'ridge', 'run', 'runner', 'scar',
  'seer', 'shield', 'song', 'spire', 'step', 'stride', 'thorn', 'vale', 'ward', 'watch', 'weaver',
  'whisper', 'wind', 'wing', 'wood', 'worth',
];

export const maleFirstNames = buildNames(maleFirstStarts, maleFirstEnds, 320);
export const femaleFirstNames = buildNames(femaleFirstStarts, femaleFirstEnds, 320);
export const lastNames = buildNames(lastStarts, lastEnds, 420);

export function generateRandomCharacterName(gender?: CharacterGender) {
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
export type CharacterGender = 'male' | 'female';
