'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users,
  Eye,
  MessageSquare,
  Edit3,
  Loader2,
  AlertCircle,
  ArrowRight,
  Shield,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  collaborationLinksApi,
  CollaborationLinkInfo,
  CollaborationPermission,
} from '@/lib/api/collaboration';

const joinSchema = z.object({
  guestName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
});

type JoinForm = z.infer<typeof joinSchema>;

const permissionLabels: Record<CollaborationPermission, { label: string; description: string; icon: typeof Eye }> = {
  VIEW: {
    label: 'Lecture seule',
    description: 'Vous pouvez voir le workflow mais pas le modifier',
    icon: Eye,
  },
  COMMENT: {
    label: 'Commentaires',
    description: 'Vous pouvez voir et commenter le workflow',
    icon: MessageSquare,
  },
  EDIT: {
    label: 'Edition',
    description: 'Vous pouvez voir et modifier le workflow',
    icon: Edit3,
  },
};

export default function CollaboratePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [linkInfo, setLinkInfo] = useState<CollaborationLinkInfo | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinForm>({
    resolver: zodResolver(joinSchema),
  });

  // Validate the link on mount
  useEffect(() => {
    const validateLink = async () => {
      try {
        const info = await collaborationLinksApi.getLinkInfo(token);
        if (!info.isValid) {
          setValidationError('Ce lien de collaboration n\'est plus valide');
        } else {
          setLinkInfo(info);
        }
      } catch (error) {
        setValidationError(
          error instanceof Error ? error.message : 'Lien invalide ou expiré'
        );
      } finally {
        setIsValidating(false);
      }
    };

    validateLink();
  }, [token]);

  const onSubmit = async (data: JoinForm) => {
    setJoinError(null);
    setIsJoining(true);

    try {
      const guestInfo = await collaborationLinksApi.joinAsGuest(token, data.guestName);

      // Store the guest session in sessionStorage
      sessionStorage.setItem('guestSession', JSON.stringify(guestInfo));

      // Redirect to the workflow editor with guest mode
      router.push(`/collaborate/${token}/editor`);
    } catch (error) {
      setJoinError(
        error instanceof Error ? error.message : 'Impossible de rejoindre la session'
      );
    } finally {
      setIsJoining(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Validation du lien...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (validationError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6 text-center animate-fade-in-up">
          <div className="mx-auto rounded-full bg-red-500/10 p-4 w-fit">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Lien invalide</h1>
            <p className="text-muted-foreground">{validationError}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="mt-4"
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  // Join form
  if (linkInfo) {
    const PermissionIcon = permissionLabels[linkInfo.permission].icon;

    return (
      <div className="flex min-h-screen bg-background">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-900/20 to-background" />
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            <div>
              <div className="flex items-center gap-3">
                <Image
                  src="/logo-nocta-wave.png"
                  alt="Nocta-Wave"
                  width={48}
                  height={48}
                  className="rounded-xl shadow-lg shadow-primary/30"
                />
                <div className="flex flex-col">
                  <span className="text-2xl font-bold gradient-text">Nocta-Wave</span>
                  <span className="text-xs text-muted-foreground">Workflow Automation</span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                  Collaboration<br />
                  <span className="gradient-text">en temps réel</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-md">
                  Vous avez été invité à collaborer sur un workflow. Rejoignez la session pour commencer.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <div className="rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Collaboration instantanée</p>
                    <p className="text-sm text-muted-foreground">Travaillez ensemble en temps réel</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <div className="rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Session sécurisée</p>
                    <p className="text-sm text-muted-foreground">Pas besoin de créer un compte</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Powered by Nocta-Wave
            </p>
          </div>
        </div>

        {/* Right side - Join form */}
        <div className="flex w-full lg:w-1/2 items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md space-y-8 animate-fade-in-up">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <Image
                src="/logo-nocta-wave.png"
                alt="Nocta-Wave"
                width={40}
                height={40}
                className="rounded-xl shadow-lg shadow-primary/20"
              />
              <span className="text-2xl font-bold gradient-text">Nocta-Wave</span>
            </div>

            {/* Header */}
            <div className="space-y-4 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-foreground">
                Rejoindre le workflow
              </h2>
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-lg font-medium text-foreground mb-1">
                  {linkInfo.workflowName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Partagé par {linkInfo.creatorName}
                </p>
              </div>
            </div>

            {/* Permission info */}
            <div className="flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 p-4">
              <PermissionIcon className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-medium text-foreground">
                  {permissionLabels[linkInfo.permission].label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {permissionLabels[linkInfo.permission].description}
                </p>
              </div>
            </div>

            {/* Expiration info */}
            {linkInfo.expiresAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Expire le {new Date(linkInfo.expiresAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {joinError && (
                <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 animate-scale-in">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-500">{joinError}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="guestName" className="text-foreground">
                  Votre nom
                </Label>
                <Input
                  id="guestName"
                  type="text"
                  placeholder="Entrez votre nom"
                  className="h-12 bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all"
                  {...register('guestName')}
                />
                {errors.guestName && (
                  <p className="text-sm text-red-500 animate-fade-in">
                    {errors.guestName.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="btn-primary w-full h-12 text-base"
                disabled={isJoining}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    Rejoindre la session
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              En rejoignant, vous acceptez de collaborer de manière respectueuse.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
