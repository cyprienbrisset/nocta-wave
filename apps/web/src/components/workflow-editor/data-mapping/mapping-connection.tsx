'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateBezierPath } from './hooks/use-mapping-drag';
import type { FieldMapping } from '@/types/mapping.types';
import { typeColors, type DataType } from '@/types/mapping.types';

interface MappingConnectionProps {
  mapping: FieldMapping;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isSelected: boolean;
  sourceType?: DataType;
  onSelect: (mappingId: string) => void;
  onDelete: (mappingId: string) => void;
}

export function MappingConnection({
  mapping,
  startX,
  startY,
  endX,
  endY,
  isSelected,
  sourceType = 'unknown',
  onSelect,
  onDelete,
}: MappingConnectionProps) {
  const path = useMemo(
    () => calculateBezierPath(startX, startY, endX, endY),
    [startX, startY, endX, endY]
  );

  const color = typeColors[sourceType];
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  return (
    <g className="mapping-connection group">
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
        onClick={() => onSelect(mapping.id)}
      />

      {/* Visible path */}
      <path
        d={path}
        fill="none"
        stroke={isSelected ? color : `${color}80`}
        strokeWidth={isSelected ? 3 : 2}
        strokeLinecap="round"
        className={cn(
          'transition-all duration-200',
          'group-hover:stroke-[3px]',
          isSelected && 'filter drop-shadow-lg'
        )}
        style={{
          filter: isSelected ? `drop-shadow(0 0 4px ${color})` : undefined,
        }}
      />

      {/* Start circle */}
      <circle
        cx={startX}
        cy={startY}
        r={4}
        fill={color}
        className="transition-all"
      />

      {/* End circle */}
      <circle
        cx={endX}
        cy={endY}
        r={4}
        fill={color}
        className="transition-all"
      />

      {/* Delete button on hover/select */}
      {isSelected && (
        <g
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(mapping.id);
          }}
        >
          <circle
            cx={midX}
            cy={midY}
            r={10}
            fill="#1a1a2e"
            stroke="#ef4444"
            strokeWidth={2}
            className="transition-all hover:fill-red-900/50"
          />
          <g transform={`translate(${midX - 5}, ${midY - 5})`}>
            <X className="h-2.5 w-2.5 text-red-400" width={10} height={10} />
          </g>
        </g>
      )}

      {/* Expression indicator */}
      {mapping.expression && (
        <g transform={`translate(${midX}, ${midY + 20})`}>
          <rect
            x={-20}
            y={-8}
            width={40}
            height={16}
            rx={4}
            fill="#1a1a2e"
            stroke={color}
            strokeWidth={1}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fill={color}
            fontSize={9}
            fontFamily="monospace"
          >
            fx
          </text>
        </g>
      )}
    </g>
  );
}

interface DragConnectionProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  sourceType?: DataType;
}

export function DragConnection({
  startX,
  startY,
  endX,
  endY,
  sourceType = 'unknown',
}: DragConnectionProps) {
  const path = useMemo(
    () => calculateBezierPath(startX, startY, endX, endY),
    [startX, startY, endX, endY]
  );

  const color = typeColors[sourceType];

  return (
    <g className="drag-connection pointer-events-none">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="8 4"
        strokeLinecap="round"
        className="animate-pulse"
      />
      <circle cx={startX} cy={startY} r={4} fill={color} />
      <circle
        cx={endX}
        cy={endY}
        r={6}
        fill="transparent"
        stroke={color}
        strokeWidth={2}
        className="animate-ping"
      />
    </g>
  );
}
