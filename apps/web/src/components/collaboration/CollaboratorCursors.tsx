'use client';

import { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { useViewport } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CursorPosition } from '@ws-flows/shared';

export interface ExternalCursor {
  userId: string;
  name: string;
  color: string;
  position: CursorPosition;
}

interface CollaboratorCursorsProps {
  /** Current user ID to filter out their own cursor */
  currentUserId?: string;
  /** External cursors data - required for this component */
  externalCursors: ExternalCursor[];
}

const CursorSVG = memo(function CursorSVG({ color }: { color: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
    >
      <path
        d="M5.65376 12.4561C5.45795 13.0458 5.36004 13.3407 5.40654 13.5438C5.44724 13.7211 5.5579 13.8755 5.71327 13.9724C5.89206 14.0841 6.20328 14.0435 6.82571 13.9624L17.8421 12.5308C18.6396 12.4271 19.0384 12.3752 19.2111 12.1831C19.3605 12.0166 19.4236 11.7898 19.3812 11.5702C19.3324 11.3185 19.0194 11.0659 18.3935 10.5607L7.82883 2.0263C7.33442 1.62625 7.08722 1.42622 6.86719 1.42131C6.67529 1.41703 6.49316 1.50376 6.37516 1.65483C6.23972 1.82818 6.24872 2.1454 6.26672 2.77985L6.65195 16.2015C6.67197 16.9068 6.68198 17.2595 6.79955 17.4955C6.90259 17.7021 7.0699 17.8679 7.27759 17.9686C7.51489 18.0841 7.86816 18.0916 8.5747 18.1068L19.4011 18.339C20.2015 18.3561 20.6017 18.3647 20.7939 18.1987C20.9608 18.0544 21.0512 17.8404 21.0388 17.6198C21.0246 17.3651 20.7455 17.0802 20.1875 16.5103L10.2162 6.37482"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

const CollaboratorCursor = memo(function CollaboratorCursor({
  name,
  color,
  x,
  y,
}: {
  name: string;
  color: string;
  x: number;
  y: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1, x, y }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.5,
      }}
      className="absolute top-0 left-0 pointer-events-none z-50"
      style={{ willChange: 'transform' }}
    >
      <CursorSVG color={color} />
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute left-5 top-5 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {name}
      </motion.div>
    </motion.div>
  );
});

export function CollaboratorCursors({
  currentUserId,
  externalCursors,
}: CollaboratorCursorsProps) {
  const viewport = useViewport();

  // Build cursors list from external data, filtering out current user
  const cursors = useMemo(() => {
    return externalCursors
      .filter((c) => c.userId !== currentUserId)
      .map((c) => ({
        id: c.userId,
        name: c.name,
        color: c.color,
        cursor: c.position,
      }));
  }, [externalCursors, currentUserId]);

  if (cursors.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1000 }}>
      <AnimatePresence>
        {cursors.map((collaborator) => {
          // Transform flow coordinates to screen coordinates
          const screenX = collaborator.cursor.x * viewport.zoom + viewport.x;
          const screenY = collaborator.cursor.y * viewport.zoom + viewport.y;

          return (
            <CollaboratorCursor
              key={collaborator.id}
              name={collaborator.name}
              color={collaborator.color}
              x={screenX}
              y={screenY}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook to track cursor position and convert to flow coordinates
 * Uses throttling to reduce network traffic
 */
export function useCursorTracking(
  onMove: (position: CursorPosition) => void,
  enabled: boolean = true,
  throttleMs: number = 50
) {
  const lastEmitRef = useRef<number>(0);
  const pendingPositionRef = useRef<CursorPosition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = useCallback(
    (flowPosition: CursorPosition) => {
      if (!enabled) return;

      const now = Date.now();
      const timeSinceLastEmit = now - lastEmitRef.current;

      if (timeSinceLastEmit >= throttleMs) {
        // Emit immediately
        lastEmitRef.current = now;
        onMove(flowPosition);
        pendingPositionRef.current = null;
      } else {
        // Store for later emission
        pendingPositionRef.current = flowPosition;

        // Set up delayed emission if not already scheduled
        if (!timeoutRef.current) {
          timeoutRef.current = setTimeout(() => {
            if (pendingPositionRef.current) {
              lastEmitRef.current = Date.now();
              onMove(pendingPositionRef.current);
              pendingPositionRef.current = null;
            }
            timeoutRef.current = null;
          }, throttleMs - timeSinceLastEmit);
        }
      }
    },
    [onMove, enabled, throttleMs]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return handleMouseMove;
}
