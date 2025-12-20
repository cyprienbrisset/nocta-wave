'use client';

import { useMemo, useCallback } from 'react';
import { Wand2, Plus, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/stores/workflow.store';
import { useMappingSuggestions } from './hooks/use-mapping-suggestions';
import { TypeBadge } from './type-badge';
import type { NodeDataSchema, FieldMapping, MappingSuggestion } from '@/types/mapping.types';

interface SuggestionPanelProps {
  edgeId: string;
  sourceSchema: NodeDataSchema | null;
  targetSchema: NodeDataSchema | null;
  existingMappings: FieldMapping[];
}

const reasonLabels: Record<string, string> = {
  exact_name_match: 'Nom identique',
  similar_name: 'Nom similaire',
  same_type: 'Type compatible',
  common_pattern: 'Pattern commun',
  previous_mapping: 'Mapping precedent',
};

export function SuggestionPanel({
  edgeId,
  sourceSchema,
  targetSchema,
  existingMappings,
}: SuggestionPanelProps) {
  const { addFieldMapping } = useWorkflowStore();

  // Generate suggestions
  const suggestions = useMappingSuggestions(sourceSchema, targetSchema, existingMappings);

  // Apply a single suggestion
  const applySuggestion = useCallback(
    (suggestion: MappingSuggestion) => {
      addFieldMapping(edgeId, {
        sourcePath: suggestion.sourcePath,
        targetPath: suggestion.targetPath,
        expressionMode: 'simple',
      });
    },
    [edgeId, addFieldMapping]
  );

  // Apply all suggestions
  const applyAllSuggestions = useCallback(() => {
    for (const suggestion of suggestions) {
      addFieldMapping(edgeId, {
        sourcePath: suggestion.sourcePath,
        targetPath: suggestion.targetPath,
        expressionMode: 'simple',
      });
    }
  }, [edgeId, suggestions, addFieldMapping]);

  // Get confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.7) return 'text-yellow-400';
    return 'text-orange-400';
  };

  // Get confidence bar width
  const getConfidenceWidth = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  if (suggestions.length === 0) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-gray-500">
          <Wand2 className="h-4 w-4" />
          <span className="text-sm">Aucune suggestion disponible</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-white">
            Suggestions ({suggestions.length})
          </span>
        </div>

        {suggestions.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={applyAllSuggestions}
            className="h-7 text-xs gap-1 border-purple-700 bg-purple-900/20 text-purple-400 hover:bg-purple-900/40"
          >
            <Plus className="h-3 w-3" />
            Tout appliquer
          </Button>
        )}
      </div>

      {/* Suggestions list */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {suggestions.slice(0, 5).map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => applySuggestion(suggestion)}
            className={cn(
              'flex-shrink-0 p-2 rounded-lg border transition-all',
              'border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-purple-600',
              'min-w-[200px] text-left group'
            )}
          >
            {/* Mapping visualization */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <TypeBadge type={suggestion.sourceField.type} />
                <span className="text-xs text-white truncate font-mono">
                  {suggestion.sourceField.name}
                </span>
              </div>
              <ArrowRight className="h-3 w-3 text-gray-500 flex-shrink-0" />
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-xs text-white truncate font-mono">
                  {suggestion.targetField.name}
                </span>
                <TypeBadge type={suggestion.targetField.type} />
              </div>
            </div>

            {/* Confidence bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    suggestion.confidence >= 0.9
                      ? 'bg-green-500'
                      : suggestion.confidence >= 0.7
                        ? 'bg-yellow-500'
                        : 'bg-orange-500'
                  )}
                  style={{ width: getConfidenceWidth(suggestion.confidence) }}
                />
              </div>
              <span className={cn('text-[10px] font-medium', getConfidenceColor(suggestion.confidence))}>
                {Math.round(suggestion.confidence * 100)}%
              </span>
            </div>

            {/* Reason */}
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-gray-500">
                {reasonLabels[suggestion.reason] || suggestion.reason}
              </span>
              <div className="flex items-center gap-1 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="h-3 w-3" />
                <span className="text-[10px]">Appliquer</span>
              </div>
            </div>
          </button>
        ))}

        {suggestions.length > 5 && (
          <div className="flex-shrink-0 flex items-center justify-center w-24 text-gray-500">
            <span className="text-xs">+{suggestions.length - 5} autres</span>
          </div>
        )}
      </div>
    </div>
  );
}
