/**
 * Workflow registry.
 *
 * Bundled workflows are imported statically. User-added workflows are discovered
 * at runtime from the device filesystem (native) or skipped (web).
 *
 * To add a bundled workflow:
 *   1. Drop the JSON file into app/image_generation/workflows/
 *   2. Import it here and add an entry to BUNDLED_WORKFLOWS.
 */

import { loadUserWorkflows } from '@/lib/user-workflows';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const basicImage = require('@/app/image_generation/workflows/basic_image.json') as Record<string, WorkflowNode>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const basicFlux = require('@/app/image_generation/workflows/basic_flux.json') as Record<string, WorkflowNode>;

export type WorkflowNode = {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: { title?: string };
};

export type WorkflowEntry = {
  /** Unique key stored in settings */
  name: string;
  /** Human-readable label shown in the UI */
  label: string;
  workflow: Record<string, WorkflowNode>;
};

export const BUNDLED_WORKFLOWS: WorkflowEntry[] = [
  { name: 'basic_image', label: 'Basic Image', workflow: basicImage },
  { name: 'basic_flux',  label: 'Basic Flux',  workflow: basicFlux  },
];

/**
 * Return all available workflows: bundled defaults merged with any user-added
 * JSON files from the device filesystem. User workflows override bundled ones
 * of the same name.
 */
export async function loadWorkflows(): Promise<WorkflowEntry[]> {
  const userWorkflows = await loadUserWorkflows();
  const userNames = new Set(userWorkflows.map((w) => w.name));
  const merged = BUNDLED_WORKFLOWS.filter((w) => !userNames.has(w.name));
  return [...merged, ...userWorkflows];
}

/**
 * Return the workflow for the given name, falling back to the first bundled
 * workflow if not found.
 */
export async function getWorkflow(name: string | null): Promise<Record<string, WorkflowNode>> {
  const all = await loadWorkflows();
  return (all.find((w) => w.name === name) ?? all[0]).workflow;
}
