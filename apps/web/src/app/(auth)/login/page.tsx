'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/components/ui/use-toast';

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      await login(data.email, data.password);
      toast({ title: 'Bon retour parmi nous !' });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la connexion');
    }
  };

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
            Automatisez vos workflows<br />
            <span className="text-primary">en toute simplicité</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-md">
            Créez, gérez et exécutez vos automatisations avec une interface visuelle intuitive.
          </p>
          <div className="flex items-center gap-8 pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">40+</p>
              <p className="text-sm text-gray-500">Intégrations</p>
            </div>
            <div className="h-12 w-px bg-gray-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">100%</p>
              <p className="text-sm text-gray-500">Open Source</p>
            </div>
            <div className="h-12 w-px bg-gray-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">0</p>
              <p className="text-sm text-gray-500">Limite</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          © 2024 WS-Flows. Tous droits réservés.
        </p>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="rounded-xl bg-primary/20 p-2.5">
              <Workflow className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold text-white">WS-Flows</span>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white">Connexion</h2>
            <p className="text-gray-500">
              Entrez vos identifiants pour accéder à votre espace
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-300">
                    Mot de passe
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
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
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
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
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[#0f0f1a] px-4 text-gray-500">
                Pas encore de compte ?
              </span>
            </div>
          </div>

          <Link href="/register" className="block">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl text-base font-medium border-gray-700 bg-transparent text-white hover:bg-[#1a1a2e] hover:text-white transition-all"
            >
              Créer un compte
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
