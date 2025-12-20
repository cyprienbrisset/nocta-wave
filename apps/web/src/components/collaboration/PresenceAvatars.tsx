'use client';

import { useCollaborators, useCollaborationStore } from '@/stores/collaboration.store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollaboratorData {
  id: string;
  name: string;
  color: string;
  email?: string;
  avatar?: string;
  isGuest?: boolean;
}

interface PresenceAvatarsProps {
  collaborators?: CollaboratorData[];
  maxVisible?: number;
  className?: string;
  showFollow?: boolean;
}

export function PresenceAvatars({
  collaborators: collaboratorsProp,
  maxVisible = 4,
  className,
  showFollow = true,
}: PresenceAvatarsProps) {
  const storeCollaborators = useCollaborators();
  const currentUser = useCollaborationStore((s) => s.currentUser);
  const followingUserId = useCollaborationStore((s) => s.followingUserId);
  const startFollowing = useCollaborationStore((s) => s.startFollowing);
  const stopFollowing = useCollaborationStore((s) => s.stopFollowing);

  // Use prop collaborators if provided, otherwise use store
  const collaborators: CollaboratorData[] = collaboratorsProp || storeCollaborators;

  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const hiddenCount = Math.max(0, collaborators.length - maxVisible);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFollowClick = async (userId: string) => {
    if (followingUserId === userId) {
      await stopFollowing();
    } else {
      await startFollowing(userId);
    }
  };

  if (collaborators.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        {/* Visible avatars */}
        <div className="flex -space-x-2">
          {visibleCollaborators.map((collaborator) => (
            <DropdownMenu key={collaborator.id}>
              <DropdownMenuTrigger asChild>
                <button className="relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded-full">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar
                        className="w-8 h-8 border-2 cursor-pointer transition-transform hover:scale-110 hover:z-10"
                        style={{ borderColor: collaborator.color }}
                      >
                        {collaborator.avatar && (
                          <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
                        )}
                        <AvatarFallback
                          className="text-xs font-medium text-white"
                          style={{ backgroundColor: collaborator.color }}
                        >
                          {getInitials(collaborator.name)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="font-medium">{collaborator.name}{collaborator.isGuest && ' (invité)'}</p>
                      {collaborator.email && (
                        <p className="text-xs text-muted-foreground">{collaborator.email}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>

                  {/* Following indicator */}
                  {followingUserId === collaborator.id && (
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                      title="Following"
                    >
                      <Eye className="w-3 h-3 text-primary-foreground" />
                    </span>
                  )}

                  {/* Online indicator */}
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background"
                    title="Online"
                  />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5">
                  <p className="font-medium text-sm">{collaborator.name}{collaborator.isGuest && ' (invité)'}</p>
                  {collaborator.email && (
                    <p className="text-xs text-muted-foreground">{collaborator.email}</p>
                  )}
                </div>

                {showFollow && !collaborator.isGuest && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleFollowClick(collaborator.id)}>
                      <Eye className="w-4 h-4 mr-2" />
                      {followingUserId === collaborator.id ? 'Arrêter de suivre' : 'Suivre la vue'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>

        {/* Overflow indicator */}
        {hiddenCount > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium hover:bg-muted/80 transition-colors">
                +{hiddenCount}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {collaborators.length} collaborateurs en ligne
                </span>
              </div>
              <DropdownMenuSeparator />
              {collaborators.slice(maxVisible).map((collaborator) => (
                <DropdownMenuItem
                  key={collaborator.id}
                  className="flex items-center gap-2"
                >
                  <Avatar className="w-6 h-6">
                    {collaborator.avatar && (
                      <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
                    )}
                    <AvatarFallback
                      className="text-[10px] text-white"
                      style={{ backgroundColor: collaborator.color }}
                    >
                      {getInitials(collaborator.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{collaborator.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Current user indicator */}
        {currentUser && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="ml-2 pl-2 border-l">
                <Avatar
                  className="w-8 h-8 border-2"
                  style={{ borderColor: currentUser.color }}
                >
                  {currentUser.avatar && (
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  )}
                  <AvatarFallback
                    className="text-xs font-medium text-white"
                    style={{ backgroundColor: currentUser.color }}
                  >
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-medium">Vous ({currentUser.name})</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
