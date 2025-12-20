'use client';

import { useState } from 'react';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  History,
  Plus,
  Pencil,
  Trash2,
  Move,
  Link,
  Unlink,
  Settings,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ChangeType, WorkflowChangeData } from '@ws-flows/shared';

const changeTypeConfig: Record<ChangeType, { icon: typeof Plus; label: string; color: string }> = {
  NODE_ADDED: { icon: Plus, label: 'Ajouté', color: 'text-green-500' },
  NODE_UPDATED: { icon: Pencil, label: 'Modifié', color: 'text-blue-500' },
  NODE_DELETED: { icon: Trash2, label: 'Supprimé', color: 'text-red-500' },
  NODE_MOVED: { icon: Move, label: 'Déplacé', color: 'text-orange-500' },
  EDGE_ADDED: { icon: Link, label: 'Connexion ajoutée', color: 'text-green-500' },
  EDGE_DELETED: { icon: Unlink, label: 'Connexion supprimée', color: 'text-red-500' },
  CONFIG_CHANGED: { icon: Settings, label: 'Configuration', color: 'text-purple-500' },
  SETTINGS_CHANGED: { icon: GitBranch, label: 'Paramètres', color: 'text-purple-500' },
};

interface ChangeItemProps {
  change: WorkflowChangeData;
  onFocusNode?: (nodeId: string) => void;
}

function ChangeItem({ change, onFocusNode }: ChangeItemProps) {
  const config = changeTypeConfig[change.changeType];
  const Icon = config.icon;

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: fr,
    });
  };

  const handleClick = () => {
    if (change.nodeId && onFocusNode) {
      onFocusNode(change.nodeId);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors',
        change.nodeId && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={handleClick}
    >
      <Avatar className="w-8 h-8 flex-shrink-0">
        {change.user.avatar && (
          <AvatarImage src={change.user.avatar} alt={change.user.name || ''} />
        )}
        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
          {getInitials(change.user.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', config.color)} />
          <span className="font-medium text-sm">
            {change.user.name || change.user.email.split('@')[0]}
          </span>
        </div>

        <p className="text-sm text-muted-foreground mt-0.5">
          {change.description || config.label}
        </p>

        <p className="text-xs text-muted-foreground mt-1">{formatTime(change.createdAt)}</p>
      </div>

      <Badge variant="secondary" className="flex-shrink-0 text-xs">
        {config.label}
      </Badge>
    </div>
  );
}

interface ChangeHistoryProps {
  className?: string;
  onFocusNode?: (nodeId: string) => void;
}

export function ChangeHistory({ className, onFocusNode }: ChangeHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const recentChanges = useCollaborationStore((s) => s.recentChanges);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className={cn('relative', className)}>
          <History className="w-4 h-4" />
          {recentChanges.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-96 p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des modifications
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="py-2">
            {recentChanges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Aucune modification récente</p>
                <p className="text-xs">Les changements apparaîtront ici en temps réel</p>
              </div>
            ) : (
              recentChanges.map((change) => (
                <ChangeItem key={change.id} change={change} onFocusNode={onFocusNode} />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Inline change indicator for the editor toolbar
 */
export function ChangeIndicator({ className }: { className?: string }) {
  const recentChanges = useCollaborationStore((s) => s.recentChanges);
  const lastChange = recentChanges[0];

  if (!lastChange) return null;

  const config = changeTypeConfig[lastChange.changeType];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Icon className={cn('w-4 h-4', config.color)} />
      <span>
        {lastChange.user.name || lastChange.user.email.split('@')[0]}{' '}
        {lastChange.description || config.label.toLowerCase()}
      </span>
    </div>
  );
}
