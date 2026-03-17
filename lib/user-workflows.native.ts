import * as FileSystem from 'expo-file-system';

import type { WorkflowEntry, WorkflowNode } from '@/lib/workflows';

const WORKFLOWS_DIR = `${FileSystem.documentDirectory}workflows/`;

/**
 * Scan the device's workflows directory for user-added JSON files.
 * Returns an empty array if the directory doesn't exist or on any error.
 */
export async function loadUserWorkflows(): Promise<WorkflowEntry[]> {
  try {
    const info = await FileSystem.getInfoAsync(WORKFLOWS_DIR);
    if (!info.exists) return [];

    const files = await FileSystem.readDirectoryAsync(WORKFLOWS_DIR);
    const entries: WorkflowEntry[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await FileSystem.readAsStringAsync(`${WORKFLOWS_DIR}${file}`);
        const workflow = JSON.parse(content) as Record<string, WorkflowNode>;
        const name = file.replace(/\.json$/, '');
        const label = name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        entries.push({ name, label, workflow });
      } catch {
        // skip invalid / unparseable files
      }
    }

    return entries;
  } catch {
    return [];
  }
}
