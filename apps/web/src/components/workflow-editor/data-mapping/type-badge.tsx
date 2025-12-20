'use client';

import { cn } from '@/lib/utils';
import type { DataType } from '@/types/mapping.types';
import { typeColors, typeLabels } from '@/types/mapping.types';

interface TypeBadgeProps {
  type: DataType;
  size?: 'sm' | 'md';
  className?: string;
}

export function TypeBadge({ type, size = 'sm', className }: TypeBadgeProps) {
  const bgColor = typeColors[type];

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-mono font-medium',
        size === 'sm' ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5',
        className
      )}
      style={{
        backgroundColor: `${bgColor}20`,
        color: bgColor,
        border: `1px solid ${bgColor}40`,
      }}
    >
      {typeLabels[type]}
    </span>
  );
}

interface TypeDotProps {
  type: DataType;
  size?: 'sm' | 'md';
  className?: string;
}

export function TypeDot({ type, size = 'sm', className }: TypeDotProps) {
  const color = typeColors[type];

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5',
        className
      )}
      style={{
        backgroundColor: color,
        boxShadow: `0 0 4px ${color}60`,
      }}
    />
  );
}
