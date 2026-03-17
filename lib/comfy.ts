/**
 * ComfyUI image generation utility.
 *
 * Workflow-agnostic: scans the selected workflow JSON for a known model-loader
 * node type and uses that to both list available models and inject the selected
 * model at generation time.
 */

import { callKoboldApi } from '@/components/LLM/kobold';
import { updateCharacterAvatarPath, updateOutfitImage, type GuildCharacter, type OutfitSet, type OutfitItem } from '@/lib/local-db';
import { getSetting, COMFY_BASE_URL_KEY, COMFY_MODEL_KEY, COMFY_WORKFLOW_KEY, FLUX_IMAGE_EDIT_KEY } from '@/lib/settings';
import { saveImageToFolder } from '@/lib/file-save';
import { getWorkflow, type WorkflowNode } from '@/lib/workflows';
import { readAvatarBase64 } from '@/lib/upload-to-comfy';

export const defaultComfyBase = 'http://localhost:8188';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

// ─── Known model-loader node types ────────────────────────────────────────────
// Maps ComfyUI class_type → the input field that holds the model filename.
// Add entries here as new loader types are encountered.

const LOADER_FIELD: Record<string, string> = {
  UNETLoader:                'unet_name',
  CheckpointLoaderSimple:    'ckpt_name',
  CheckpointLoader:          'ckpt_name',
  unCLIPCheckpointLoader:    'ckpt_name',
  DiffusersLoader:           'model_path',
  HypernetworkLoader:        'hypernetwork_name',
};

type LoaderInfo = { nodeId: string; nodeType: string; field: string };

/** Scan a workflow and return the first recognised model-loader node, or null. */
function findModelLoader(workflow: Record<string, WorkflowNode>): LoaderInfo | null {
  for (const [nodeId, node] of Object.entries(workflow)) {
    const field = LOADER_FIELD[node.class_type];
    if (field) return { nodeId, nodeType: node.class_type, field };
  }
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ComfyImage = { filename: string; subfolder: string; type: string };
type HistoryEntry = { outputs: Record<string, { images?: ComfyImage[] }> };

function escapeForJson(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

async function getBase(): Promise<string> {
  const saved = await getSetting(COMFY_BASE_URL_KEY);
  return saved?.trim() || defaultComfyBase;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the list of models available for whichever loader node type the
 * currently selected workflow uses.
 */
export async function listComfyModels(): Promise<string[]> {
  const [base, workflowName] = await Promise.all([
    getBase(),
    getSetting(COMFY_WORKFLOW_KEY),
  ]);

  const workflow = await getWorkflow(workflowName);
  const loader = findModelLoader(workflow);
  if (!loader) throw new Error('No recognised model-loader node found in the selected workflow.');

  const res = await fetch(`${base}/object_info/${loader.nodeType}`);
  if (!res.ok) throw new Error(`ComfyUI returned ${res.status} for /object_info/${loader.nodeType}`);

  const data = (await res.json()) as Record<string, {
    input?: { required?: Record<string, [unknown[]]> };
  }>;

  const models = data[loader.nodeType]?.input?.required?.[loader.field]?.[0];
  if (!Array.isArray(models) || models.length === 0) {
    throw new Error(`No models found for ${loader.nodeType} on the ComfyUI server.`);
  }
  return models as string[];
}

/**
 * Generate an image from a text prompt using ComfyUI.
 *
 * @param prompt          The positive text prompt.
 * @param saveSubfolder   Where to save the image. Defaults to 'images'.
 * @param outputBasename  Optional filename base without extension (e.g. 'avatar').
 * @returns  Local file path on native, or remote view URL on web.
 */
export async function generateImage(
  prompt: string,
  saveSubfolder = 'images',
  outputBasename?: string,
): Promise<string> {
  const [base, selectedModel, workflowName] = await Promise.all([
    getBase(),
    getSetting(COMFY_MODEL_KEY),
    getSetting(COMFY_WORKFLOW_KEY),
  ]);

  // Inject prompt placeholder
  const workflowStr = JSON.stringify(await getWorkflow(workflowName)).replace(
    '%prompt%',
    escapeForJson(prompt),
  );
  const workflow = JSON.parse(workflowStr) as Record<string, WorkflowNode>;

  // Inject selected model into whichever loader node the workflow uses
  if (selectedModel) {
    const loader = findModelLoader(workflow);
    if (loader) {
      workflow[loader.nodeId].inputs[loader.field] = selectedModel;
    }
  }

  // Queue the prompt
  const queueRes = await fetch(`${base}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!queueRes.ok) {
    throw new Error(`ComfyUI queue request failed with status ${queueRes.status}.`);
  }
  const { prompt_id: promptId } = (await queueRes.json()) as { prompt_id: string };

  const image = await pollForResult(base, promptId);

  const imageUrl =
    `${base}/view?filename=${encodeURIComponent(image.filename)}` +
    `&subfolder=${encodeURIComponent(image.subfolder)}` +
    `&type=output`;

  const ext = image.filename.split('.').pop() ?? 'png';
  const filename = outputBasename ? `${outputBasename}.${ext}` : `${Date.now()}_${image.filename}`;
  return saveImageToFolder(imageUrl, saveSubfolder, filename);
}

async function pollForResult(base: string, promptId: string): Promise<ComfyImage> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    let history: Record<string, HistoryEntry>;
    try {
      const res = await fetch(`${base}/history/${promptId}`);
      if (!res.ok) continue;
      history = (await res.json()) as Record<string, HistoryEntry>;
    } catch {
      continue;
    }

    const entry = history[promptId];
    if (!entry) continue;

    for (const output of Object.values(entry.outputs ?? {})) {
      if (output.images && output.images.length > 0) return output.images[0];
    }
  }

  throw new Error('ComfyUI generation timed out after 5 minutes.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Race base descriptions ────────────────────────────────────────────────────
// Used to help diffusion models that don't recognise niche D&D race names.
// Prepended to image prompts so the model knows the creature's appearance.

const RACE_BASE_DESCRIPTIONS: Partial<Record<string, string>> = {
  aarakocra:   'avian humanoid with a bird-like beaked face, covered in feathers, with large wings',
  aasimar:     'celestial-touched humanoid with a faint divine glow, luminescent or silver eyes, and an otherworldly serene beauty',
  changeling:  'pale shapeshifter with soft undefined features, quicksilver eyes, and an unsettling blank expression',
  centaur:     'half-human half-horse creature with a human torso emerging from a powerful horse body',
  dragonborn:  'tall draconic humanoid with scales covering their entire body, a reptilian face with no hair, and a muscular build',
  eladrin:     'ethereal fey elf with subtly shifting otherworldly features and a faint seasonal aura',
  fairy:       'tiny winged fey humanoid with delicate insect-like wings and vibrant colorful features',
  firbolg:     'large gentle giant-kin humanoid with a broad frame, slightly bovine facial features, and earthy muted tones',
  genasi:      'elemental-touched humanoid whose body reflects their element — fire genasi have flickering ember hair and heated skin; water genasi have flowing aquamarine skin; earth genasi have stone-like patches on their skin; air genasi have translucent pale skin and windswept features',
  goblin:      'small green-skinned creature with large bat-like ears, wide yellow eyes, and a wiry slight build',
  goliath:     'massive grey-skinned humanoid towering over others, with natural stone-like mottled markings across their skin',
  harengon:    'rabbit-like humanoid with large upright ears, a twitching nose, long digitigrade legs, and fur covering their body',
  hobgoblin:   'militaristic humanoid with flat orange-red skin, a broad flat face, and a disciplined stern bearing',
  kobold:      'small reptilian creature with small scales, a pointed snout, large eyes, and a hunched slight frame',
  leonin:      'proud lion-like humanoid covered in tawny fur with a flowing mane and feline facial features',
  lizardfolk:  'reptilian humanoid covered in scales with a long neck, a lizard-like head, and a long heavy tail',
  minotaur:    'massive powerful humanoid with the horned head of a bull on a heavily muscular humanoid body',
  satyr:       'half-human creature with a human upper body, small curved horns on their head, and furry goat legs',
  'shadar-kai':'shadow-touched elf with ashen grey skin, dark sunken circles under their eyes, and a gaunt haunting appearance',
  tabaxi:      'lithe cat-like humanoid covered in spotted or striped fur with distinctly feline facial features and a long slender tail',
  tortle:      'tortoise-like humanoid with a large domed shell on their back, a reptilian beak-like mouth, and a stocky frame',
  triton:      'ocean-dwelling humanoid with blue-green or silver skin, slightly webbed hands, and flowing sea-coloured hair',
  warforged:   'humanoid construct of wood and dark metal plates with a faceted angular face and mechanical joints, no biological features',
  'yuan-ti':   'serpentine humanoid with scales and distinctly snake-like facial features, cold calculating slit-pupil eyes',
};

/** Returns a parenthetical race description to inject into image prompts, or empty string. */
function getRaceDesc(race: string): string {
  const desc = RACE_BASE_DESCRIPTIONS[race.toLowerCase()];
  return desc ? ` (${desc})` : '';
}

// ─── Character avatar generation ──────────────────────────────────────────────

export async function generateCharacterAvatar(character: GuildCharacter): Promise<string> {
  const physTraits = character.physDesc.join(', ');
  const metaTraits = character.metaDesc.join(', ');

  const llmPrompt = [
    `Write a concise visual description for an AI image generator of this fantasy character.`,
    `Only describe their physical appearance and their clothing`,
    ``,
    `Name: ${character.characterName}`,
    `Gender: ${character.gender}`,
    `Race: ${character.race}${getRaceDesc(character.race)}`,
    `Class: ${character.className}`,
    physTraits ? `Physical traits: ${physTraits}` : '',
    character.baseDescription ? `Description: ${character.baseDescription}` : '',
  ].filter(Boolean).join('\n');

  const prefix = `A professional photograph of ${character.characterName}. This is a photograph of a medieval ${character.gender} ${character.race}${getRaceDesc(character.race)} ${character.className}`;
  const suffix = `The background is an empty medieval tavern.`;
  let imagePrompt: string;
  try {
    const raw = await callKoboldApi(llmPrompt, 200, `${character.characterName}: writing portrait prompt...`);
    imagePrompt = prefix + (raw.trim() || `${character.gender} ${character.race} ${character.className}, fantasy portrait `) + suffix;
  } catch {
    imagePrompt = prefix + `${character.gender} ${character.race} ${character.className}, fantasy portrait`;
  }

  const avatarPath = await generateImage(
    imagePrompt,
    `images/characters/${character.uid}`,
    'avatar',
  );

  // Append a timestamp so the browser doesn't serve the cached previous avatar
  // when the same URL is reused after a regeneration.
  const avatarPathBusted = `${avatarPath}?t=${Date.now()}`;
  await updateCharacterAvatarPath(character.uid, avatarPathBusted);
  return avatarPathBusted;
}

// ─── Scene image generation ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fluxEditWorkflow = require('@/app/image_generation/workflows/image_edit/flux_with_char_input.json') as Record<string, WorkflowNode>;



/**
 * Generate an image of the character in the current scene.
 *
 * Character appearance is built directly from physDesc / baseDescription / race data
 * (same approach as generateOutfitImage). The LLM is used only to extract a brief
 * pose/expression/setting sentence from the recent conversation.
 *
 * - Flux image edit ON:  uploads the character's avatar as the reference image and
 *   uses flux_with_char_input.json.
 * - Flux image edit OFF: full character description + scene using the selected workflow.
 */
export async function generateSceneImage(
  character: GuildCharacter,
  recentMessages: { role: string; text: string }[],
  saveSubfolder = 'images/scenes',
): Promise<string> {
  const base = await getBase();
  const fluxEdit = (await getSetting(FLUX_IMAGE_EDIT_KEY)) === 'true';

  const sceneCtx = recentMessages.slice(-6)
    .map((m) => m.role === 'player' ? `Guild Master: ${m.text}` : `${character.characterName}: ${m.text}`)
    .join('\n');

  const genderNoun = character.gender === 'female' ? 'woman' : 'man';

  // Character appearance from data — same as generateOutfitImage
  const physTraits = character.physDesc.length > 0 ? character.physDesc.join(', ') + '.' : '';
  const baseDesc = character.baseDescription ? character.baseDescription + '.' : '';
  const characterDesc = [physTraits, baseDesc].filter(Boolean).join(' ');

  // Ask the LLM only for the scene context: pose, expression, setting.
  // Do NOT ask it to describe physical appearance — that comes from data.
  const llmPrompt = [
    `Based on the following conversation, write one sentence describing what ${character.characterName} is doing right now.`,
    `Cover their pose, expression, and immediate surroundings. Medieval fantasy setting only — no modern references.`,
    `Do not describe their physical appearance or clothing. Output only the sentence.`,
    ``,
    `Conversation:`,
    sceneCtx,
  ].join('\n');

  const fallbackScene = `standing in a medieval guild hall, looking composed`;

  let sceneDesc: string;
  try {
    const raw = await callKoboldApi(llmPrompt, 80, 'Generating scene image...');
    sceneDesc = raw.trim() || fallbackScene;
  } catch {
    sceneDesc = fallbackScene;
  }

  const outputName = `${Date.now()}_scene`;

  if (fluxEdit && character.avatarPath) {
    const imagePrompt = [
      `An image of this ${genderNoun}.`,
      characterDesc,
      sceneDesc,
      `Their hair, body shape, face and background remain unchanged.`,
    ].filter(Boolean).join(' ');

    const base64 = await readAvatarBase64(character.avatarPath);
    const workflowStr = JSON.stringify(fluxEditWorkflow)
      .replace('%prompt%', escapeForJson(imagePrompt))
      .replace('%data%', base64);
    const workflow = JSON.parse(workflowStr) as Record<string, WorkflowNode>;

    const selectedModel = await getSetting(COMFY_MODEL_KEY);
    if (selectedModel) {
      const loader = findModelLoader(workflow);
      if (loader) workflow[loader.nodeId].inputs[loader.field] = selectedModel;
    }

    const queueRes = await fetch(`${base}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });
    if (!queueRes.ok) throw new Error(`ComfyUI queue failed with status ${queueRes.status}`);
    const { prompt_id: promptId } = await queueRes.json() as { prompt_id: string };

    const image = await pollForResult(base, promptId);
    const imageUrl =
      `${base}/view?filename=${encodeURIComponent(image.filename)}` +
      `&subfolder=${encodeURIComponent(image.subfolder)}&type=output`;
    const ext = image.filename.split('.').pop() ?? 'png';
    return saveImageToFolder(imageUrl, `${saveSubfolder}/${character.uid}`, `${outputName}.${ext}`);
  }

  // Standard generation: full character description anchored to data + scene context
  const imagePrompt = [
    `A professional photograph of ${character.characterName}.`,
    `Medieval ${character.gender} ${character.race}${getRaceDesc(character.race)} ${character.className}.`,
    characterDesc,
    sceneDesc,
    `Fantasy portrait. Medieval setting.`,
  ].filter(Boolean).join(' ');

  return generateImage(imagePrompt, `${saveSubfolder}/${character.uid}`, outputName);
}

// ─── Outfit image generation ───────────────────────────────────────────────────

const OUTFIT_EXCLUDED_SLOTS = new Set(['weapon', 'offhand']);

/**
 * Generate an image of a character wearing a specific outfit.
 * Weapon and offhand slots are excluded (image generators handle them poorly).
 * If flux edit is enabled, uses the character's existing avatar as the base image.
 */
export async function generateOutfitImage(
  character: GuildCharacter,
  outfit: OutfitSet,
  outfitItems: OutfitItem[],
): Promise<string> {
  const base = await getBase();
  const fluxEdit = (await getSetting(FLUX_IMAGE_EDIT_KEY)) === 'true';
  const genderNoun = character.gender === 'female' ? 'woman' : 'man';

  // Build the prompt directly from data — don't rely on the LLM to reproduce
  // the item list faithfully. Local LLMs tend to ignore or paraphrase it.
  const wearableItems = outfitItems.filter((i) => !OUTFIT_EXCLUDED_SLOTS.has(i.slot));

  // Clothing description: "slot: item name" pairs, e.g. "head: iron helmet, chest: chainmail shirt"
  const clothingParts = wearableItems.map((i) => {
    const detail = i.description ? ` (${i.description})` : '';
    return `${i.name}${detail}`;
  });
  const clothingDesc = clothingParts.length > 0
    ? `Wearing: ${clothingParts.join(', ')}.`
    : 'Wearing simple traveller clothing.';

  // Physical traits from character data
  const physTraits = character.physDesc.length > 0 ? character.physDesc.join(', ') + '.' : '';
  const baseDesc = character.baseDescription ? character.baseDescription + '.' : '';

  const characterDesc = [physTraits, baseDesc].filter(Boolean).join(' ');

  const saveSubfolder = `images/characters/${character.uid}`;
  const outputName = `outfit_${outfit.id}`;

  let imagePath: string;

  if (fluxEdit && character.avatarPath) {
    // Flux edit: describe the outfit change, preserve character appearance
    const imagePrompt = `An image of this ${genderNoun}. ${clothingDesc} ${characterDesc} Their hair, body shape, face and background remain unchanged.`.trim();
    const base64 = await readAvatarBase64(character.avatarPath);
    const workflowStr = JSON.stringify(fluxEditWorkflow)
      .replace('%prompt%', escapeForJson(imagePrompt))
      .replace('%data%', base64);
    const workflow = JSON.parse(workflowStr) as Record<string, WorkflowNode>;
    const selectedModel = await getSetting(COMFY_MODEL_KEY);
    if (selectedModel) {
      const loader = findModelLoader(workflow);
      if (loader) workflow[loader.nodeId].inputs[loader.field] = selectedModel;
    }
    const queueRes = await fetch(`${base}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });
    if (!queueRes.ok) throw new Error(`ComfyUI queue failed with status ${queueRes.status}`);
    const { prompt_id: promptId } = (await queueRes.json()) as { prompt_id: string };
    const image = await pollForResult(base, promptId);
    const imageUrl =
      `${base}/view?filename=${encodeURIComponent(image.filename)}` +
      `&subfolder=${encodeURIComponent(image.subfolder)}&type=output`;
    const ext = image.filename.split('.').pop() ?? 'png';
    imagePath = await saveImageToFolder(imageUrl, saveSubfolder, `${outputName}.${ext}`);
  } else {
    // Standard generation: full character description + explicit outfit items
    const imagePrompt = [
      `A professional photograph of ${character.characterName}.`,
      `Medieval ${character.gender} ${character.race}${getRaceDesc(character.race)} ${character.className}.`,
      characterDesc,
      clothingDesc,
      `Fantasy portrait. Medieval setting.`,
    ].filter(Boolean).join(' ');

    imagePath = await generateImage(imagePrompt, saveSubfolder, outputName);
  }

  await updateOutfitImage(outfit.id, imagePath);
  return imagePath;
}
