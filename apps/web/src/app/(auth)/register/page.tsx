'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, Workflow, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre',
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

// Password strength checker
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Faible', color: 'bg-red-500' };
  if (score <= 4) return { score, label: 'Moyen', color: 'bg-yellow-500' };
  return { score, label: 'Fort', color: 'bg-green-500' };
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');
  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    try {
      await registerUser(data.email, data.password, data.name);
      toast({ title: 'Compte créé avec succès !' });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l\'inscription');
    }
  };

  const passwordRequirements = [
    { label: 'Au moins 8 caractères', met: password.length >= 8 },
    { label: 'Une lettre majuscule', met: /[A-Z]/.test(password) },
    { label: 'Une lettre minuscule', met: /[a-z]/.test(password) },
    { label: 'Un chiffre', met: /\d/.test(password) },
  ];

  return (
    <div className="flex min-h-screen bg-[#0f0f1a]">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-[#1a1a2e] to-[#0f0f1a] p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/20 p-2.5">
              <Workflow className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold text-white">WS-Flows</span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Rejoignez des milliers<br />
            <span className="text-primary">d'utilisateurs</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-md">
            Créez votre compte gratuitement et commencez à automatiser vos tâches dès aujourd'hui.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/20 p-1">
                <Check className="h-4 w-4 text-green-400" />
              </div>
              <span className="text-gray-300">Installation en quelques minutes</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/20 p-1">
                <Check className="h-4 w-4 text-green-400" />
              </div>
              <span className="text-gray-300">Aucune carte de crédit requise</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500/20 p-1">
                <Check className="h-4 w-4 text-green-400" />
              </div>
              <span className="text-gray-300">Support communautaire inclus</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          © 2024 WS-Flows. Tous droits réservés.
        </p>
      </div>

      {/* Right side - Register form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="rounded-xl bg-primary/20 p-2.5">
              <Workflow className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold text-white">WS-Flows</span>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white">Créer un compte</h2>
            <p className="text-gray-500">
              Remplissez le formulaire pour commencer
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Nom complet
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    id="name"
                    placeholder="Jean Dupont"
                    className="pl-10 h-12 bg-[#1a1a2e] border-gray-700 text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary rounded-xl"
                    {...register('name')}
                  />
                </div>
                {errors.name && (
                  <p className="text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Adresse email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@exemple.com"
                    className="pl-10 h-12 bg-[#1a1a2e] border-gray-700 text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary rounded-xl"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-12 bg-[#1a1a2e] border-gray-700 text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary rounded-xl"
                    {...register('password')}
                  />
                </div>

                {/* Password strength indicator */}
                {password && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full transition-all', passwordStrength.color)}
                          style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                        />
                      </div>
                      <span className={cn(
                        'text-xs font-medium',
                        passwordStrength.score <= 2 ? 'text-red-400' :
                        passwordStrength.score <= 4 ? 'text-yellow-400' : 'text-green-400'
                      )}>
                        {passwordStrength.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {passwordRequirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className={cn(
                            'h-1.5 w-1.5 rounded-full transition-colors',
                            req.met ? 'bg-green-400' : 'bg-gray-600'
                          )} />
                          <span className={cn(
                            'text-xs transition-colors',
                            req.met ? 'text-gray-400' : 'text-gray-600'
                          )}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">
                  Confirmer le mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-12 bg-[#1a1a2e] border-gray-700 text-white placeholder:text-gray-500 focus:border-primary focus:ring-primary rounded-xl"
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-medium bg-primary hover:bg-primary/90 transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  Créer mon compte
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-gray-500">
              En créant un compte, vous acceptez nos{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Conditions d'utilisation
              </Link>{' '}
              et notre{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Politique de confidentialité
              </Link>
            </p>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[#0f0f1a] px-4 text-gray-500">
                Déjà un compte ?
              </span>
            </div>
          </div>

          <Link href="/login" className="block">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl text-base font-medium border-gray-700 bg-transparent text-white hover:bg-[#1a1a2e] hover:text-white transition-all"
            >
              Se connecter
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
