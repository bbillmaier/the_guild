/**
 * Module-level serial queue for LLM requests.
 *
 * All calls to callKoboldApi are routed through here so the local LLM only
 * ever receives one request at a time. UI components subscribe to state changes
 * to show a busy indicator.
 */

export type QueueState = { busy: boolean; queued: number; currentLabel: string };

type Job = {
  fn: () => Promise<string>;
  label: string;
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
};

const _queue: Job[] = [];
let _running = false;
let _currentLabel = '';

type Listener = (state: QueueState) => void;
const _listeners = new Set<Listener>();

function _notify() {
  const state: QueueState = { busy: _running, queued: _queue.length, currentLabel: _currentLabel };
  for (const l of _listeners) l(state);
}

/** Subscribe to queue state changes. Returns an unsubscribe function. */
export function subscribeToQueue(listener: Listener): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

/** Read current state synchronously (for initializing hooks). */
export function getQueueState(): QueueState {
  return { busy: _running, queued: _queue.length, currentLabel: _currentLabel };
}

/** Enqueue an LLM job. Resolves/rejects when the job eventually runs. */
export function enqueueJob(fn: () => Promise<string>, label = 'Working...'): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    _queue.push({ fn, label, resolve, reject });
    _notify();
    void _drain();
  });
}

async function _drain() {
  // Single-threaded JS: no await between check and set, so this is race-free.
  if (_running) return;
  _running = true;

  while (_queue.length > 0) {
    const job = _queue.shift()!;
    _currentLabel = job.label;
    _notify();
    try {
      job.resolve(await job.fn());
    } catch (err) {
      job.reject(err);
    }
  }

  _running = false;
  _currentLabel = '';
  _notify();
}
