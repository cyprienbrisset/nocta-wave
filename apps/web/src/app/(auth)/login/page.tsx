'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Sparkles, Shield, Globe } from 'lucide-react';
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

const features = [
  {
    icon: Sparkles,
    title: 'Automatisation visuelle',
    description: 'Créez des workflows par glisser-déposer',
  },
  {
    icon: Shield,
    title: 'Sécurisé',
    description: 'Vos données sont chiffrées de bout en bout',
  },
  {
    icon: Globe,
    title: 'Open Source',
    description: 'Auto-hébergé, sans limites',
  },
];

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
    <div className="flex min-h-screen bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-900/20 to-background" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 pattern-dots opacity-30" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <Image
                  src="/logo-nocta-wave.png"
                  alt="Nocta-Wave"
                  width={48}
                  height={48}
                  className="rounded-xl shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary to-purple-600 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-40" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold gradient-text">Nocta-Wave</span>
                <span className="text-xs text-muted-foreground">Workflow Automation</span>
              </div>
            </Link>
          </div>

          {/* Main content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                Automatisez vos<br />
                workflows <span className="gradient-text">simplement</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Créez, gérez et exécutez vos automatisations avec une interface visuelle intuitive et puissante.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/80"
                >
                  <div className="rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{feature.title}</p>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">40+</p>
                <p className="text-sm text-muted-foreground">Intégrations</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">100%</p>
                <p className="text-sm text-muted-foreground">Open Source</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold gradient-text">Illimité</p>
                <p className="text-sm text-muted-foreground">Workflows</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-sm text-muted-foreground">
            © 2024 Nocta-Wave. Open Source sous licence MIT.
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
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
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-foreground">Bon retour !</h2>
            <p className="text-muted-foreground">
              Entrez vos identifiants pour accéder à votre espace
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 animate-scale-in">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Adresse email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@exemple.com"
                    className="pl-12 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 animate-fade-in">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground">
                    Mot de passe
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-12 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-all"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 animate-fade-in">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="btn-primary w-full h-12 text-base"
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

          {/* Divider */}
          <div className="divider-text">
            Pas encore de compte ?
          </div>

          {/* Register link */}
          <Link href="/register" className="block">
            <Button
              variant="outline"
              className="btn-secondary w-full h-12 text-base"
            >
              Créer un compte gratuitement
            </Button>
          </Link>

          {/* Demo account hint */}
          <div className="text-center p-4 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Compte démo :</span>{' '}
              demo@nocta-wave.com / demo1234
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
