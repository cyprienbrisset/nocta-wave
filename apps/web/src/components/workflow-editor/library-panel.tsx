'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Zap,
  Globe,
  Code,
  GitBranch,
  Database,
  MessageSquare,
  Wrench,
  BookOpen,
  Plus,
  PanelRightClose,
  PanelRight,
  Workflow,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { nodesApi, type NodeMetadata } from '@/lib/api/nodes';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LibraryPanelProps {
  onAddNode: (node: NodeMetadata) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  embedded?: boolean;
  className?: string;
}

const categoryConfig: Record<string, { icon: ReactNode; label: string; color: string }> = {
  trigger: {
    icon: <Zap className="h-4 w-4" />,
    label: 'Déclencheurs',
    color: 'text-green-500',
  },
  http: {
    icon: <Globe className="h-4 w-4" />,
    label: 'HTTP',
    color: 'text-blue-500',
  },
  transform: {
    icon: <Code className="h-4 w-4" />,
    label: 'Transformation',
    color: 'text-purple-500',
  },
  logic: {
    icon: <GitBranch className="h-4 w-4" />,
    label: 'Logique',
    color: 'text-orange-500',
  },
  database: {
    icon: <Database className="h-4 w-4" />,
    label: 'Base de données',
    color: 'text-cyan-500',
  },
  integration: {
    icon: <MessageSquare className="h-4 w-4" />,
    label: 'Intégrations',
    color: 'text-pink-500',
  },
  utility: {
    icon: <Wrench className="h-4 w-4" />,
    label: 'Utilitaires',
    color: 'text-gray-500',
  },
  flow: {
    icon: <Workflow className="h-4 w-4" />,
    label: 'Sub-Workflows',
    color: 'text-indigo-500',
  },
};

export function LibraryPanel({ onAddNode, isCollapsed = false, onToggleCollapse, embedded = false, className }: LibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['trigger']));

  const { data: categories, isLoading } = useQuery({
    queryKey: ['node-categories'],
    queryFn: () => nodesApi.getByCategory(),
  });

  const { data: searchResults } = useQuery({
    queryKey: ['node-search', searchQuery],
    queryFn: () => nodesApi.search(searchQuery),
    enabled: searchQuery.length > 1,
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

  const displayNodes = searchQuery.length > 1 ? searchResults : null;

  // Mode collapse - afficher uniquement les icones
  if (isCollapsed) {
    return (
      <div className="flex h-full w-14 flex-col border-l border-gray-800 bg-[#1a1a2e]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="m-2 h-10 w-10 text-gray-400 hover:bg-gray-800 hover:text-white"
          title="Ouvrir la bibliothèque"
        >
          <PanelRight className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex flex-col items-center gap-1 py-2">
          {Object.entries(categoryConfig).map(([key, config]) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-gray-800',
                    config.color
                  )}
                  onClick={() => {
                    onToggleCollapse?.();
                    setExpandedCategories(new Set([key]));
                  }}
                >
                  {config.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-[#1a1a2e] border-gray-700 text-white">
                {config.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  }

  // Embedded mode for panel layout - fills container
  if (embedded) {
    return (
      <div className={cn('flex h-full flex-col bg-[#1a1a2e]', className)}>
        {/* Search */}
        <div className="p-2 border-b border-gray-800/50">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <Input
              className="h-7 pl-7 text-xs bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Node list */}
        <div className="flex-1 overflow-auto px-2 pb-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : displayNodes ? (
            <div className="space-y-1">
              {displayNodes.length > 0 ? (
                displayNodes.map((node) => (
                  <NodeItem key={node.type} node={node} onAdd={onAddNode} compact />
                ))
              ) : (
                <p className="py-4 text-center text-xs text-gray-500">
                  Aucun node trouvé
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {categories?.map((category) => {
                const config = categoryConfig[category.category] || {
                  icon: <Code className="h-4 w-4" />,
                  label: category.category,
                  color: 'text-gray-500',
                };
                const isExpanded = expandedCategories.has(category.category);

                return (
                  <div key={category.category}>
                    <button
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-gray-800 text-gray-300"
                      onClick={() => toggleCategory(category.category)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-gray-500 flex-shrink-0" />
                      )}
                      <span className={cn('flex items-center', config.color)}>
                        {config.icon}
                      </span>
                      <span className="flex-1 font-medium truncate">{config.label}</span>
                      <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
                        {category.count}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-700 pl-2">
                        {category.nodes.map((node) => (
                          <NodeItem key={node.type} node={node} onAdd={onAddNode} compact />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-72 flex-col border-l border-gray-800 bg-[#1a1a2e]">
      {/* En-tête */}
      <div className="library-sidebar px-3 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
            title="Réduire"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 text-white">
            <BookOpen className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Bibliothèque</h2>
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            className="h-8 pl-8 text-sm bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Liste des nodes */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : displayNodes ? (
            /* Résultats de recherche */
            <div className="space-y-1">
              {displayNodes.length > 0 ? (
                displayNodes.map((node) => (
                  <NodeItem key={node.type} node={node} onAdd={onAddNode} />
                ))
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">
                  Aucun node trouvé
                </p>
              )}
            </div>
          ) : (
            /* Liste par catégorie */
            <div className="space-y-0.5">
              {categories?.map((category) => {
                const config = categoryConfig[category.category] || {
                  icon: <Code className="h-4 w-4" />,
                  label: category.category,
                  color: 'text-gray-500',
                };
                const isExpanded = expandedCategories.has(category.category);

                return (
                  <div key={category.category}>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-gray-800 text-gray-300"
                      onClick={() => toggleCategory(category.category)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                      )}
                      <span className={cn('flex items-center', config.color)}>
                        {config.icon}
                      </span>
                      <span className="flex-1 font-medium truncate">{config.label}</span>
                      <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-xs text-gray-500">
                        {category.count}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="ml-5 mt-0.5 space-y-0.5 border-l border-gray-700 pl-2">
                        {category.nodes.map((node) => (
                          <NodeItem key={node.type} node={node} onAdd={onAddNode} compact />
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

interface NodeItemProps {
  node: NodeMetadata;
  onAdd: (node: NodeMetadata) => void;
  compact?: boolean;
}

function NodeItem({ node, onAdd, compact }: NodeItemProps) {
  const category = node.type?.split('.')[0] || 'utility';
  const defaultConfig = { icon: <Wrench className="h-4 w-4" />, label: 'Utility', color: 'text-gray-500' };
  const config = categoryConfig[category] ?? defaultConfig;

  if (compact) {
    return (
      <button
        className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-gray-800"
        onClick={() => onAdd(node)}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/json', JSON.stringify(node));
          e.dataTransfer.effectAllowed = 'copy';
        }}
      >
        <span className="flex-1 truncate text-gray-400">{node.name}</span>
        <Plus className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 text-primary flex-shrink-0" />
      </button>
    );
  }

  return (
    <button
      className="group flex w-full items-center gap-2 rounded-lg border border-gray-700 bg-[#1e1e2e] p-2 text-left transition-all hover:border-gray-600 hover:bg-gray-800"
      onClick={() => onAdd(node)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify(node));
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0',
          category === 'trigger' && 'bg-green-900/50 text-green-500',
          category === 'http' && 'bg-blue-900/50 text-blue-500',
          category === 'transform' && 'bg-purple-900/50 text-purple-500',
          category === 'logic' && 'bg-orange-900/50 text-orange-500',
          category === 'database' && 'bg-cyan-900/50 text-cyan-500',
          category === 'integration' && 'bg-pink-900/50 text-pink-500',
          category === 'utility' && 'bg-gray-800 text-gray-500',
          category === 'flow' && 'bg-indigo-900/50 text-indigo-500'
        )}
      >
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate text-white">{node.name}</div>
        <div className="text-xs text-gray-500 truncate">{node.description}</div>
      </div>
      <Plus className="h-4 w-4 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-primary" />
    </button>
  );
}
