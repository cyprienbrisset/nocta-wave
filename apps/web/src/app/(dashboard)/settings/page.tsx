'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, AlertTriangle, Save, Loader2, Keyboard, Palette, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/components/ui/use-toast';
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
import { ThemeSelector } from '@/components/settings/theme-selector';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveProfile = async () => {
    setIsUpdating(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsUpdating(false);
    toast({ title: 'Profil mis à jour' });
  };

  const handleChangePassword = async () => {
    setIsChangingPassword(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsChangingPassword(false);
    toast({ title: 'Mot de passe modifié' });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Paramètres
        </h1>
        <p className="text-gray-500 mt-1">
          Gérez votre compte et vos préférences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Card */}
        <Card className="rounded-2xl border-gray-700 bg-[#1a1a2e] shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/20 p-2.5">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-white">Profil</CardTitle>
                <CardDescription className="text-gray-500">
                  Mettez à jour vos informations personnelles
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Nom</Label>
                <Input
                  id="name"
                  defaultValue={user?.name || ''}
                  placeholder="Votre nom"
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  defaultValue={user?.email}
                  disabled
                  className="bg-gray-800/30 border-gray-700 text-gray-500"
                />
                <p className="text-xs text-gray-500">L'email ne peut pas être modifié</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveProfile}
                disabled={isUpdating}
                className="rounded-xl"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card className="rounded-2xl border-gray-700 bg-[#1a1a2e] shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-900/50 p-2.5">
                <Lock className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-white">Mot de passe</CardTitle>
                <CardDescription className="text-gray-500">
                  Modifiez votre mot de passe
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-gray-300">Mot de passe actuel</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-gray-300">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirmer</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="rounded-xl border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Modification...
                  </>
                ) : (
                  'Changer le mot de passe'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card className="rounded-2xl border-gray-700 bg-[#1a1a2e] shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-900/50 p-2.5">
                <Palette className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-white">Préférences</CardTitle>
                <CardDescription className="text-gray-500">
                  Personnalisez votre expérience
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme Selection */}
            <div className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/30 p-4">
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-white">Thème</p>
                  <p className="text-sm text-gray-500">
                    Choisissez le mode d'affichage
                  </p>
                </div>
              </div>
              <ThemeSelector />
            </div>

            {/* Keyboard Shortcuts */}
            <div
              className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/30 p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
              onClick={() => router.push('/settings/shortcuts')}
            >
              <div className="flex items-center gap-3">
                <Keyboard className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-white">Raccourcis clavier</p>
                  <p className="text-sm text-gray-500">
                    Personnalisez les raccourcis de l'application
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="rounded-2xl border-red-900/50 bg-[#1a1a2e] shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-900/50 p-2.5">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <CardTitle className="text-red-400">Zone de danger</CardTitle>
                <CardDescription className="text-gray-500">
                  Actions irréversibles
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-xl border border-red-900/50 bg-red-900/10 p-4">
              <div>
                <p className="font-medium text-white">Supprimer le compte</p>
                <p className="text-sm text-gray-500">
                  Cette action supprimera définitivement votre compte et toutes vos données
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-xl border-red-900/50 bg-transparent text-red-400 hover:bg-red-900/30 hover:text-red-300"
                  >
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Toutes vos données, workflows et exécutions seront définitivement supprimés.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white">
                      Supprimer définitivement
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
