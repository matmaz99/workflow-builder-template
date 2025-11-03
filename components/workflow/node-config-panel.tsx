'use client';

import { useAtom, useSetAtom } from 'jotai';
import {
  selectedNodeAtom,
  nodesAtom,
  updateNodeDataAtom,
  deleteNodeAtom,
  isGeneratingAtom,
} from '@/lib/workflow-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TriggerConfig } from './config/trigger-config';
import { ActionConfig } from './config/action-config';
import { AvailableOutputs } from './available-outputs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function NodeConfigPanel() {
  const [selectedNodeId, setSelectedNodeId] = useAtom(selectedNodeAtom);
  const [nodes] = useAtom(nodesAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const deleteNode = useSetAtom(deleteNodeAtom);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  const handleUpdateLabel = (label: string) => {
    if (selectedNode) {
      updateNodeData({ id: selectedNode.id, data: { label } });
    }
  };

  const handleUpdateDescription = (description: string) => {
    if (selectedNode) {
      updateNodeData({ id: selectedNode.id, data: { description } });
    }
  };

  const handleUpdateConfig = (key: string, value: string) => {
    if (selectedNode) {
      const newConfig = { ...selectedNode.data.config, [key]: value };
      updateNodeData({ id: selectedNode.id, data: { config: newConfig } });
    }
  };

  const handleDelete = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    }
  };

  const handleClose = () => {
    setSelectedNodeId(null);
  };

  // Shared content for both mobile (Sheet) and desktop (Card)
  const panelContent = selectedNode ? (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            value={selectedNode.data.label}
            onChange={(e) => handleUpdateLabel(e.target.value)}
            disabled={isGenerating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={selectedNode.data.description || ''}
            onChange={(e) => handleUpdateDescription(e.target.value)}
            placeholder="Optional description"
            disabled={isGenerating}
          />
        </div>

        {/* Show available outputs from previous nodes */}
        {(selectedNode.data.type === 'action' ||
          selectedNode.data.type === 'condition' ||
          selectedNode.data.type === 'transform') && <AvailableOutputs />}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Configuration</Label>
          <div className="space-y-2">
            {selectedNode.data.type === 'trigger' && (
              <TriggerConfig
                config={selectedNode.data.config || {}}
                onUpdateConfig={handleUpdateConfig}
                disabled={isGenerating}
              />
            )}

            {selectedNode.data.type === 'action' && (
              <ActionConfig
                config={selectedNode.data.config || {}}
                onUpdateConfig={handleUpdateConfig}
                disabled={isGenerating}
              />
            )}

            {selectedNode.data.type === 'condition' && (
              <div className="space-y-2">
                <Label htmlFor="condition" className="text-xs">
                  Condition
                </Label>
                <Input
                  id="condition"
                  value={(selectedNode.data.config?.condition as string) || ''}
                  onChange={(e) => handleUpdateConfig('condition', e.target.value)}
                  placeholder="e.g., value > 100"
                  disabled={isGenerating}
                />
              </div>
            )}

            {selectedNode.data.type === 'transform' && (
              <div className="space-y-2">
                <Label htmlFor="transformType" className="text-xs">
                  Transform Type
                </Label>
                <Input
                  id="transformType"
                  value={(selectedNode.data.config?.transformType as string) || ''}
                  onChange={(e) => handleUpdateConfig('transformType', e.target.value)}
                  placeholder="e.g., Map Data, Filter, Aggregate"
                  disabled={isGenerating}
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
            disabled={isGenerating}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Node
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <div className="p-6">
      <div className="text-muted-foreground text-sm">Select a node to configure</div>
    </div>
  );

  return (
    <>
      {/* Mobile: Sheet */}
      <Sheet open={!!selectedNode} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent side="bottom" className="h-[85vh] md:hidden">
          <SheetHeader>
            <SheetTitle>Properties</SheetTitle>
          </SheetHeader>
          {panelContent}
        </SheetContent>
      </Sheet>

      {/* Desktop: Fixed sidebar */}
      <Card className="hidden h-full w-80 flex-col rounded-none border-t-0 border-r-0 border-b-0 border-l md:flex">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Properties</CardTitle>
          {selectedNode && (
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">{panelContent}</CardContent>
      </Card>
    </>
  );
}
