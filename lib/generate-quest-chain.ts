import { callKoboldApi } from '@/components/LLM/kobold';
import type { QuestChain } from '@/lib/local-db';

function trimToLastSentence(text: string): string {
  const match = text.match(/^.*[.!?]/s);
  return match ? match[0].trim() : text.trim();
}

/**
 * Generate the name and premise for a new quest chain.
 * Called once when a chain is first created — before the first quest is generated.
 */
export async function generateChainPremise(
  biome: string,
  onStep?: (s: string) => void,
): Promise<{ name: string; premise: string }> {
  onStep?.('A greater story begins to unfold...');

  const nameRaw = await callKoboldApi(
    `Give a short dramatic title (3-5 words) for a fantasy quest chain set in a ${biome.toLowerCase()}. Examples: "The Ashen Hand Affair", "Rise of the Hollow King", "The Serpent's Debt". Output only the title — no quotes, no punctuation at the end.`,
    12,
    'Chain: naming the story...',
  );
  const name = nameRaw.trim().replace(/^["']|["']$|[.!?]$/g, '').trim();

  const premiseRaw = await callKoboldApi(
    `Write a 2-3 sentence fantasy mystery premise for a quest chain called "${name}" set in a ${biome.toLowerCase()}. Introduce a hidden threat, hint at a partial clue adventurers might uncover, and leave the antagonist's full identity or plan unknown. This will unfold across 2-3 connected quests. Output only the premise.`,
    200,
    'Chain: writing premise...',
  );
  const premise = trimToLastSentence(premiseRaw.trim());

  return { name, premise };
}

/**
 * Generate the pivot scene shown to the player after a chain quest completes.
 * Describes what the party discovers, then asks how they will respond.
 * On failure, the framing is darker but the story continues.
 */
export async function generateChainPivot(
  chain: QuestChain,
  questNarrative: string,
  outcome: 'success' | 'failure',
  partyNames: string[],
  onStep?: (s: string) => void,
): Promise<string> {
  onStep?.('The story takes a turn...');

  const isFinal = chain.depth >= chain.maxDepth;
  const failureNote = outcome === 'failure'
    ? 'The party failed this quest — they were driven back, wounded and unsuccessful. The threat was not stopped.'
    : '';

  const prompt = [
    `You are writing a decision point at the end of a quest in an ongoing story called "${chain.name}".`,
    `Overarching premise: ${chain.premise}`,
    chain.storySoFar ? `Story so far:\n${chain.storySoFar}` : '',
    `What just happened: ${questNarrative.slice(0, 600)}`,
    failureNote,
    `Party members: ${partyNames.join(', ')}`,
    isFinal
      ? `This is the final quest in the chain. Write 2-3 sentences describing the conclusion — what the party discovered, what was resolved, and what scars or questions remain. Then ask the Guild Master one reflective question about how this ended. Output only the conclusion and question.`
      : outcome === 'failure'
        ? `Write 1-2 sentences describing the consequences of their failure — what slipped through or what new threat emerges. Then present exactly 3 numbered choices for how the guild can respond to this setback. Each choice should be a concrete course of action (one sentence each). End with: "Or describe your own course of action." Output only the consequence and choices.`
        : `Write 1-2 sentences describing what the party discovers or learns at the end of this quest. Then present exactly 3 numbered choices for how the guild can follow up on this lead. Each choice should be a concrete course of action (one sentence each). End with: "Or describe your own course of action." Output only the discovery and choices.`,
  ].filter(Boolean).join('\n\n');

  try {
    const raw = await callKoboldApi(prompt, 350, 'The story takes a turn...');
    return raw.trim();
  } catch {
    return outcome === 'failure'
      ? 'The party retreated wounded, but the threat endures.\n\n1. Push back immediately with a fresh assault.\n2. Regroup and gather more information first.\n3. Seek outside help before pressing on.\n\nOr describe your own course of action.'
      : 'The quest is complete, but questions remain.\n\n1. Follow the trail before it goes cold.\n2. Investigate the lead from a different angle.\n3. Prepare carefully before the next move.\n\nOr describe your own course of action.';
  }
}
