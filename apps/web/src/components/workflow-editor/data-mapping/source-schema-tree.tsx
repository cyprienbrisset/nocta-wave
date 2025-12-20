'use client';

import { useMemo } from 'react';
import { Database, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FieldNode } from './field-node';
import type { FieldSchema, NodeDataSchema, FieldMapping } from '@/types/mapping.types';

interface SourceSchemaTreeProps {
  schema: NodeDataSchema | null;
  nodeName: string;
  mappings: FieldMapping[];
  dragSourcePath: string | null;
  onDragStart: (field: FieldSchema, element: HTMLElement) => void;
  onDragEnd: () => void;
  onFieldClick?: (field: FieldSchema) => void;
  fieldRef: (path: string, element: HTMLElement | null) => void;
  className?: string;
}

export function SourceSchemaTree({
  schema,
  nodeName,
  mappings,
  dragSourcePath,
  onDragStart,
  onDragEnd,
  onFieldClick,
  fieldRef,
  className,
}: SourceSchemaTreeProps) {
  // Get list of connected source paths
  const connectedPaths = useMemo(() => {
    return new Set(mappings.map((m) => m.sourcePath));
  }, [mappings]);

  // Check if a field or its parent/child is connected
  const isFieldConnected = (path: string): boolean => {
    if (connectedPaths.has(path)) return true;
    // Check if any child is connected
    for (const connectedPath of connectedPaths) {
      if (connectedPath.startsWith(path + '.') || connectedPath.startsWith(path + '[')) {
        return true;
      }
    }
    return false;
  };

  if (!schema) {
    return (
      <div className={cn('flex flex-col h-full bg-[#0f0f1a]', className)}>
        <div className="p-3 border-b border-gray-800 bg-[#1a1a2e]">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Source</span>
          </div>
          <span className="text-xs text-gray-500 mt-1 block">{nodeName}</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune donnee disponible</p>
            <p className="text-xs mt-1">Executez le workflow pour voir les donnees</p>
          </div>
        </div>
      </div>
    );
  }

  const outputFields = schema.outputSchema;

  return (
    <div className={cn('flex flex-col h-full bg-[#0f0f1a]', className)}>
      {/* Header */}
      <div className="p-3 border-b border-gray-800 bg-[#1a1a2e]">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Source</span>
          <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
            {schema.source}
          </span>
        </div>
        <span className="text-xs text-gray-500 mt-1 block">{nodeName}</span>
      </div>

      {/* Fields */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {outputFields.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">Aucun champ de sortie</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {/* Root output wrapper */}
              <div className="text-xs text-gray-500 px-2 py-1 font-mono">output</div>
              {outputFields.map((field) => (
                <FieldNode
                  key={field.path}
                  field={field}
                  depth={0}
                  side="source"
                  isConnected={isFieldConnected(field.path)}
                  isDragSource={dragSourcePath === field.path}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onFieldClick={onFieldClick}
                  fieldRef={fieldRef}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Helper text */}
      <div className="p-2 border-t border-gray-800 bg-gray-900/50">
        <p className="text-[10px] text-gray-500">
          Glissez un champ vers la cible pour creer un mapping
        </p>
      </div>
    </div>
  );
}
