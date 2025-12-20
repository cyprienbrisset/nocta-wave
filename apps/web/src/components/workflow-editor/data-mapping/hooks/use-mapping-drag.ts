'use client';

import { useState, useCallback, useRef } from 'react';
import type { FieldSchema } from '@/types/mapping.types';

interface DragState {
  isDragging: boolean;
  sourceField: FieldSchema | null;
  sourceElement: HTMLElement | null;
  currentPosition: { x: number; y: number } | null;
}

export function useMappingDrag() {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    sourceField: null,
    sourceElement: null,
    currentPosition: null,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = useCallback(
    (field: FieldSchema, element: HTMLElement) => {
      setDragState({
        isDragging: true,
        sourceField: field,
        sourceElement: element,
        currentPosition: null,
      });
    },
    []
  );

  const handleDragMove = useCallback(
    (e: React.DragEvent | MouseEvent) => {
      if (!dragState.isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      setDragState((prev) => ({
        ...prev,
        currentPosition: {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        },
      }));
    },
    [dragState.isDragging]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      sourceField: null,
      sourceElement: null,
      currentPosition: null,
    });
  }, []);

  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
  }, []);

  return {
    dragState,
    containerRef: setContainerRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}

/**
 * Calculate bezier curve path between two points
 */
export function calculateBezierPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): string {
  const midX = (startX + endX) / 2;

  // Create a smooth S-curve
  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
}

/**
 * Get center position of an element relative to a container
 */
export function getElementCenter(
  element: HTMLElement,
  container: HTMLElement
): { x: number; y: number } {
  const elemRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return {
    x: elemRect.left - containerRect.left + elemRect.width / 2,
    y: elemRect.top - containerRect.top + elemRect.height / 2,
  };
}

/**
 * Get right edge position of an element (for source handles)
 */
export function getElementRightEdge(
  element: HTMLElement,
  container: HTMLElement
): { x: number; y: number } {
  const elemRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return {
    x: elemRect.right - containerRect.left,
    y: elemRect.top - containerRect.top + elemRect.height / 2,
  };
}

/**
 * Get left edge position of an element (for target handles)
 */
export function getElementLeftEdge(
  element: HTMLElement,
  container: HTMLElement
): { x: number; y: number } {
  const elemRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return {
    x: elemRect.left - containerRect.left,
    y: elemRect.top - containerRect.top + elemRect.height / 2,
  };
}
