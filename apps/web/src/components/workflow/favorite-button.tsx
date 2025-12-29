'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useFavoritesStore } from '@/stores/favorites.store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FavoriteButtonProps {
  workflowId: string;
  workflowName: string;
  workflowDescription?: string | null;
  workflowStatus?: string;
  team: { id: string; name: string };
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
}

export function FavoriteButton({
  workflowId,
  workflowName,
  workflowDescription,
  workflowStatus = 'draft',
  team,
  size = 'default',
  variant = 'ghost',
  className,
}: FavoriteButtonProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  const [isLoading, setIsLoading] = useState(false);

  const isFav = isFavorite(workflowId);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isFav) {
        await fetch(`/api/favorites/${workflowId}`, { method: 'DELETE' });
        removeFavorite(workflowId);
      } else {
        await fetch(`/api/favorites/${workflowId}`, { method: 'POST' });
        addFavorite({
          id: workflowId,
          name: workflowName,
          description: workflowDescription || null,
          status: workflowStatus,
          isActive: true,
          updatedAt: new Date(),
          team,
          isFavorite: true,
        });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const buttonSize = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="icon"
            className={cn(buttonSize, className)}
            onClick={handleToggle}
            disabled={isLoading}
          >
            <Star
              className={cn(
                iconSize,
                'transition-colors',
                isFav
                  ? 'fill-yellow-500 text-yellow-500'
                  : 'text-muted-foreground hover:text-yellow-500'
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isFav ? 'Remove from favorites' : 'Add to favorites'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default FavoriteButton;
