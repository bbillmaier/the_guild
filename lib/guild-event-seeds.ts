export type GuildEventSeedEntry = {
  uid: string;
  text: string;
  relationshipDelta: number;
  useCommonQuest: boolean;
};

export const GUILD_EVENT_SEEDS: GuildEventSeedEntry[] = [
  {
    uid: 'guild_event_01', relationshipDelta: -1, useCommonQuest: false,
    text: 'Two characters nearly come to blows over a heated disagreement in the training yard before cooler heads prevail.',
  },
  {
    uid: 'guild_event_02', relationshipDelta: 1, useCommonQuest: false,
    text: 'The characters share a quiet meal together, conversation drifting to home, old friends, and what brought them to the guild.',
  },
  {
    uid: 'guild_event_03', relationshipDelta: 1, useCommonQuest: false,
    text: "Someone's equipment breaks during a training session. The others help repair it without being asked.",
  },
  {
    uid: 'guild_event_04', relationshipDelta: -1, useCommonQuest: false,
    text: 'A prank in the barracks backfires badly, leaving everyone involved embarrassed and not speaking.',
  },
  {
    uid: 'guild_event_05', relationshipDelta: 1, useCommonQuest: false,
    text: 'The characters find themselves awake in the small hours, unable to sleep, and end up talking quietly until dawn.',
  },
  {
    uid: 'guild_event_06', relationshipDelta: -1, useCommonQuest: false,
    text: 'A dispute over shared resources — food, coin, or supplies — turns into a tense standoff.',
  },
  {
    uid: 'guild_event_07', relationshipDelta: 1, useCommonQuest: false,
    text: 'One character teaches another a skill or trick they picked up on the road. The lesson goes better than expected.',
  },
  {
    uid: 'guild_event_08', relationshipDelta: 0, useCommonQuest: false,
    text: 'The characters are caught gossiping about guild politics. It grows awkward when the subject walks in.',
  },
  {
    uid: 'guild_event_09', relationshipDelta: 0, useCommonQuest: true,
    text: 'The characters gather to talk through a recent mission — what went wrong and what could have been done differently.',
  },
  {
    uid: 'guild_event_10', relationshipDelta: -1, useCommonQuest: true,
    text: 'Old tensions from a shared quest resurface unexpectedly. Words are said that are not easily taken back.',
  },
  {
    uid: 'guild_event_11', relationshipDelta: 1, useCommonQuest: true,
    text: 'The characters raise a quiet toast to what they survived together. The moment brings them unexpectedly close.',
  },
  {
    uid: 'guild_event_12', relationshipDelta: 0, useCommonQuest: false,
    text: 'A stranger asks about the guild. The characters give very different answers, which tells each of them something new about the others.',
  },
];
