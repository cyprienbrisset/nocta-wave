'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { X, ArrowRight, Code, Eye, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/stores/workflow.store';
import { useEdgeSchemas } from './hooks/use-schema-inference';
import { SourceSchemaTree } from './source-schema-tree';
import { TargetSchemaTree } from './target-schema-tree';
import { MappingCanvas } from './mapping-canvas';
import { ExpressionEditor } from './expression-editor';
import { MappingPreview } from './mapping-preview';
import { SuggestionPanel } from './suggestion-panel';
import type { FieldSchema, FieldMapping } from '@/types/mapping.types';

export function DataMappingModal() {
  const {
    mapping,
    edges,
    closeMappingModal,
    addFieldMapping,
    updateFieldMapping,
    removeFieldMapping,
    setActiveMappingId,
    setExpressionMode,
    getEdgeMappings,
  } = useWorkflowStore();

  const { mappingModalEdgeId, activeMappingId, expressionMode } = mapping;

  // Get edge data
  const edge = useMemo(() => {
    if (!mappingModalEdgeId) return null;
    return edges.find((e) => e.id === mappingModalEdgeId);
  }, [mappingModalEdgeId, edges]);

  // Get schemas for source and target nodes
  const { sourceSchema, targetSchema, sourceNode, targetNode } = useEdgeSchemas(mappingModalEdgeId);

  // Get existing mappings
  const mappings = useMemo(() => {
    if (!mappingModalEdgeId) return [];
    return getEdgeMappings(mappingModalEdgeId);
  }, [mappingModalEdgeId, getEdgeMappings, edges]);

  // Field element refs for drawing connections
  const sourceFieldRefs = useRef<Map<string, HTMLElement>>(new Map());
  const targetFieldRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragSourceField, setDragSourceField] = useState<FieldSchema | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  // Container ref for position calculations
  const containerRef = useRef<HTMLDivElement>(null);

  // Panel sizes
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Handle drag start
  const handleDragStart = useCallback((field: FieldSchema, _element: HTMLElement) => {
    setIsDragging(true);
    setDragSourceField(field);
  }, []);

  // Handle drag move
  const handleDragMove = useCallback((e: React.DragEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setDragPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [isDragging]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragSourceField(null);
    setDragPosition(null);
  }, []);

  // Handle drop on target field
  const handleDrop = useCallback(
    (targetField: FieldSchema) => {
      if (!mappingModalEdgeId || !dragSourceField) return;

      // Create new mapping
      addFieldMapping(mappingModalEdgeId, {
        sourcePath: dragSourceField.path,
        targetPath: targetField.path,
        expressionMode: 'simple',
      });

      handleDragEnd();
    },
    [mappingModalEdgeId, dragSourceField, addFieldMapping, handleDragEnd]
  );

  // Handle mapping selection
  const handleSelectMapping = useCallback(
    (mappingId: string) => {
      setActiveMappingId(activeMappingId === mappingId ? null : mappingId);
    },
    [activeMappingId, setActiveMappingId]
  );

  // Handle mapping deletion
  const handleDeleteMapping = useCallback(
    (mappingId: string) => {
      if (!mappingModalEdgeId) return;
      removeFieldMapping(mappingModalEdgeId, mappingId);
      if (activeMappingId === mappingId) {
        setActiveMappingId(null);
      }
    },
    [mappingModalEdgeId, activeMappingId, removeFieldMapping, setActiveMappingId]
  );

  // Handle expression update
  const handleExpressionChange = useCallback(
    (expression: string) => {
      if (!mappingModalEdgeId || !activeMappingId) return;
      updateFieldMapping(mappingModalEdgeId, activeMappingId, { expression });
    },
    [mappingModalEdgeId, activeMappingId, updateFieldMapping]
  );

  // Handle mode change
  const handleModeChange = useCallback(
    (mode: 'simple' | 'advanced') => {
      if (!mappingModalEdgeId || !activeMappingId) return;
      setExpressionMode(mode);
      updateFieldMapping(mappingModalEdgeId, activeMappingId, { expressionMode: mode });
    },
    [mappingModalEdgeId, activeMappingId, setExpressionMode, updateFieldMapping]
  );

  // Register field refs
  const registerSourceFieldRef = useCallback((path: string, el: HTMLElement | null) => {
    if (el) {
      sourceFieldRefs.current.set(path, el);
    } else {
      sourceFieldRefs.current.delete(path);
    }
  }, []);

  const registerTargetFieldRef = useCallback((path: string, el: HTMLElement | null) => {
    if (el) {
      targetFieldRefs.current.set(path, el);
    } else {
      targetFieldRefs.current.delete(path);
    }
  }, []);

  // Get active mapping
  const activeMapping = useMemo(() => {
    if (!activeMappingId) return null;
    return mappings.find((m) => m.id === activeMappingId);
  }, [activeMappingId, mappings]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMappingModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeMappingModal]);

  if (!mappingModalEdgeId || !edge) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div
        className="bg-[#0f0f1a] border border-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#1a1a2e]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {sourceNode?.data?.label || 'Source'}
              </span>
              <ArrowRight className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-white">
                {targetNode?.data?.label || 'Target'}
              </span>
            </div>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
              {mappings.length} mapping(s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5">
              <button
                onClick={() => handleModeChange('simple')}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  expressionMode === 'simple'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                Simple
              </button>
              <button
                onClick={() => handleModeChange('advanced')}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  expressionMode === 'advanced'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                JavaScript
              </button>
            </div>

            {/* Suggestions toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={cn(
                'h-7 gap-1',
                showSuggestions && 'bg-purple-900/30 text-purple-400'
              )}
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span className="text-xs">Suggestions</span>
            </Button>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMappingModal}
              className="h-8 w-8 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div
          ref={containerRef}
          className="flex-1 flex relative overflow-hidden"
          onDragOver={handleDragMove}
        >
          {/* Source panel */}
          <div className="w-1/3 border-r border-gray-800 flex flex-col">
            <SourceSchemaTree
              schema={sourceSchema}
              nodeName={sourceNode?.data?.label || 'Source'}
              mappings={mappings}
              dragSourcePath={dragSourceField?.path || null}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              fieldRef={registerSourceFieldRef}
            />
          </div>

          {/* Mapping canvas overlay */}
          <MappingCanvas
            mappings={mappings}
            activeMappingId={activeMappingId}
            isDragging={isDragging}
            dragSourceField={dragSourceField}
            dragPosition={dragPosition}
            sourceFieldRefs={sourceFieldRefs.current}
            targetFieldRefs={targetFieldRefs.current}
            onSelectMapping={handleSelectMapping}
            onDeleteMapping={handleDeleteMapping}
          />

          {/* Target panel */}
          <div className="w-1/3 border-r border-gray-800 flex flex-col">
            <TargetSchemaTree
              schema={targetSchema}
              nodeName={targetNode?.data?.label || 'Target'}
              mappings={mappings}
              dragSourceField={dragSourceField}
              isDropActive={isDragging}
              onDrop={handleDrop}
              fieldRef={registerTargetFieldRef}
            />
          </div>

          {/* Right panel: Expression editor + Preview */}
          <div className="flex-1 flex flex-col bg-[#0a0a14]">
            {activeMapping ? (
              <>
                {/* Expression editor */}
                <div className="flex-1 border-b border-gray-800">
                  <ExpressionEditor
                    mapping={activeMapping}
                    mode={expressionMode}
                    sourceSchema={sourceSchema}
                    onChange={handleExpressionChange}
                  />
                </div>

                {/* Preview */}
                <div className="h-48">
                  <MappingPreview
                    mapping={activeMapping}
                    sourceSchema={sourceSchema}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-gray-500">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Selectionnez un mapping</p>
                  <p className="text-xs mt-1">
                    Cliquez sur une connexion pour modifier son expression
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suggestions panel */}
        {showSuggestions && (
          <div className="border-t border-gray-800 bg-[#1a1a2e]">
            <SuggestionPanel
              edgeId={mappingModalEdgeId}
              sourceSchema={sourceSchema}
              targetSchema={targetSchema}
              existingMappings={mappings}
            />
          </div>
        )}
      </div>
    </div>
  );
}
