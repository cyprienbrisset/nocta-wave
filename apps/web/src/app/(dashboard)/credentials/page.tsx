'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Key,
  Plus,
  Trash2,
  MoreVertical,
  CheckCircle2,
  Loader2,
  Database,
  Globe,
  Lock,
  Cloud,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import {
  credentialsApi,
  type CredentialType,
  type CreateCredentialDto,
} from '@/lib/api/credentials';

const credentialTypeConfig: Record<
  CredentialType,
  { icon: ReactNode; label: string; bgColor: string; textColor: string; fields: string[] }
> = {
  API_KEY: {
    icon: <Key className="h-5 w-5" />,
    label: 'Clé API',
    bgColor: 'bg-blue-900/50',
    textColor: 'text-blue-400',
    fields: ['api_key'],
  },
  OAUTH2: {
    icon: <Globe className="h-5 w-5" />,
    label: 'OAuth2',
    bgColor: 'bg-green-900/50',
    textColor: 'text-green-400',
    fields: ['client_id', 'client_secret', 'access_token', 'refresh_token'],
  },
  BASIC_AUTH: {
    icon: <Lock className="h-5 w-5" />,
    label: 'Authentification basique',
    bgColor: 'bg-orange-900/50',
    textColor: 'text-orange-400',
    fields: ['username', 'password'],
  },
  DATABASE: {
    icon: <Database className="h-5 w-5" />,
    label: 'Base de données',
    bgColor: 'bg-purple-900/50',
    textColor: 'text-purple-400',
    fields: ['host', 'port', 'database', 'username', 'password'],
  },
  AWS: {
    icon: <Cloud className="h-5 w-5" />,
    label: 'AWS',
    bgColor: 'bg-amber-900/50',
    textColor: 'text-amber-400',
    fields: ['access_key_id', 'secret_access_key', 'region'],
  },
};

const fieldLabels: Record<string, string> = {
  api_key: 'Clé API',
  client_id: 'Client ID',
  client_secret: 'Client Secret',
  access_token: 'Access Token',
  refresh_token: 'Refresh Token',
  username: "Nom d'utilisateur",
  password: 'Mot de passe',
  host: 'Hôte',
  port: 'Port',
  database: 'Base de données',
  access_key_id: 'Access Key ID',
  secret_access_key: 'Secret Access Key',
  region: 'Région',
};

export default function CredentialsPage() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteCredentialId, setDeleteCredentialId] = useState<string | null>(null);
  const [testingCredentialId, setTestingCredentialId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<CredentialType>('API_KEY');
  const [formData, setFormData] = useState<Record<string, string>>({});

  const { data: credentials, isLoading } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => credentialsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateCredentialDto) => credentialsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: 'Identifiant créé avec succès' });
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la création',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => credentialsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setDeleteCredentialId(null);
      toast({ title: 'Identifiant supprimé' });
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la suppression',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => credentialsApi.test(id),
    onSuccess: (result) => {
      setTestingCredentialId(null);
      if (result.success) {
        toast({ title: 'Connexion réussie', description: result.message });
      } else {
        toast({
          title: 'Échec de la connexion',
          description: result.message || 'La connexion a échoué',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      setTestingCredentialId(null);
      toast({
        title: 'Erreur lors du test',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormType('API_KEY');
    setFormData({});
  };

  const handleCreate = () => {
    if (!formName.trim()) {
      toast({ title: 'Le nom est requis', variant: 'destructive' });
      return;
    }

    const requiredFields = credentialTypeConfig[formType].fields;
    const missingFields = requiredFields.filter((field) => !formData[field]?.trim());
    if (missingFields.length > 0) {
      toast({
        title: 'Champs requis manquants',
        description: `Veuillez remplir: ${missingFields.map((f) => fieldLabels[f]).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      name: formName,
      type: formType,
      data: formData,
    });
  };

  const handleTest = (id: string) => {
    setTestingCredentialId(id);
    testMutation.mutate(id);
  };

  const handleTypeChange = (type: CredentialType) => {
    setFormType(type);
    setFormData({});
  };

  const credentialToDelete = credentials?.find((c) => c.id === deleteCredentialId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Identifiants
          </h1>
          <p className="text-gray-500 mt-1">
            Gérez vos clés API et identifiants de connexion
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="rounded-xl shadow-md">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un identifiant
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-gray-500">Chargement des identifiants...</p>
          </div>
        </div>
      ) : credentials && credentials.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {credentials.map((credential) => {
            const config = credentialTypeConfig[credential.type];
            const isTestingThis = testingCredentialId === credential.id;

            return (
              <Card key={credential.id} className="rounded-2xl border-gray-700 bg-[#1a1a2e] shadow-md hover:border-gray-600 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl p-2.5 ${config.bgColor} ${config.textColor}`}>
                        {config.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base text-white">{credential.name}</CardTitle>
                        <p className="text-xs text-gray-500">{config.label}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1e1e2e] border-gray-700">
                        <DropdownMenuItem
                          onClick={() => handleTest(credential.id)}
                          disabled={isTestingThis}
                          className="text-gray-300 focus:bg-gray-800 focus:text-white"
                        >
                          {isTestingThis ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Tester la connexion
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-400 focus:bg-red-900/30 focus:text-red-400"
                          onClick={() => setDeleteCredentialId(credential.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      Créé le{' '}
                      {new Date(credential.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    {isTestingThis && (
                      <span className="flex items-center gap-1 text-blue-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Test en cours...
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded-2xl border-dashed border-gray-700 bg-[#1a1a2e]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/20 p-4 mb-4">
              <Key className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-white">Aucun identifiant</h3>
            <p className="text-gray-500 mt-2 text-center max-w-sm">
              Ajoutez des identifiants pour connecter vos workflows à des services externes
            </p>
            <Button className="mt-6 rounded-xl" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un identifiant
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel identifiant</DialogTitle>
            <DialogDescription>
              Ajoutez un nouvel identifiant pour vos intégrations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">Nom</Label>
              <Input
                id="name"
                placeholder="Mon identifiant API"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type" className="text-gray-300">Type</Label>
              <Select value={formType} onValueChange={(v) => handleTypeChange(v as CredentialType)}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e2e] border-gray-700">
                  {Object.entries(credentialTypeConfig).map(([type, config]) => (
                    <SelectItem key={type} value={type} className="text-white focus:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <span className={config.textColor}>{config.icon}</span>
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic fields based on type */}
            {credentialTypeConfig[formType].fields.map((field) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field} className="text-gray-300">{fieldLabels[field] || field}</Label>
                <Input
                  id={field}
                  type={field.includes('password') || field.includes('secret') || field.includes('key') ? 'password' : 'text'}
                  placeholder={fieldLabels[field] || field}
                  value={formData[field] || ''}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="rounded-xl border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="rounded-xl">
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteCredentialId !== null}
        onOpenChange={(open) => !open && setDeleteCredentialId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'identifiant ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'identifiant "
              {credentialToDelete?.name}" ? Cette action est irréversible et peut
              affecter les workflows qui l'utilisent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteCredentialId && deleteMutation.mutate(deleteCredentialId)}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
