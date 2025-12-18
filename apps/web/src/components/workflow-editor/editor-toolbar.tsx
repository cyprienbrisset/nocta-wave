'use client';

import { useState } from 'react';
import { useWorkflowStore } from '@/stores/workflow.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import {
  Undo2,
  Redo2,
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  Folder,
  ZoomIn,
  ZoomOut,
  Maximize,
  Keyboard,
  MoreVertical,
  CopyPlus,
  Grid3X3,
  Map,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReactFlow } from '@xyflow/react';
import { toast } from '@/components/ui/use-toast';

interface EditorToolbarProps {
  className?: string;
  onToggleMinimap?: () => void;
  showMinimap?: boolean;
  onFitView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export function EditorToolbar({
  className,
  onToggleMinimap,
  showMinimap = true,
  onFitView,
  onZoomIn,
  onZoomOut,
}: EditorToolbarProps) {
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupColor, setGroupColor] = useState('#6366f1');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const reactFlow = useReactFlow();

  // Use provided handlers or fallback to reactFlow instance
  const handleZoomIn = onZoomIn || (() => reactFlow.zoomIn({ duration: 200 }));
  const handleZoomOut = onZoomOut || (() => reactFlow.zoomOut({ duration: 200 }));
  const handleFitView = onFitView || (() => reactFlow.fitView({ padding: 0.2, duration: 300 }));

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    copySelectedNodes,
    cutSelectedNodes,
    pasteNodes,
    duplicateSelectedNodes,
    deleteSelectedNodes,
    createGroup,
    selectedNodeIds,
    selectedNodeId,
    clipboard,
  } = useWorkflowStore();

  const hasSelection = selectedNodeIds.length > 0 || !!selectedNodeId;
  const hasClipboard = !!clipboard && clipboard.nodes.length > 0;

  const handleCreateGroup = () => {
    if (groupName.trim()) {
      createGroup(groupName.trim(), groupColor);
      setIsGroupDialogOpen(false);
      setGroupName('');
      toast({ title: 'Groupe créé' });
    }
  };

  const handleCopy = () => {
    copySelectedNodes();
    const count = selectedNodeIds.length || (selectedNodeId ? 1 : 0);
    if (count > 0) {
      toast({ title: `${count} node(s) copié(s)`, duration: 1500 });
    }
  };

  const handleCut = () => {
    const count = selectedNodeIds.length || (selectedNodeId ? 1 : 0);
    cutSelectedNodes();
    if (count > 0) {
      toast({ title: `${count} node(s) coupé(s)`, duration: 1500 });
    }
  };

  const colors = [
    '#6366f1', // indigo
    '#ec4899', // pink
    '#22c55e', // green
    '#f97316', // orange
    '#3b82f6', // blue
    '#a855f7', // purple
    '#06b6d4', // cyan
    '#eab308', // yellow
  ];

  const shortcuts = [
    { key: 'Ctrl/Cmd + Z', action: 'Annuler' },
    { key: 'Ctrl/Cmd + Shift + Z', action: 'Rétablir' },
    { key: 'Ctrl/Cmd + C', action: 'Copier' },
    { key: 'Ctrl/Cmd + X', action: 'Couper' },
    { key: 'Ctrl/Cmd + V', action: 'Coller' },
    { key: 'Ctrl/Cmd + D', action: 'Dupliquer' },
    { key: 'Delete / Backspace', action: 'Supprimer' },
    { key: 'Ctrl/Cmd + A', action: 'Tout sélectionner' },
    { key: 'Ctrl/Cmd + S', action: 'Enregistrer' },
    { key: 'F', action: 'Ajuster la vue' },
    { key: 'Ctrl/Cmd + +/-', action: 'Zoom avant/arrière' },
    { key: 'Escape', action: 'Désélectionner' },
    { key: 'Ctrl/Cmd + Flèches', action: 'Déplacer les nodes' },
    { key: 'F5', action: 'Continuer (debug)' },
    { key: 'F10', action: 'Step over (debug)' },
    { key: 'F11', action: 'Step into (debug)' },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'flex items-center gap-1 rounded-lg bg-[#1a1a2e] border border-gray-700 p-1',
          className
        )}
      >
        {/* Undo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                undo();
                toast({ title: 'Annulé', duration: 1500 });
              }}
              disabled={!canUndo()}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Annuler (Ctrl+Z)
          </TooltipContent>
        </Tooltip>

        {/* Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                redo();
                toast({ title: 'Rétabli', duration: 1500 });
              }}
              disabled={!canRedo()}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Rétablir (Ctrl+Shift+Z)
          </TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-gray-700 mx-1" />

        {/* Copy */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={!hasSelection}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Copier (Ctrl+C)
          </TooltipContent>
        </Tooltip>

        {/* Cut */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCut}
              disabled={!hasSelection}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30"
            >
              <Scissors className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Couper (Ctrl+X)
          </TooltipContent>
        </Tooltip>

        {/* Paste */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pasteNodes()}
              disabled={!hasClipboard}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30"
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Coller (Ctrl+V)
          </TooltipContent>
        </Tooltip>

        {/* Duplicate */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={duplicateSelectedNodes}
              disabled={!hasSelection}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30"
            >
              <CopyPlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Dupliquer (Ctrl+D)
          </TooltipContent>
        </Tooltip>

        {/* Delete */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteSelectedNodes}
              disabled={!hasSelection}
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-gray-800 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Supprimer (Delete)
          </TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-gray-700 mx-1" />

        {/* Group */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsGroupDialogOpen(true)}
              disabled={!hasSelection}
              className="h-8 w-8 p-0 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 disabled:opacity-30"
            >
              <Folder className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Créer un groupe
          </TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-gray-700 mx-1" />

        {/* Zoom controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Zoom avant (Ctrl++)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Zoom arrière (Ctrl+-)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFitView}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Ajuster la vue (F)
          </TooltipContent>
        </Tooltip>

        {/* Toggle Minimap */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMinimap}
              className={cn(
                'h-8 w-8 p-0 hover:bg-gray-800',
                showMinimap ? 'text-primary' : 'text-gray-400 hover:text-white'
              )}
            >
              <Map className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {showMinimap ? 'Masquer la minimap' : 'Afficher la minimap'}
          </TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-gray-700 mx-1" />

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#1a1a2e] border-gray-700">
            <DropdownMenuItem
              onClick={() => setIsShortcutsOpen(true)}
              className="text-gray-300 focus:bg-gray-800 focus:text-white"
            >
              <Keyboard className="mr-2 h-4 w-4" />
              Raccourcis clavier
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem
              onClick={() => reactFlow.setNodes([])}
              className="text-red-400 focus:bg-gray-800 focus:text-red-400"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer tous les nodes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Group creation dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Créer un groupe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Nom du groupe
              </label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Mon groupe"
                className="bg-gray-800 border-gray-700"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Couleur
              </label>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setGroupColor(color)}
                    className={cn(
                      'w-8 h-8 rounded-lg transition-transform',
                      groupColor === color && 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a2e] scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGroupDialogOpen(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Annuler
            </Button>
            <Button onClick={handleCreateGroup} disabled={!groupName.trim()}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shortcuts dialog */}
      <Dialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen}>
        <DialogContent className="bg-[#1a1a2e] border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Raccourcis clavier
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-800"
                >
                  <span className="text-sm text-gray-300">{shortcut.action}</span>
                  <kbd className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-400 font-mono">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
