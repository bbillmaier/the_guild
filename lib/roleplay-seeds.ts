export type RoleplaySeed = {
  uid: string;
  text: string;
  category: 'general' | 'boss' | 'failure';
  relationshipDelta: number;
};

export const ROLEPLAY_SEEDS: RoleplaySeed[] = [
  // ── General ─────────────────────────────────────────────────────────────────
  {
    uid: 'roleplay_general_01', category: 'general', relationshipDelta: 1,
    text: '{{char1}} quietly tends to {{char2}}\'s wounds as the party rests, the two talking in low voices.',
  },
  {
    uid: 'roleplay_general_02', category: 'general', relationshipDelta: -1,
    text: '{{char1}} and {{char2}} disagree sharply over how to press on. Neither backs down easily.',
  },
  {
    uid: 'roleplay_general_03', category: 'general', relationshipDelta: 0,
    text: '{{char1}} cracks a dark joke to cut the tension. {{char2}} either laughs or doesn\'t.',
  },
  {
    uid: 'roleplay_general_04', category: 'general', relationshipDelta: 1,
    text: '{{char1}} confides something personal to {{char2}} about why they took this quest.',
  },
  {
    uid: 'roleplay_general_05', category: 'general', relationshipDelta: 1,
    text: '{{char1}} and {{char2}} swap stories from past adventures, finding unexpected common ground.',
  },
  {
    uid: 'roleplay_general_06', category: 'general', relationshipDelta: 0,
    text: 'The party notices something unsettling in their surroundings and reacts with uneasy curiosity.',
  },
  {
    uid: 'roleplay_general_07', category: 'general', relationshipDelta: 1,
    text: '{{char1}} checks on {{char2}}, who seems shaken after the last encounter. The concern is genuine.',
  },
  {
    uid: 'roleplay_general_08', category: 'general', relationshipDelta: 0,
    text: 'The group shares a brief moment of levity — a joke, a shared memory, a small act of kindness.',
  },
  {
    uid: 'roleplay_general_09', category: 'general', relationshipDelta: -1,
    text: '{{char1}} says something that lands badly with {{char2}}. The air between them tightens.',
  },
  {
    uid: 'roleplay_general_10', category: 'general', relationshipDelta: 0,
    text: 'The party debates what they\'ll do with the reward, each answer revealing something about who they are.',
  },

  // ── Boss ────────────────────────────────────────────────────────────────────
  {
    uid: 'roleplay_boss_01', category: 'boss', relationshipDelta: 0,
    text: 'The party gathers at the threshold of the final chamber, sharing brief words before the end.',
  },
  {
    uid: 'roleplay_boss_02', category: 'boss', relationshipDelta: 1,
    text: '{{char1}} and {{char2}} exchange a look — no words needed, just an acknowledgement of what\'s ahead.',
  },
  {
    uid: 'roleplay_boss_03', category: 'boss', relationshipDelta: 1,
    text: '{{char1}} says something honest to {{char2}} before the final door. It may be the last chance.',
  },
  {
    uid: 'roleplay_boss_04', category: 'boss', relationshipDelta: 1,
    text: '{{char1}} gives a brief, imperfect rallying speech. {{char2}} quietly takes it to heart.',
  },
  {
    uid: 'roleplay_boss_05', category: 'boss', relationshipDelta: 0,
    text: 'The party steels themselves together. Whatever differences remain, they set them aside for now.',
  },

  // ── Failure ─────────────────────────────────────────────────────────────────
  {
    uid: 'roleplay_failure_01', category: 'failure', relationshipDelta: 0,
    text: 'Battered and spent, the party tries to understand where it went wrong. No one wants to say it first.',
  },
  {
    uid: 'roleplay_failure_02', category: 'failure', relationshipDelta: -1,
    text: '{{char1}} looks at {{char2}} and says what neither wanted to admit — that a different call should have been made.',
  },
  {
    uid: 'roleplay_failure_03', category: 'failure', relationshipDelta: 1,
    text: '{{char1}} quietly takes the blame for how things unfolded. {{char2}} isn\'t sure what to say.',
  },
  {
    uid: 'roleplay_failure_04', category: 'failure', relationshipDelta: -1,
    text: '{{char1}} and {{char2}} retreat in tense silence. When one finally speaks, the other cuts them off.',
  },
  {
    uid: 'roleplay_failure_05', category: 'failure', relationshipDelta: 1,
    text: 'Humbled, {{char1}} and {{char2}} pick through what went wrong, finding it easier to say it side by side.',
  },
];
