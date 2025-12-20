'use client';

import { useCollaborationStore, useFollowers } from '@/stores/collaboration.store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FollowIndicatorProps {
  className?: string;
}

export function FollowIndicator({ className }: FollowIndicatorProps) {
  const followingUserId = useCollaborationStore((s) => s.followingUserId);
  const collaborators = useCollaborationStore((s) => s.collaborators);
  const stopFollowing = useCollaborationStore((s) => s.stopFollowing);
  const followers = useFollowers();

  const followingUser = followingUserId ? collaborators.get(followingUserId) : null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AnimatePresence>
      {/* Following indicator */}
      {followingUser && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            'fixed top-4 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-3 px-4 py-2 rounded-full',
            'bg-background/95 backdrop-blur border shadow-lg',
            className
          )}
        >
          <Eye className="w-4 h-4 text-primary animate-pulse" />

          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6" style={{ borderColor: followingUser.color }}>
              {followingUser.avatar && (
                <AvatarImage src={followingUser.avatar} alt={followingUser.name} />
              )}
              <AvatarFallback
                className="text-[10px] text-white"
                style={{ backgroundColor: followingUser.color }}
              >
                {getInitials(followingUser.name)}
              </AvatarFallback>
            </Avatar>

            <span className="text-sm font-medium">Vous suivez {followingUser.name}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => stopFollowing()}
          >
            <EyeOff className="w-4 h-4 mr-1" />
            Arrêter
          </Button>
        </motion.div>
      )}

      {/* Being followed indicator */}
      {followers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={cn(
            'fixed bottom-4 left-4 z-50',
            'flex items-center gap-2 px-3 py-1.5 rounded-full',
            'bg-primary/10 border border-primary/20',
            className
          )}
        >
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm">
            {followers.length} personne{followers.length > 1 ? 's' : ''} vous sui
            {followers.length > 1 ? 'vent' : 't'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Simple badge showing follow status
 */
export function FollowBadge({ className }: { className?: string }) {
  const followingUserId = useCollaborationStore((s) => s.followingUserId);
  const followers = useFollowers();

  if (!followingUserId && followers.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {followingUserId && (
        <Badge variant="secondary" className="gap-1">
          <Eye className="w-3 h-3" />
          Suivi
        </Badge>
      )}

      {followers.length > 0 && (
        <Badge variant="outline" className="gap-1">
          <Users className="w-3 h-3" />
          {followers.length}
        </Badge>
      )}
    </div>
  );
}
