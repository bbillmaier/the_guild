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
    `You are writing a narrative moment at the end of a quest in an ongoing story called "${chain.name}".`,
    `Overarching premise: ${chain.premise}`,
    chain.storySoFar ? `Story so far:\n${chain.storySoFar}` : '',
    `What just happened: ${questNarrative.slice(0, 600)}`,
    failureNote,
    `Party members: ${partyNames.join(', ')}`,
    isFinal
      ? `This is the final quest in the chain. Write 2-3 sentences describing the conclusion — what the party discovered, what was resolved, and what scars or questions remain. Then ask the Guild Master one reflective question about how this ended.`
      : outcome === 'failure'
        ? `Write 2-3 sentences describing the consequences of their failure — what slipped through, what new threat emerges, or what the party learned at a cost. Then ask the Guild Master one question about how the party intends to press on.`
        : `Write 2-3 sentences describing what the party discovers at the end of this quest — a new clue, a revelation, or a complication that deepens the mystery. Then ask the Guild Master one question about how they will respond.`,
    `Keep it grounded and personal. Output only the narrative and question, nothing else.`,
  ].filter(Boolean).join('\n\n');

  try {
    const raw = await callKoboldApi(prompt, 300, 'The story takes a turn...');
    return raw.trim();
  } catch {
    return outcome === 'failure'
      ? 'The party retreated wounded, but the threat endures. What will you do next?'
      : 'The quest is complete, but questions remain. What will the guild do next?';
  }
}
