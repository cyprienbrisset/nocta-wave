'use client';

import { useMemo } from 'react';
import { Settings, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FieldNode } from './field-node';
import type { FieldSchema, NodeDataSchema, FieldMapping } from '@/types/mapping.types';
import { areTypesCompatible } from '@/types/mapping.types';

interface TargetSchemaTreeProps {
  schema: NodeDataSchema | null;
  nodeName: string;
  mappings: FieldMapping[];
  dragSourceField: FieldSchema | null;
  isDropActive: boolean;
  onDrop: (targetField: FieldSchema) => void;
  onFieldClick?: (field: FieldSchema) => void;
  fieldRef: (path: string, element: HTMLElement | null) => void;
  className?: string;
}

export function TargetSchemaTree({
  schema,
  nodeName,
  mappings,
  dragSourceField,
  isDropActive,
  onDrop,
  onFieldClick,
  fieldRef,
  className,
}: TargetSchemaTreeProps) {
  // Get list of connected target paths
  const connectedPaths = useMemo(() => {
    return new Set(mappings.map((m) => m.targetPath));
  }, [mappings]);

  // Check if a field is connected
  const isFieldConnected = (path: string): boolean => {
    return connectedPaths.has(path);
  };

  // Check if a field is a valid drop target for the current drag source
  const isValidDropTarget = (field: FieldSchema): boolean => {
    if (!dragSourceField) return false;
    return areTypesCompatible(dragSourceField.type, field.type);
  };

  if (!schema) {
    return (
      <div className={cn('flex flex-col h-full bg-[#0f0f1a]', className)}>
        <div className="p-3 border-b border-gray-800 bg-[#1a1a2e]">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-white">Cible</span>
          </div>
          <span className="text-xs text-gray-500 mt-1 block">{nodeName}</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune configuration</p>
            <p className="text-xs mt-1">Ce node n'a pas de champs configurables</p>
          </div>
        </div>
      </div>
    );
  }

  const inputFields = schema.inputSchema;

  return (
    <div className={cn('flex flex-col h-full bg-[#0f0f1a]', className)}>
      {/* Header */}
      <div className="p-3 border-b border-gray-800 bg-[#1a1a2e]">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-white">Cible</span>
        </div>
        <span className="text-xs text-gray-500 mt-1 block">{nodeName}</span>
      </div>

      {/* Fields */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {inputFields.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">Aucun champ de configuration</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {inputFields.map((field) => (
                <FieldNode
                  key={field.path}
                  field={field}
                  depth={0}
                  side="target"
                  isConnected={isFieldConnected(field.path)}
                  isDropTarget={isDropActive}
                  isValidDropTarget={isValidDropTarget(field)}
                  onDrop={onDrop}
                  onFieldClick={onFieldClick}
                  fieldRef={fieldRef}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Drop zone indicator */}
      {isDropActive && (
        <div className="p-2 border-t border-gray-800 bg-green-900/20">
          <p className="text-[10px] text-green-400">
            Deposez sur un champ compatible pour creer le mapping
          </p>
        </div>
      )}

      {!isDropActive && (
        <div className="p-2 border-t border-gray-800 bg-gray-900/50">
          <p className="text-[10px] text-gray-500">
            {mappings.length} mapping(s) configure(s)
          </p>
        </div>
      )}
    </div>
  );
}
