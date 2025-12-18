'use client';

import { memo, useMemo } from 'react';
import { useWorkflowStore, NodeGroup as NodeGroupType } from '@/stores/workflow.store';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Trash2,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeGroupProps {
  group: NodeGroupType;
  nodes: any[];
  onEdit?: (groupId: string) => void;
}

function NodeGroupComponent({ group, nodes: propNodes, onEdit }: NodeGroupProps) {
  const { nodes: storeNodes, toggleGroupCollapse, deleteGroup, selectNodes } = useWorkflowStore();
  const nodes = propNodes || storeNodes;

  // Calculate group bounds based on contained nodes
  const bounds = useMemo(() => {
    const groupNodes = nodes.filter((n) => group.nodeIds.includes(n.id));
    if (groupNodes.length === 0) return null;

    const padding = 20;
    const headerHeight = 32;

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

  if (!bounds) return null;

  const handleSelectAll = () => {
    selectNodes(group.nodeIds);
  };

  return (
    <div
      className={cn(
        'absolute rounded-xl border-2 border-dashed transition-all pointer-events-auto',
        group.collapsed ? 'opacity-50' : 'opacity-100'
      )}
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: group.collapsed ? 40 : bounds.height,
        borderColor: group.color,
        backgroundColor: `${group.color}10`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded-t-lg cursor-pointer"
        style={{ backgroundColor: `${group.color}20` }}
        onClick={handleSelectAll}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleGroupCollapse(group.id);
            }}
            className="p-0.5 rounded hover:bg-white/10"
          >
            {group.collapsed ? (
              <ChevronRight className="h-4 w-4" style={{ color: group.color }} />
            ) : (
              <ChevronDown className="h-4 w-4" style={{ color: group.color }} />
            )}
          </button>
          {group.collapsed ? (
            <Folder className="h-4 w-4" style={{ color: group.color }} />
          ) : (
            <FolderOpen className="h-4 w-4" style={{ color: group.color }} />
          )}
          <span
            className="text-sm font-medium"
            style={{ color: group.color }}
          >
            {group.label}
          </span>
          <span className="text-xs text-gray-500">
            ({group.nodeIds.length} nodes)
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(group.id);
              }}
              className="p-1 rounded hover:bg-white/10"
            >
              <Edit2 className="h-3.5 w-3.5 text-gray-400 hover:text-white" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteGroup(group.id);
            }}
            className="p-1 rounded hover:bg-white/10"
          >
            <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
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
      >
        <Folder className="h-3.5 w-3.5" />
        Group
      </button>
      {groups.length > 0 && (
        <span className="text-xs text-gray-500">
          {groups.length} group{groups.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
