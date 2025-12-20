'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { MappingConnection, DragConnection } from './mapping-connection';
import { getElementRightEdge, getElementLeftEdge } from './hooks/use-mapping-drag';
import type { FieldMapping, FieldSchema, DataType } from '@/types/mapping.types';

interface MappingCanvasProps {
  mappings: FieldMapping[];
  activeMappingId: string | null;
  isDragging: boolean;
  dragSourceField: FieldSchema | null;
  dragPosition: { x: number; y: number } | null;
  sourceFieldRefs: Map<string, HTMLElement>;
  targetFieldRefs: Map<string, HTMLElement>;
  onSelectMapping: (mappingId: string) => void;
  onDeleteMapping: (mappingId: string) => void;
}

interface ConnectionCoords {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function MappingCanvas({
  mappings,
  activeMappingId,
  isDragging,
  dragSourceField,
  dragPosition,
  sourceFieldRefs,
  targetFieldRefs,
  onSelectMapping,
  onDeleteMapping,
}: MappingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [connectionCoords, setConnectionCoords] = useState<Map<string, ConnectionCoords>>(new Map());
  const [dragCoords, setDragCoords] = useState<ConnectionCoords | null>(null);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate connection coordinates whenever mappings or refs change
  useEffect(() => {
    if (!containerRef.current) return;

    const newCoords = new Map<string, ConnectionCoords>();

    for (const mapping of mappings) {
      const sourceEl = sourceFieldRefs.get(mapping.sourcePath);
      const targetEl = targetFieldRefs.get(mapping.targetPath);

      if (sourceEl && targetEl) {
        const start = getElementRightEdge(sourceEl, containerRef.current);
        const end = getElementLeftEdge(targetEl, containerRef.current);

        newCoords.set(mapping.id, {
          startX: start.x,
          startY: start.y,
          endX: end.x,
          endY: end.y,
        });
      }
    }

    setConnectionCoords(newCoords);
  }, [mappings, sourceFieldRefs, targetFieldRefs, dimensions]);

  // Calculate drag connection coordinates
  useEffect(() => {
    if (!isDragging || !dragSourceField || !dragPosition || !containerRef.current) {
      setDragCoords(null);
      return;
    }

    const sourceEl = sourceFieldRefs.get(dragSourceField.path);
    if (!sourceEl) {
      setDragCoords(null);
      return;
    }

    const start = getElementRightEdge(sourceEl, containerRef.current);

    setDragCoords({
      startX: start.x,
      startY: start.y,
      endX: dragPosition.x,
      endY: dragPosition.y,
    });
  }, [isDragging, dragSourceField, dragPosition, sourceFieldRefs]);

  // Get source type for a mapping
  const getSourceType = useCallback(
    (sourcePath: string): DataType => {
      // Try to infer from the path name
      const lastPart = sourcePath.split('.').pop() || '';
      if (lastPart.endsWith('Id') || lastPart === 'id' || lastPart === 'count') return 'number';
      if (lastPart.endsWith('At') || lastPart.includes('date') || lastPart.includes('Date')) return 'date';
      if (lastPart.startsWith('is') || lastPart.startsWith('has') || lastPart === 'active' || lastPart === 'enabled') return 'boolean';
      if (lastPart.endsWith('s') && !lastPart.endsWith('ss')) return 'array';
      return 'string';
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ overflow: 'visible' }}
    >
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Gradient for connections */}
          <linearGradient id="mapping-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Render existing mappings */}
        {mappings.map((mapping) => {
          const coords = connectionCoords.get(mapping.id);
          if (!coords) return null;

          return (
            <MappingConnection
              key={mapping.id}
              mapping={mapping}
              startX={coords.startX}
              startY={coords.startY}
              endX={coords.endX}
              endY={coords.endY}
              isSelected={activeMappingId === mapping.id}
              sourceType={getSourceType(mapping.sourcePath)}
              onSelect={onSelectMapping}
              onDelete={onDeleteMapping}
            />
          );
        })}

        {/* Render drag connection */}
        {isDragging && dragCoords && dragSourceField && (
          <DragConnection
            startX={dragCoords.startX}
            startY={dragCoords.startY}
            endX={dragCoords.endX}
            endY={dragCoords.endY}
            sourceType={dragSourceField.type}
          />
        )}
      </svg>
    </div>
  );
}
