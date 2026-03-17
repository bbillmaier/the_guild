import type { WorkflowEntry } from '@/lib/workflows';

/** Web: no filesystem access — only bundled workflows are available. */
export async function loadUserWorkflows(): Promise<WorkflowEntry[]> {
  return [];
}
