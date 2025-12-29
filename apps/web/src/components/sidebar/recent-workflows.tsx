'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Clock, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavoritesStore, RecentWorkflow } from '@/stores/favorites.store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface RecentWorkflowsProps {
  className?: string;
  collapsed?: boolean;
  maxItems?: number;
}

export function RecentWorkflows({
  className,
  collapsed = false,
  maxItems = 5
}: RecentWorkflowsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { recentWorkflows, isLoading, isFavorite, addFavorite, removeFavorite } = useFavoritesStore();

  const displayedWorkflows = recentWorkflows.slice(0, maxItems);

  const handleToggleFavorite = async (workflow: RecentWorkflow, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isCurrentlyFavorite = isFavorite(workflow.id);

    try {
      if (isCurrentlyFavorite) {
        await fetch(`/api/favorites/${workflow.id}`, { method: 'DELETE' });
        removeFavorite(workflow.id);
      } else {
        await fetch(`/api/favorites/${workflow.id}`, { method: 'POST' });
        addFavorite({
          ...workflow,
          isActive: true,
          isFavorite: true,
        });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  if (collapsed) {
    return (
      <div className={cn('px-2', className)}>
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-8"
          title="Recent workflows"
        >
          <Clock className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Recent</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-0.5 px-2">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : displayedWorkflows.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No recent workflows
            </p>
          ) : (
            displayedWorkflows.map((workflow) => (
              <RecentItem
                key={workflow.id}
                workflow={workflow}
                isFavorite={isFavorite(workflow.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface RecentItemProps {
  workflow: RecentWorkflow;
  isFavorite: boolean;
  onToggleFavorite: (workflow: RecentWorkflow, e: React.MouseEvent) => void;
}

function RecentItem({ workflow, isFavorite, onToggleFavorite }: RecentItemProps) {
  const accessedAt = new Date(workflow.accessedAt);
  const timeAgo = formatDistanceToNow(accessedAt, { addSuffix: true });

  return (
    <Link
      href={`/workflows/${workflow.id}`}
      className="group flex items-center justify-between px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{workflow.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {timeAgo}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-6 w-6 shrink-0',
          isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        onClick={(e) => onToggleFavorite(workflow, e)}
      >
        <Star
          className={cn(
            'h-4 w-4',
            isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
          )}
        />
      </Button>
    </Link>
  );
}

export default RecentWorkflows;
