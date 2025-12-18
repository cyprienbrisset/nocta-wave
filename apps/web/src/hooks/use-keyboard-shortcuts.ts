'use client';

import { useEffect, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useWorkflowStore } from '@/stores/workflow.store';
import { toast } from '@/components/ui/use-toast';

interface KeyboardShortcutsOptions {
  onSave?: () => void;
  onTest?: () => void;
  onToggleLibrary?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onFitView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const {
    onSave,
    onTest,
    onToggleLibrary,
    onUndo,
    onRedo,
    onCopy,
    onCut,
    onPaste,
    onDuplicate,
    onDelete,
    onSelectAll,
    onFitView,
    onZoomIn,
    onZoomOut,
    onEscape,
    enabled = true,
  } = options;
  const reactFlow = useReactFlow();

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
    selectNodes,
    selectedNodeIds,
    selectedNodeId,
    nodes,
    debug,
    resumeExecution,
    stepOver,
    stepInto,
    setDebugMode,
  } = useWorkflowStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        // Allow Escape in inputs
        if (event.key !== 'Escape') {
          return;
        }
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      // Undo: Ctrl/Cmd + Z
      if (modKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (onUndo) {
          onUndo();
        } else if (canUndo()) {
          undo();
        }
        toast({ title: 'Annulé', duration: 1500 });
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((modKey && event.shiftKey && event.key === 'z') || (modKey && event.key === 'y')) {
        event.preventDefault();
        if (onRedo) {
          onRedo();
        } else if (canRedo()) {
          redo();
        }
        toast({ title: 'Rétabli', duration: 1500 });
        return;
      }

      // Copy: Ctrl/Cmd + C
      if (modKey && event.key === 'c') {
        event.preventDefault();
        if (onCopy) {
          onCopy();
        } else {
          copySelectedNodes();
        }
        const count = selectedNodeIds.length || (selectedNodeId ? 1 : 0);
        if (count > 0) {
          toast({ title: `${count} node(s) copié(s)`, duration: 1500 });
        }
        return;
      }

      // Cut: Ctrl/Cmd + X
      if (modKey && event.key === 'x') {
        event.preventDefault();
        const count = selectedNodeIds.length || (selectedNodeId ? 1 : 0);
        if (onCut) {
          onCut();
        } else {
          cutSelectedNodes();
        }
        if (count > 0) {
          toast({ title: `${count} node(s) coupé(s)`, duration: 1500 });
        }
        return;
      }

      // Paste: Ctrl/Cmd + V
      if (modKey && event.key === 'v') {
        event.preventDefault();
        if (onPaste) {
          onPaste();
        } else {
          pasteNodes();
        }
        return;
      }

      // Duplicate: Ctrl/Cmd + D
      if (modKey && event.key === 'd') {
        event.preventDefault();
        if (onDuplicate) {
          onDuplicate();
        } else {
          duplicateSelectedNodes();
        }
        return;
      }

      // Delete: Delete or Backspace
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        if (onDelete) {
          onDelete();
        } else {
          deleteSelectedNodes();
        }
        return;
      }

      // Select All: Ctrl/Cmd + A
      if (modKey && event.key === 'a') {
        event.preventDefault();
        if (onSelectAll) {
          onSelectAll();
        } else {
          selectNodes(nodes.map((n) => n.id));
        }
        return;
      }

      // Save: Ctrl/Cmd + S
      if (modKey && event.key === 's') {
        event.preventDefault();
        onSave?.();
        return;
      }

      // Test: Ctrl/Cmd + T (if not opening new tab)
      if (modKey && event.key === 't' && event.shiftKey) {
        event.preventDefault();
        onTest?.();
        return;
      }

      // Toggle Library: Ctrl/Cmd + B
      if (modKey && event.key === 'b') {
        event.preventDefault();
        onToggleLibrary?.();
        return;
      }

      // Fit View: Ctrl/Cmd + 0 or F
      if ((modKey && event.key === '0') || event.key === 'f') {
        if (!modKey || event.key === 'f') {
          event.preventDefault();
          if (onFitView) {
            onFitView();
          } else {
            reactFlow.fitView({ padding: 0.2, duration: 300 });
          }
          return;
        }
      }

      // Zoom In: Ctrl/Cmd + Plus or =
      if (modKey && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        if (onZoomIn) {
          onZoomIn();
        } else {
          reactFlow.zoomIn({ duration: 200 });
        }
        return;
      }

      // Zoom Out: Ctrl/Cmd + Minus
      if (modKey && event.key === '-') {
        event.preventDefault();
        if (onZoomOut) {
          onZoomOut();
        } else {
          reactFlow.zoomOut({ duration: 200 });
        }
        return;
      }

      // Escape: Deselect all
      if (event.key === 'Escape') {
        event.preventDefault();
        if (onEscape) {
          onEscape();
        } else {
          selectNodes([]);
        }
        return;
      }

      // Debug shortcuts
      if (debug.isDebugging) {
        // F5: Resume execution
        if (event.key === 'F5') {
          event.preventDefault();
          if (event.shiftKey) {
            setDebugMode(false);
          } else {
            resumeExecution();
          }
          return;
        }

        // F10: Step over
        if (event.key === 'F10') {
          event.preventDefault();
          stepOver();
          return;
        }

        // F11: Step into
        if (event.key === 'F11') {
          event.preventDefault();
          stepInto();
          return;
        }
      }

      // Arrow keys for node navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        const currentNodeId = selectedNodeId || selectedNodeIds[0];
        if (!currentNodeId) return;

        const currentNode = nodes.find((n) => n.id === currentNodeId);
        if (!currentNode) return;

        // Move selected nodes with arrow keys
        if (modKey) {
          event.preventDefault();
          const delta = event.shiftKey ? 50 : 10;
          const moveX = event.key === 'ArrowLeft' ? -delta : event.key === 'ArrowRight' ? delta : 0;
          const moveY = event.key === 'ArrowUp' ? -delta : event.key === 'ArrowDown' ? delta : 0;

          const nodesToMove = selectedNodeIds.length > 0 ? selectedNodeIds : [currentNodeId];
          nodesToMove.forEach((nodeId) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (node) {
              reactFlow.setNodes((nds) =>
                nds.map((n) =>
                  n.id === nodeId
                    ? { ...n, position: { x: n.position.x + moveX, y: n.position.y + moveY } }
                    : n
                )
              );
            }
          });
        }
      }
    },
    [
      enabled,
      canUndo,
      canRedo,
      undo,
      redo,
      copySelectedNodes,
      cutSelectedNodes,
      pasteNodes,
      duplicateSelectedNodes,
      deleteSelectedNodes,
      selectNodes,
      selectedNodeIds,
      selectedNodeId,
      nodes,
      onSave,
      onTest,
      onToggleLibrary,
      onUndo,
      onRedo,
      onCopy,
      onCut,
      onPaste,
      onDuplicate,
      onDelete,
      onSelectAll,
      onFitView,
      onZoomIn,
      onZoomOut,
      onEscape,
      reactFlow,
      debug.isDebugging,
      resumeExecution,
      stepOver,
      stepInto,
      setDebugMode,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts: [
      { key: 'Ctrl/Cmd + Z', description: 'Annuler' },
      { key: 'Ctrl/Cmd + Shift + Z', description: 'Rétablir' },
      { key: 'Ctrl/Cmd + C', description: 'Copier' },
      { key: 'Ctrl/Cmd + X', description: 'Couper' },
      { key: 'Ctrl/Cmd + V', description: 'Coller' },
      { key: 'Ctrl/Cmd + D', description: 'Dupliquer' },
      { key: 'Delete', description: 'Supprimer' },
      { key: 'Ctrl/Cmd + A', description: 'Tout sélectionner' },
      { key: 'Ctrl/Cmd + S', description: 'Enregistrer' },
      { key: 'F', description: 'Ajuster la vue' },
      { key: 'Ctrl/Cmd + +/-', description: 'Zoom' },
      { key: 'Escape', description: 'Désélectionner' },
      { key: 'Ctrl/Cmd + Arrows', description: 'Déplacer les nodes' },
    ],
  };
}
