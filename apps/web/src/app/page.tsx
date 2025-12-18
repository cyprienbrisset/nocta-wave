'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    // Vérifier l'état d'authentification au chargement
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    // Rediriger une fois que le chargement est terminé
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Afficher un loader pendant la vérification
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f1a]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-gray-500">Chargement...</p>
      </div>
    </div>
  );
}
