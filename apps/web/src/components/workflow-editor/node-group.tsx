'use client';

import { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useWorkflowStore, NodeGroup as NodeGroupType } from '@/stores/workflow.store';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Trash2,
  Edit2,
  Check,
  X,
  MoreVertical,
  Copy,
  Eye,
  EyeOff,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Predefined colors for groups
const GROUP_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

interface NodeGroupProps {
  group: NodeGroupType;
  nodes: any[];
  onEdit?: (groupId: string) => void;
  onDuplicate?: (groupId: string) => void;
}

function NodeGroupComponent({ group, nodes: propNodes, onEdit, onDuplicate }: NodeGroupProps) {
  const {
    nodes: storeNodes,
    toggleGroupCollapse,
    deleteGroup,
    selectNodes,
    updateGroup,
  } = useWorkflowStore();
  const nodes = propNodes || storeNodes;

  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(group.label);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate group bounds based on contained nodes
  const bounds = useMemo(() => {
    const groupNodes = nodes.filter((n) => group.nodeIds.includes(n.id));
    if (groupNodes.length === 0) return null;

    const padding = 24;
    const headerHeight = 36;

    const minX = Math.min(...groupNodes.map((n) => n.position.x)) - padding;
    const minY = Math.min(...groupNodes.map((n) => n.position.y)) - padding - headerHeight;
    const maxX = Math.max(...groupNodes.map((n) => n.position.x + 180)) + padding;
    const maxY = Math.max(...groupNodes.map((n) => n.position.y + 80)) + padding;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [nodes, group.nodeIds]);

  // Get node type summary for collapsed view
  const nodeSummary = useMemo(() => {
    const groupNodes = nodes.filter((n) => group.nodeIds.includes(n.id));
    const typeCounts: Record<string, number> = {};

    groupNodes.forEach((node) => {
      const type = node.data?.nodeType || node.type || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([type, count]) => `${count} ${type}`)
      .slice(0, 3)
      .join(', ');
  }, [nodes, group.nodeIds]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSaveLabel = () => {
    if (editLabel.trim()) {
      updateGroup(group.id, { label: editLabel.trim() });
    } else {
      setEditLabel(group.label);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditLabel(group.label);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveLabel();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleColorChange = (color: string) => {
    updateGroup(group.id, { color });
    setShowColorPicker(false);
  };

  if (!bounds) return null;

  const handleSelectAll = (e: React.MouseEvent) => {
    if (!isEditing) {
      e.stopPropagation();
      selectNodes(group.nodeIds);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'absolute rounded-xl border-2 border-dashed pointer-events-auto',
        'transition-shadow duration-200',
        'hover:shadow-lg'
      )}
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        borderColor: group.color,
        backgroundColor: `${group.color}08`,
      }}
    >
      {/* Animated height container */}
      <motion.div
        animate={{
          height: group.collapsed ? 44 : bounds.height,
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="overflow-hidden rounded-xl"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 rounded-t-lg cursor-pointer select-none"
          style={{ backgroundColor: `${group.color}15` }}
          onClick={handleSelectAll}
          onDoubleClick={handleDoubleClick}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleGroupCollapse(group.id);
              }}
              className="p-0.5 rounded hover:bg-white/10 transition-colors"
            >
              <motion.div
                animate={{ rotate: group.collapsed ? 0 : 90 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="h-4 w-4" style={{ color: group.color }} />
              </motion.div>
            </button>

            <AnimatePresence mode="wait">
              {group.collapsed ? (
                <motion.div
                  key="collapsed-icon"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Folder className="h-4 w-4" style={{ color: group.color }} />
                </motion.div>
              ) : (
                <motion.div
                  key="expanded-icon"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <FolderOpen className="h-4 w-4" style={{ color: group.color }} />
                </motion.div>
              )}
            </AnimatePresence>

            {isEditing ? (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  ref={inputRef}
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveLabel}
                  className="h-6 text-sm px-1.5 py-0"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveLabel();
                  }}
                >
                  <Check className="h-3 w-3 text-green-500" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEdit();
                  }}
                >
                  <X className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: group.color }}
                >
                  {group.label}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ({group.nodeIds.length})
                </span>
              </div>
            )}
          </div>

          {/* Collapsed summary */}
          <AnimatePresence>
            {group.collapsed && !isEditing && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-xs text-muted-foreground truncate max-w-[150px] mx-2"
              >
                {nodeSummary}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Actions menu */}
          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleGroupCollapse(group.id)}>
                  {group.collapsed ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Expand
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Collapse
                    </>
                  )}
                </DropdownMenuItem>
                {onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(group.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowColorPicker(!showColorPicker)}>
                  <Palette className="h-4 w-4 mr-2" />
                  Change Color
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => deleteGroup(group.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Color picker */}
        <AnimatePresence>
          {showColorPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-2 border-t border-border/30"
              style={{ backgroundColor: `${group.color}10` }}
            >
              <div className="flex flex-wrap gap-1.5">
                {GROUP_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorChange(color);
                    }}
                    className={cn(
                      'w-6 h-6 rounded-full transition-transform hover:scale-110',
                      group.color === color && 'ring-2 ring-white ring-offset-2 ring-offset-background'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export const NodeGroupOverlay = memo(NodeGroupComponent);

// Group selection panel
interface GroupsPanelProps {
  onCreateGroup: () => void;
}

export function GroupsPanel({ onCreateGroup }: GroupsPanelProps) {
  const { groups, selectedNodeIds, selectedNodeId } = useWorkflowStore();
  const hasSelection = selectedNodeIds.length > 0 || selectedNodeId;

  // Listen for Ctrl+G keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && hasSelection) {
        e.preventDefault();
        onCreateGroup();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSelection, onCreateGroup]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onCreateGroup}
        disabled={!hasSelection}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
          hasSelection
            ? 'bg-indigo-900/50 text-indigo-400 hover:bg-indigo-900/70'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        )}
        title={hasSelection ? 'Group selected nodes (Ctrl+G)' : 'Select nodes to group'}
      >
        <Folder className="h-3.5 w-3.5" />
        Group
        {hasSelection && (
          <kbd className="ml-1 text-[10px] bg-indigo-800/50 px-1 rounded">⌘G</kbd>
        )}
      </button>
      {groups.length > 0 && (
        <span className="text-xs text-gray-500">
          {groups.length} group{groups.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

// Enhanced group creation dialog
interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (label: string, color: string) => void;
  selectedCount: number;
}

export function CreateGroupDialog({
  isOpen,
  onClose,
  onCreate,
  selectedCount,
}: CreateGroupDialogProps) {
  const [label, setLabel] = useState('New Group');
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  const handleCreate = () => {
    if (label.trim()) {
      onCreate(label.trim(), color);
      setLabel('New Group');
      setColor(GROUP_COLORS[0]);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-lg shadow-xl p-4 w-80"
      >
        <h3 className="text-lg font-semibold mb-4">Create Group</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Group {selectedCount} selected node{selectedCount > 1 ? 's' : ''}
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Name</label>
            <Input
              ref={inputRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Group name"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full transition-transform hover:scale-110',
                    color === c && 'ring-2 ring-white ring-offset-2 ring-offset-background'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!label.trim()}>
            Create Group
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export { GROUP_COLORS };
