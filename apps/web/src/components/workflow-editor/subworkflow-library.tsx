'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Workflow,
  Plus,
  Lock,
  Users,
  Globe,
  Tag,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  subworkflowsApi,
  type SubWorkflow,
} from '@/lib/api/subworkflows';
import { cn } from '@/lib/utils';
import type { NodeMetadata } from '@/lib/api/nodes';

interface SubWorkflowLibraryProps {
  onAddNode: (node: NodeMetadata) => void;
  currentWorkflowId?: string;
  className?: string;
}

export function SubWorkflowLibrary({
  onAddNode,
  currentWorkflowId,
  className,
}: SubWorkflowLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['custom'])
  );

  const { data: library, isLoading } = useQuery({
    queryKey: ['subworkflow-library', searchQuery, selectedCategory],
    queryFn: () =>
      subworkflowsApi.getLibrary({
        search: searchQuery || undefined,
        category: selectedCategory || undefined,
        includePublic: true,
      }),
  });

  const { data: categories } = useQuery({
    queryKey: ['subworkflow-categories'],
    queryFn: () => subworkflowsApi.getCategories(),
  });

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Group sub-workflows by category
  const groupedSubWorkflows = (library?.subWorkflows || []).reduce(
    (acc, sw) => {
      const category = sw.category || 'custom';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(sw);
      return acc;
    },
    {} as Record<string, SubWorkflow[]>
  );

  // Convert sub-workflow to node metadata for drag and drop
  const subWorkflowToNodeMetadata = (sw: SubWorkflow): NodeMetadata => {
    return {
      type: 'flow.subworkflow',
      category: 'flow',
      name: sw.name,
      description: sw.description || `Execute ${sw.name} as a sub-workflow`,
      icon: sw.icon || 'Workflow',
      version: String(sw.version),
      // Pass sub-workflow config as defaults
      defaults: {
        subWorkflowId: sw.id,
        versionPinned: false,
        inputMapping: {},
        outputMapping: {},
        waitForCompletion: true,
        timeout: 300000,
      },
    };
  };

  return (
    <div className={cn('flex h-full flex-col bg-[#1a1a2e]', className)}>
      {/* Header */}
      <div className="border-b border-gray-800 p-3">
        <div className="flex items-center gap-2 text-white mb-2">
          <Workflow className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-semibold">Sub-Workflows</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Reusable workflows as components
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            className="h-8 pl-8 text-sm bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
            placeholder="Search sub-workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category filters */}
      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-800/50">
          <button
            className={cn(
              'px-2 py-0.5 text-xs rounded-full transition-colors',
              !selectedCategory
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={cn(
                'px-2 py-0.5 text-xs rounded-full transition-colors',
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Sub-workflow list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : library?.subWorkflows.length === 0 ? (
            <div className="py-8 text-center">
              <Workflow className="h-8 w-8 mx-auto text-gray-600 mb-2" />
              <p className="text-sm text-gray-500">No sub-workflows found</p>
              <p className="text-xs text-gray-600 mt-1">
                Create a workflow and publish it as a sub-workflow
              </p>
            </div>
          ) : searchQuery ? (
            // Flat list for search
            <div className="space-y-1">
              {library?.subWorkflows.map((sw) => (
                <SubWorkflowItem
                  key={sw.id}
                  subWorkflow={sw}
                  onAdd={onAddNode}
                  toNodeMetadata={subWorkflowToNodeMetadata}
                  disabled={sw.workflowId === currentWorkflowId}
                />
              ))}
            </div>
          ) : (
            // Grouped by category
            <div className="space-y-0.5">
              {Object.entries(groupedSubWorkflows).map(([category, sws]) => {
                const isExpanded = expandedCategories.has(category);
                return (
                  <div key={category}>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-gray-800 text-gray-300"
                      onClick={() => toggleCategory(category)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                      )}
                      <Tag className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="flex-1 font-medium truncate capitalize">
                        {category}
                      </span>
                      <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-xs text-gray-500">
                        {sws.length}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="ml-5 mt-0.5 space-y-0.5 border-l border-gray-700 pl-2">
                        {sws.map((sw) => (
                          <SubWorkflowItem
                            key={sw.id}
                            subWorkflow={sw}
                            onAdd={onAddNode}
                            toNodeMetadata={subWorkflowToNodeMetadata}
                            disabled={sw.workflowId === currentWorkflowId}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface SubWorkflowItemProps {
  subWorkflow: SubWorkflow;
  onAdd: (node: NodeMetadata) => void;
  toNodeMetadata: (sw: SubWorkflow) => NodeMetadata;
  disabled?: boolean;
  compact?: boolean;
}

function SubWorkflowItem({
  subWorkflow,
  onAdd,
  toNodeMetadata,
  disabled,
  compact,
}: SubWorkflowItemProps) {
  const nodeMetadata = toNodeMetadata(subWorkflow);

  const handleAdd = () => {
    if (!disabled) {
      onAdd(nodeMetadata);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify(nodeMetadata));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-800'
            )}
            onClick={handleAdd}
            disabled={disabled}
            draggable={!disabled}
            onDragStart={handleDragStart}
          >
            <span className="flex-1 truncate text-gray-400">
              {subWorkflow.name}
            </span>
            {subWorkflow.isPublic && (
              <Globe className="h-3 w-3 text-green-500 flex-shrink-0" />
            )}
            {subWorkflow.isShared && !subWorkflow.isPublic && (
              <Users className="h-3 w-3 text-blue-500 flex-shrink-0" />
            )}
            {!subWorkflow.isShared && !subWorkflow.isPublic && (
              <Lock className="h-3 w-3 text-gray-500 flex-shrink-0" />
            )}
            {!disabled && (
              <Plus className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 text-indigo-500 flex-shrink-0" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          className="bg-[#1a1a2e] border-gray-700 text-white max-w-xs"
        >
          <div className="space-y-1">
            <p className="font-medium">{subWorkflow.name}</p>
            {subWorkflow.description && (
              <p className="text-xs text-gray-400">
                {subWorkflow.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>v{subWorkflow.version}</span>
              <span>|</span>
              <span>{subWorkflow.usageCount} uses</span>
            </div>
            {disabled && (
              <p className="text-xs text-amber-500">
                Cannot use a workflow inside itself
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg border border-gray-700 bg-[#1e1e2e] p-3 text-left transition-all',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-indigo-600/50 hover:bg-gray-800'
      )}
      onClick={handleAdd}
      disabled={disabled}
      draggable={!disabled}
      onDragStart={handleDragStart}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-900/50 text-indigo-500 flex-shrink-0">
        <Workflow className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {subWorkflow.name}
          </span>
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 border-gray-600 text-gray-400"
          >
            v{subWorkflow.version}
          </Badge>
        </div>
        {subWorkflow.description && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {subWorkflow.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            {subWorkflow.isPublic ? (
              <>
                <Globe className="h-3 w-3 text-green-500" />
                Public
              </>
            ) : subWorkflow.isShared ? (
              <>
                <Users className="h-3 w-3 text-blue-500" />
                Team
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" />
                Private
              </>
            )}
          </span>
          <span className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            {subWorkflow.usageCount} uses
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {subWorkflow.inputSchema.length} inputs
          </span>
        </div>
      </div>
      {!disabled && (
        <Plus className="h-5 w-5 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-indigo-500" />
      )}
    </button>
  );
}
