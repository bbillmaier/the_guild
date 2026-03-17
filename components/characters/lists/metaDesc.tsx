export type MetaDescStat =
  | 'intelligence'
  | 'wisdom'
  | 'charisma';

export type MetaDescription = {
  id: string;
  name: string;
  stat: MetaDescStat | null;
  mod: number | null;
  description: string;
};

export const metaDescriptions: MetaDescription[] = [
  {
    id: 'meta_dull',
    name: 'Dull',
    stat: 'intelligence',
    mod: -1,
    description: 'Slow to catch on and misses subtle details.',
  },
  {
    id: 'meta_sharp_mind',
    name: 'Sharp Mind',
    stat: 'intelligence',
    mod: 1,
    description: 'Quick thinker with excellent memory.',
  },
  {
    id: 'meta_hotheaded',
    name: 'Hotheaded',
    stat: 'wisdom',
    mod: -1,
    description: 'Acts on impulse before considering consequences.',
  },
  {
    id: 'meta_calm_focus',
    name: 'Calm Focus',
    stat: 'wisdom',
    mod: 1,
    description: 'Keeps composure and reads situations clearly.',
  },
  {
    id: 'meta_bravado',
    name: 'Bravado',
    stat: 'charisma',
    mod: 1,
    description: 'Projects confidence and commands attention.',
  },
  {
    id: 'meta_socially_awkward',
    name: 'Socially Awkward',
    stat: 'charisma',
    mod: -1,
    description: 'Struggles with timing, tone, and social cues.',
  },
  {
    id: 'meta_unbreakable_will',
    name: 'Unbreakable Will',
    stat: null,
    mod: null,
    description: 'Refuses to give up even in the worst conditions.',
  },
  {
    id: 'meta_haunted',
    name: 'Haunted',
    stat: null,
    mod: null,
    description: 'Carries unresolved memories that shape decisions.',
  },
  {
    id: 'meta_natural_leader',
    name: 'Natural Leader',
    stat: null,
    mod: null,
    description: 'People naturally look to this character for direction.',
  },
  {
    id: 'meta_lone_wolf',
    name: 'Lone Wolf',
    stat: null,
    mod: null,
    description: 'Prefers to operate independently over relying on others.',
  },
];
