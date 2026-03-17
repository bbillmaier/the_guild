/**
 * Module-level fire-and-forget queue for image generation tasks.
 *
 * Tasks are run one at a time. The queue lives at module scope so it survives
 * React component unmounts — navigating away does NOT cancel an in-progress
 * generation.
 *
 * Usage:
 *   enqueueImageGeneration('Generating outfit...', async () => {
 *     const path = await generateOutfitImage(character, outfit, items);
 *     await updateOutfitImage(outfit.id, path);
 *   });
 *
 * UI components subscribe to state changes to show a global status badge.
 */

export type GenerationState = {
  busy: boolean;
  queued: number;
  currentLabel: string;
};

type Task = {
  label: string;
  fn: () => Promise<void>;
};

const _queue: Task[] = [];
let _running = false;
let _currentLabel = '';

type Listener = (state: GenerationState) => void;
const _listeners = new Set<Listener>();

function _notify() {
  const state: GenerationState = {
    busy: _running,
    queued: _queue.length,
    currentLabel: _currentLabel,
  };
  for (const l of _listeners) l(state);
}

/** Subscribe to generation state changes. Returns an unsubscribe function. */
export function subscribeToGeneration(listener: Listener): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

/** Read current state synchronously (for initializing hooks). */
export function getGenerationState(): GenerationState {
  return { busy: _running, queued: _queue.length, currentLabel: _currentLabel };
}

/**
 * Enqueue an image generation task. The task runs in the background and the
 * caller does NOT need to await it — the Promise resolves immediately after
 * enqueueing.
 */
export function enqueueImageGeneration(label: string, fn: () => Promise<void>): void {
  _queue.push({ label, fn });
  _notify();
  void _drain();
}

async function _drain() {
  if (_running) return;
  _running = true;

  while (_queue.length > 0) {
    const task = _queue.shift()!;
    _currentLabel = task.label;
    _notify();
    try {
      await task.fn();
    } catch (err) {
      console.error('[generation-queue] task failed:', err);
    }
  }

  _running = false;
  _currentLabel = '';
  _notify();
}
