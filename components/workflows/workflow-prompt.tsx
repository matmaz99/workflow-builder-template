"use client";

import { useAtom } from "jotai";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  creatingProjectAtom,
  newProjectNameAtom,
  selectedProjectIdAtom,
  showNewProjectDialogAtom,
  vercelProjectsAtom,
  workflowPromptAtom,
} from "@/lib/atoms/vercel-projects";
import { useSession } from "@/lib/auth-client";
import { workflowApi } from "@/lib/workflow-api";

// Component to sync the provider's internal state with our Jotai atom
function PromptSync({ atomValue }: { atomValue: string }) {
  const controller = usePromptInputController();

  useEffect(() => {
    // Sync atom value to provider on mount and when atom changes
    if (controller.textInput.value !== atomValue) {
      controller.textInput.setInput(atomValue);
    }
  }, [atomValue, controller]);

  return null;
}

export function WorkflowPrompt() {
  // Local component state (doesn't need to persist)
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasVercelToken, setHasVercelToken] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Jotai atoms (shared state that persists across mounts)
  const [prompt, setPrompt] = useAtom(workflowPromptAtom);
  const [selectedProjectId, setSelectedProjectId] = useAtom(
    selectedProjectIdAtom
  );
  const [vercelProjects, setVercelProjects] = useAtom(vercelProjectsAtom);
  const [showNewProjectDialog, setShowNewProjectDialog] = useAtom(
    showNewProjectDialogAtom
  );
  const [newProjectName, setNewProjectName] = useAtom(newProjectNameAtom);
  const [creatingProject, setCreatingProject] = useAtom(creatingProjectAtom);

  const router = useRouter();
  const { data: session } = useSession();

  // Load Vercel projects when component mounts
  useEffect(() => {
    if (!session) return;

    const loadVercelProjects = async () => {
      try {
        const response = await fetch("/api/user/vercel-projects");
        if (response.ok) {
          const data = await response.json();
          setVercelProjects(data.projects || []);
          setHasVercelToken(true);
        } else if (response.status === 400) {
          // Vercel API token not configured
          setVercelProjects([]);
          setHasVercelToken(false);
        } else {
          // Other errors - silently fail
          setVercelProjects([]);
          setHasVercelToken(false);
        }
      } catch (error) {
        // Network or other errors - silently fail
        setVercelProjects([]);
        setHasVercelToken(false);
      }
    };

    loadVercelProjects();
  }, [session, setVercelProjects]);

  const handleProjectChange = (value: string) => {
    if (value === "new") {
      // Check if user has Vercel API token configured
      if (!hasVercelToken) {
        toast(
          <div className="flex flex-col gap-2">
            <p>Please configure your Vercel API token in settings first.</p>
            <Button
              onClick={() => router.push("/settings")}
              size="sm"
              variant="outline"
            >
              Go to Settings
            </Button>
          </div>,
          {
            duration: 5000,
          }
        );
        return;
      }
      setShowNewProjectDialog(true);
    } else {
      setSelectedProjectId(value);
    }
  };

  const handleCreateProject = async () => {
    // Check if already creating
    if (creatingProject) {
      toast.error("Already creating a project. Please wait.");
      return;
    }

    if (!newProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setCreatingProject(true);
    try {
      const response = await fetch("/api/user/vercel-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update the projects list
        setVercelProjects((prev) => [...prev, data.project]);

        // Select the newly created project
        setSelectedProjectId(data.project.id);

        // Close dialog and clear form
        setShowNewProjectDialog(false);
        setNewProjectName("");

        toast.success("Project created successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create project");
      }
    } catch (error) {
      toast.error("Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if already generating
    if (isGenerating) {
      toast.error("Already generating a workflow. Please wait.");
      throw new Error("Already generating");
    }

    // Check if prompt is empty
    if (!prompt.trim()) {
      toast.error("Please describe your workflow");
      throw new Error("Empty prompt");
    }

    // Check if user is logged in
    if (!session) {
      toast.error("Please log in to create workflows");
      // Redirect to login page
      router.push("/login");
      throw new Error("Not logged in");
    }

    // Check if a project is selected
    if (!selectedProjectId) {
      toast.error("Please select a project before creating a workflow");
      throw new Error("No project selected");
    }

    setIsGenerating(true);
    try {
      // Create empty workflow first
      const newWorkflow = await workflowApi.create({
        name: "AI Generated Workflow",
        description: `Generated from: ${prompt}`,
        nodes: [],
        edges: [],
        vercelProjectId: selectedProjectId,
      });

      // Store the prompt in sessionStorage for the workflow page to use
      sessionStorage.setItem("ai-prompt", prompt);
      sessionStorage.setItem("generating-workflow-id", newWorkflow.id);

      // Clear the prompt only after successful creation
      setPrompt("");

      // Navigate to the new workflow immediately
      router.push(`/workflows/${newWorkflow.id}?generating=true`);
    } catch (error) {
      toast.error("Failed to create workflow. Please try again.");
      setIsGenerating(false);
      throw error;
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <PromptInputProvider initialInput={prompt}>
        <PromptSync atomValue={prompt} />
        <PromptInput
          className="bg-background"
          globalDrop
          multiple
          onSubmit={(message, event) => handleGenerate(event)}
        >
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your workflow..."
              ref={textareaRef}
              value={prompt}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <Select
              onValueChange={handleProjectChange}
              value={selectedProjectId}
            >
              <SelectTrigger className="border-none shadow-none hover:bg-accent">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="text-primary" value="new">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>New Project</span>
                  </div>
                </SelectItem>
                {vercelProjects.length > 0 && <SelectSeparator />}
                {[...vercelProjects]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <PromptInputSubmit status="ready" />
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>

      {/* New Project Dialog */}
      <Dialog
        onOpenChange={setShowNewProjectDialog}
        open={showNewProjectDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Vercel Project</DialogTitle>
            <DialogDescription>
              Create a new local project entry. This will be stored in your
              database and can be linked to workflows.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateProject();
                  }
                }}
                placeholder="my-vercel-project"
                value={newProjectName}
              />
              <p className="text-muted-foreground text-xs">
                Enter a descriptive name for your project
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowNewProjectDialog(false);
                setNewProjectName("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject}>
              {creatingProject ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
