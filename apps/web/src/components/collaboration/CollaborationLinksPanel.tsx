'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Link2,
  Plus,
  Copy,
  Trash2,
  Eye,
  MessageSquare,
  Edit3,
  Clock,
  Users,
  X,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  collaborationLinksApi,
  CollaborationLink,
  CollaborationPermission,
} from '@/lib/api/collaboration';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const createLinkSchema = z.object({
  name: z.string().optional(),
  permission: z.enum(['VIEW', 'COMMENT', 'EDIT']),
  maxUses: z.number().min(1).optional().nullable(),
  expiresInHours: z.number().min(1).optional().nullable(),
});

type CreateLinkForm = z.infer<typeof createLinkSchema>;

const permissionConfig: Record<CollaborationPermission, { label: string; icon: typeof Eye; description: string }> = {
  VIEW: {
    label: 'Lecture seule',
    icon: Eye,
    description: 'Peut voir le workflow',
  },
  COMMENT: {
    label: 'Commentaires',
    icon: MessageSquare,
    description: 'Peut voir et commenter',
  },
  EDIT: {
    label: 'Edition',
    icon: Edit3,
    description: 'Peut voir et modifier',
  },
};

interface CollaborationLinksPanelProps {
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CollaborationLinksPanel({
  workflowId,
  isOpen,
  onClose,
}: CollaborationLinksPanelProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['collaboration-links', workflowId],
    queryFn: () => collaborationLinksApi.getByWorkflow(workflowId),
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateLinkForm>({
    resolver: zodResolver(createLinkSchema),
    defaultValues: {
      permission: 'VIEW',
      maxUses: null,
      expiresInHours: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLinkForm) =>
      collaborationLinksApi.create({
        workflowId,
        name: data.name,
        permission: data.permission,
        maxUses: data.maxUses || undefined,
        expiresInHours: data.expiresInHours || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaboration-links', workflowId] });
      toast({ title: 'Lien de collaboration créé' });
      reset();
      setIsCreating(false);
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de créer le lien',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (linkId: string) => collaborationLinksApi.delete(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaboration-links', workflowId] });
      toast({ title: 'Lien supprimé' });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de supprimer le lien',
        variant: 'destructive',
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (linkId: string) => collaborationLinksApi.deactivate(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaboration-links', workflowId] });
      toast({ title: 'Lien désactivé' });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de désactiver le lien',
        variant: 'destructive',
      });
    },
  });

  const copyLink = async (link: CollaborationLink) => {
    const url = `${window.location.origin}/collaborate/${link.token}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedId(link.id);
      toast({ title: 'Lien copié !' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de copier le lien',
        variant: 'destructive'
      });
    }
  };

  const onSubmit = (data: CreateLinkForm) => {
    createMutation.mutate(data);
  };

  const activeLinks = links.filter((l) => l.isActive);
  const inactiveLinks = links.filter((l) => !l.isActive);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg bg-[#1a1a2e] border-gray-800">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-white">
            <Link2 className="h-5 w-5 text-primary" />
            Liens de collaboration
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            Partagez ce workflow avec des utilisateurs externes sans compte
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Create new link */}
          {isCreating ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg bg-gray-800/50 p-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Nom du lien (optionnel)</Label>
                <Input
                  {...register('name')}
                  placeholder="Ex: Pour l'équipe marketing"
                  className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Permission</Label>
                <Select
                  value={watch('permission')}
                  onValueChange={(value: CollaborationPermission) => setValue('permission', value)}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {Object.entries(permissionConfig).map(([value, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={value} value={value} className="text-white hover:bg-gray-800">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span>{config.label}</span>
                            <span className="text-gray-500 text-xs">- {config.description}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Utilisations max</Label>
                  <Input
                    type="number"
                    min={1}
                    {...register('maxUses', { valueAsNumber: true })}
                    placeholder="Illimité"
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Expire dans (heures)</Label>
                  <Input
                    type="number"
                    min={1}
                    {...register('expiresInHours', { valueAsNumber: true })}
                    placeholder="Jamais"
                    className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false);
                    reset();
                  }}
                  className="flex-1 text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Créer le lien'
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              onClick={() => setIsCreating(true)}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Créer un lien de collaboration
            </Button>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Active links */}
          {!isLoading && activeLinks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-400">Liens actifs ({activeLinks.length})</h3>
              {activeLinks.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  isCopied={copiedId === link.id}
                  onCopy={() => copyLink(link)}
                  onDeactivate={() => deactivateMutation.mutate(link.id)}
                  onDelete={() => deleteMutation.mutate(link.id)}
                  isDeactivating={deactivateMutation.isPending}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Inactive links */}
          {!isLoading && inactiveLinks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-500">Liens désactivés ({inactiveLinks.length})</h3>
              {inactiveLinks.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  isCopied={false}
                  isInactive
                  onCopy={() => {}}
                  onDeactivate={() => {}}
                  onDelete={() => deleteMutation.mutate(link.id)}
                  isDeactivating={false}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && links.length === 0 && (
            <div className="text-center py-8">
              <Link2 className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Aucun lien de collaboration</p>
              <p className="text-sm text-gray-500 mt-1">
                Créez un lien pour inviter des collaborateurs externes
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface LinkCardProps {
  link: CollaborationLink;
  isCopied: boolean;
  isInactive?: boolean;
  onCopy: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  isDeactivating: boolean;
  isDeleting: boolean;
}

function LinkCard({
  link,
  isCopied,
  isInactive,
  onCopy,
  onDeactivate,
  onDelete,
  isDeactivating,
  isDeleting,
}: LinkCardProps) {
  const PermIcon = permissionConfig[link.permission].icon;
  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
  const isMaxUsed = link.maxUses && link.useCount >= link.maxUses;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-3',
        isInactive ? 'bg-gray-900/50 border-gray-800 opacity-60' : 'bg-gray-800/50 border-gray-700'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {link.name ? (
            <p className="font-medium text-white truncate">{link.name}</p>
          ) : (
            <p className="text-gray-400 text-sm">Lien sans nom</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <PermIcon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-gray-400">{permissionConfig[link.permission].label}</span>
          </div>
        </div>

        {!isInactive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="h-8 px-2 text-gray-400 hover:text-white hover:bg-gray-700"
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Link URL */}
      {!isInactive && (
        <div className="bg-gray-900 rounded px-3 py-2 border border-gray-700">
          <code className="text-xs text-gray-300 break-all select-all">
            {typeof window !== 'undefined' ? `${window.location.origin}/collaborate/${link.token}` : `/collaborate/${link.token}`}
          </code>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <span>
            {link.useCount}
            {link.maxUses && ` / ${link.maxUses}`} utilisations
          </span>
        </div>
        {link.expiresAt && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {isExpired ? (
                <span className="text-red-400">Expiré</span>
              ) : (
                `Expire ${new Date(link.expiresAt).toLocaleDateString('fr-FR')}`
              )}
            </span>
          </div>
        )}
      </div>

      {/* Warnings */}
      {(isExpired || isMaxUsed) && !isInactive && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/20 rounded px-2 py-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{isExpired ? 'Ce lien a expiré' : 'Limite d\'utilisations atteinte'}</span>
        </div>
      )}

      {/* Actions */}
      {!isInactive && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeactivate}
            disabled={isDeactivating}
            className="h-7 text-xs text-gray-400 hover:text-amber-400 hover:bg-amber-900/20"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Désactiver
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-400 hover:text-red-400 hover:bg-red-900/20"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Supprimer ce lien ?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  Cette action est irréversible. Les personnes ayant ce lien ne pourront plus accéder au workflow.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Supprimer'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {isInactive && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-gray-500 hover:text-red-400 hover:bg-red-900/20"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Supprimer définitivement
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Supprimer ce lien ?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Supprimer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
