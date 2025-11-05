import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export interface VercelProject {
  id: string;
  name: string;
  vercelProjectId: string;
}

// Atoms for Vercel project state
// Using atomWithStorage to persist across page refreshes
export const vercelProjectsAtom = atomWithStorage<VercelProject[]>(
  "vercel-projects",
  []
);
export const selectedProjectIdAtom = atomWithStorage<string>(
  "selected-project-id",
  ""
);

// Workflow prompt state (persists in local storage)
export const workflowPromptAtom = atomWithStorage<string>(
  "workflow-prompt",
  ""
);

// UI state atoms (don't need to persist)
export const showNewProjectDialogAtom = atom<boolean>(false);
export const newProjectNameAtom = atom<string>("");
export const creatingProjectAtom = atom<boolean>(false);
