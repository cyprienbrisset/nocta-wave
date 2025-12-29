'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, ChevronDown, ChevronRight, MoreHorizontal, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavoritesStore, FavoriteWorkflow } from '@/stores/favorites.store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface FavoritesListProps {
  className?: string;
  collapsed?: boolean;
}

export function FavoritesList({ className, collapsed = false }: FavoritesListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { favorites, isLoading, removeFavorite } = useFavoritesStore();

  const handleRemoveFavorite = async (workflowId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await fetch(`/api/favorites/${workflowId}`, { method: 'DELETE' });
      removeFavorite(workflowId);
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  if (collapsed) {
    return (
      <div className={cn('px-2', className)}>
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-8"
          title="Favorites"
        >
          <Star className="h-4 w-4 text-yellow-500" />
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
          <Star className="h-4 w-4 text-yellow-500" />
          <span>Favorites</span>
          {favorites.length > 0 && (
            <span className="text-xs text-muted-foreground">({favorites.length})</span>
          )}
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
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : favorites.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No favorites yet. Click the star icon on any workflow to add it here.
            </p>
          ) : (
            favorites.map((workflow) => (
              <FavoriteItem
                key={workflow.id}
                workflow={workflow}
                onRemove={handleRemoveFavorite}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface FavoriteItemProps {
  workflow: FavoriteWorkflow;
  onRemove: (id: string, e: React.MouseEvent) => void;
}

function FavoriteItem({ workflow, onRemove }: FavoriteItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Link
      href={`/workflows/${workflow.id}`}
      className="group flex items-center justify-between px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors"
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{workflow.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {workflow.team.name}
        </p>
      </div>

      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/workflows/${workflow.id}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in new tab
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => onRemove(workflow.id, e as unknown as React.MouseEvent)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove from favorites
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </Link>
  );
}

export default FavoritesList;
