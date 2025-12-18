'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Zap, Globe, Code, GitBranch, Database, MessageSquare, Wrench, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { nodesApi, type NodeMetadata } from '@/lib/api/nodes';
import { cn } from '@/lib/utils';

interface NodeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (node: NodeMetadata) => void;
}

const categoryIcons: Record<string, ReactNode> = {
  trigger: <Zap className="h-4 w-4" />,
  http: <Globe className="h-4 w-4" />,
  transform: <Code className="h-4 w-4" />,
  logic: <GitBranch className="h-4 w-4" />,
  database: <Database className="h-4 w-4" />,
  integration: <MessageSquare className="h-4 w-4" />,
  utility: <Wrench className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  trigger: 'Déclencheurs',
  http: 'HTTP',
  transform: 'Transformation',
  logic: 'Logique',
  database: 'Base de données',
  integration: 'Intégrations',
  utility: 'Utilitaires',
};

const categoryColors: Record<string, { bg: string; text: string }> = {
  trigger: { bg: 'bg-green-100', text: 'text-green-600' },
  http: { bg: 'bg-blue-100', text: 'text-blue-600' },
  transform: { bg: 'bg-purple-100', text: 'text-purple-600' },
  logic: { bg: 'bg-orange-100', text: 'text-orange-600' },
  database: { bg: 'bg-cyan-100', text: 'text-cyan-600' },
  integration: { bg: 'bg-pink-100', text: 'text-pink-600' },
  utility: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

export function NodeSelector({ isOpen, onClose, onSelectNode }: NodeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['node-categories'],
    queryFn: () => nodesApi.getByCategory(),
    enabled: isOpen,
  });

  const { data: searchResults } = useQuery({
    queryKey: ['node-search', searchQuery],
    queryFn: () => nodesApi.search(searchQuery),
    enabled: isOpen && searchQuery.length > 1,
  });

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedCategory(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayNodes = searchQuery.length > 1
    ? searchResults
    : selectedCategory
      ? categories?.find(c => c.category === selectedCategory)?.nodes
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Ajouter un node</h2>
              <p className="text-xs text-muted-foreground">Choisissez un type de node</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10 rounded-xl bg-muted/50 border-0"
              placeholder="Rechercher un node..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
              </div>
            ) : searchQuery.length > 1 ? (
              /* Résultats de recherche */
              <div className="space-y-2">
                {searchResults && searchResults.length > 0 ? (
                  searchResults.map((node) => (
                    <NodeItem key={node.type} node={node} onSelect={onSelectNode} />
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-muted-foreground">Aucun node trouvé</p>
                  </div>
                )}
              </div>
            ) : selectedCategory ? (
              /* Nodes de la catégorie */
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="mb-3 rounded-lg"
                >
                  &larr; Retour aux catégories
                </Button>
                {displayNodes?.map((node) => (
                  <NodeItem key={node.type} node={node} onSelect={onSelectNode} />
                ))}
              </div>
            ) : (
              /* Grille des catégories */
              <div className="grid grid-cols-2 gap-4">
                {categories?.map((category) => {
                  const defaultColors = { bg: 'bg-gray-100', text: 'text-gray-600' };
                  const colors = categoryColors[category.category] ?? defaultColors;
                  return (
                    <button
                      key={category.category}
                      className="flex items-center gap-4 rounded-xl border p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
                      onClick={() => setSelectedCategory(category.category)}
                    >
                      <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', colors.bg, colors.text)}>
                        {categoryIcons[category.category] || <Code className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-semibold">
                          {categoryLabels[category.category] || category.category}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {category.count} node{category.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function NodeItem({ node, onSelect }: { node: NodeMetadata; onSelect: (node: NodeMetadata) => void }) {
  const defaultColors = { bg: 'bg-gray-100', text: 'text-gray-600' };
  const colors = categoryColors[node.category] ?? defaultColors;

  return (
    <button
      className="group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
      onClick={() => onSelect(node)}
    >
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colors.bg, colors.text)}>
        {categoryIcons[node.category] || <Wrench className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{node.name}</div>
        <div className="text-sm text-muted-foreground truncate">{node.description}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', colors.bg, colors.text)}>
          {categoryLabels[node.category] || node.category}
        </span>
        <Plus className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
