'use client';

import { useState, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TypeBadge, TypeDot } from './type-badge';
import type { FieldSchema } from '@/types/mapping.types';

interface FieldNodeProps {
  field: FieldSchema;
  depth?: number;
  side: 'source' | 'target';
  isConnected?: boolean;
  isDragSource?: boolean;
  isDropTarget?: boolean;
  isValidDropTarget?: boolean;
  onDragStart?: (field: FieldSchema, element: HTMLElement) => void;
  onDragEnd?: () => void;
  onDrop?: (field: FieldSchema) => void;
  onFieldClick?: (field: FieldSchema) => void;
  fieldRef?: (path: string, element: HTMLElement | null) => void;
}

export function FieldNode({
  field,
  depth = 0,
  side,
  isConnected = false,
  isDragSource = false,
  isDropTarget = false,
  isValidDropTarget = false,
  onDragStart,
  onDragEnd,
  onDrop,
  onFieldClick,
  fieldRef,
}: FieldNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const elementRef = useRef<HTMLDivElement>(null);
  const hasChildren = field.children && field.children.length > 0;

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (side !== 'source' || !elementRef.current) return;

      e.dataTransfer.effectAllowed = 'link';
      e.dataTransfer.setData('application/json', JSON.stringify(field));

      // Create custom drag image
      const dragImage = elementRef.current.cloneNode(true) as HTMLElement;
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      dragImage.style.opacity = '0.9';
      dragImage.style.transform = 'scale(1.05)';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);

      onDragStart?.(field, elementRef.current);
    },
    [field, side, onDragStart]
  );

  const handleDragEnd = useCallback(() => {
    onDragEnd?.();
  }, [onDragEnd]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (side !== 'target' || !isValidDropTarget) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'link';
    },
    [side, isValidDropTarget]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (side !== 'target') return;
      e.preventDefault();
      onDrop?.(field);
    },
    [side, field, onDrop]
  );

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setIsExpanded((prev) => !prev);
    }
    onFieldClick?.(field);
  }, [hasChildren, field, onFieldClick]);

  // Register element ref for drawing connections
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      (elementRef as any).current = el;
      fieldRef?.(field.path, el);
    },
    [field.path, fieldRef]
  );

  const indentPx = depth * 16;

  return (
    <div className="select-none">
      <div
        ref={setRef}
        data-field-path={field.path}
        data-field-side={side}
        draggable={side === 'source'}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'group flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer',
          'hover:bg-gray-800/50',
          isDragSource && 'bg-purple-900/30 ring-1 ring-purple-500',
          isDropTarget && isValidDropTarget && 'bg-green-900/30 ring-1 ring-green-500',
          isDropTarget && !isValidDropTarget && 'bg-red-900/20 ring-1 ring-red-500/50',
          isConnected && 'bg-blue-900/20'
        )}
        style={{ paddingLeft: `${indentPx + 8}px` }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className="p-0.5 rounded hover:bg-gray-700"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-gray-400" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-400" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Drag handle for source */}
        {side === 'source' && (
          <GripVertical className="h-3 w-3 text-gray-500 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing" />
        )}

        {/* Type dot */}
        <TypeDot type={field.type} />

        {/* Field name */}
        <span className="flex-1 text-sm text-white truncate font-medium">
          {field.name}
          {field.isArray && (
            <span className="text-gray-500 ml-0.5">[]</span>
          )}
        </span>

        {/* Type badge */}
        <TypeBadge type={field.type} />

        {/* Connected indicator */}
        {isConnected && (
          <span className="w-2 h-2 rounded-full bg-blue-500" />
        )}

        {/* Drop zone indicator for target */}
        {side === 'target' && (
          <div
            className={cn(
              'w-3 h-3 rounded-full border-2 transition-colors',
              isDropTarget && isValidDropTarget
                ? 'border-green-500 bg-green-500'
                : isDropTarget && !isValidDropTarget
                  ? 'border-red-500'
                  : 'border-gray-600 group-hover:border-gray-500'
            )}
          />
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-2">
          {field.children!.map((child) => (
            <FieldNode
              key={child.path}
              field={child}
              depth={depth + 1}
              side={side}
              isConnected={isConnected}
              isDragSource={isDragSource}
              isDropTarget={isDropTarget}
              isValidDropTarget={isValidDropTarget}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              onFieldClick={onFieldClick}
              fieldRef={fieldRef}
            />
          ))}
        </div>
      )}
    </div>
  );
}
