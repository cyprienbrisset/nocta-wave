'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Database,
  Server,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  environmentsApi,
  type VariableType,
} from '@/lib/api/environments';
import { cn } from '@/lib/utils';

const variableTypeLabels: Record<VariableType, string> = {
  STRING: 'Texte',
  NUMBER: 'Nombre',
  BOOLEAN: 'Booléen',
  JSON: 'JSON',
  SECRET: 'Secret',
};

const envColorOptions = [
  { value: 'blue', label: 'Bleu', class: 'bg-blue-500' },
  { value: 'green', label: 'Vert', class: 'bg-green-500' },
  { value: 'yellow', label: 'Jaune', class: 'bg-yellow-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'red', label: 'Rouge', class: 'bg-red-500' },
  { value: 'purple', label: 'Violet', class: 'bg-purple-500' },
  { value: 'pink', label: 'Rose', class: 'bg-pink-500' },
  { value: 'gray', label: 'Gris', class: 'bg-gray-500' },
];

const getEnvColor = (color?: string, slug?: string): string => {
  if (color) {
    const colorOption = envColorOptions.find(c => c.value === color);
    if (colorOption) return colorOption.class;
  }
  // Fallback based on common slugs
  if (slug === 'development' || slug === 'dev') return 'bg-blue-500';
  if (slug === 'staging' || slug === 'stage') return 'bg-yellow-500';
  if (slug === 'production' || slug === 'prod') return 'bg-red-500';
  return 'bg-gray-500';
};

export default function EnvironmentsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('variables');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [variableDialogOpen, setVariableDialogOpen] = useState(false);
  const [envDialogOpen, setEnvDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);

  // Variable form states
  const [newVariableKey, setNewVariableKey] = useState('');
  const [newVariableType, setNewVariableType] = useState<VariableType>('STRING');
  const [newVariableDescription, setNewVariableDescription] = useState('');
  const [newVariableIsSecret, setNewVariableIsSecret] = useState(false);

  // Environment form states
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvSlug, setNewEnvSlug] = useState('');
  const [newEnvDescription, setNewEnvDescription] = useState('');
  const [newEnvColor, setNewEnvColor] = useState('blue');
  const [newEnvIsProduction, setNewEnvIsProduction] = useState(false);
  const [newEnvIsDefault, setNewEnvIsDefault] = useState(false);

  // Promotion states
  const [sourceEnvId, setSourceEnvId] = useState('');
  const [targetEnvId, setTargetEnvId] = useState('');
  const [selectedVarIds, setSelectedVarIds] = useState<string[]>([]);

  // Fetch data
  const { data: environments = [] } = useQuery({
    queryKey: ['environments'],
    queryFn: environmentsApi.getEnvironments,
  });

  const { data: variables = [] } = useQuery({
    queryKey: ['variables'],
    queryFn: environmentsApi.getVariables,
  });

  const { data: pendingPromotions = [] } = useQuery({
    queryKey: ['pending-promotions'],
    queryFn: environmentsApi.getPendingPromotions,
  });

  // Mutations
  const createVariableMutation = useMutation({
    mutationFn: environmentsApi.createVariable,
    onSuccess: () => {
      toast({ title: 'Variable créée' });
      queryClient.invalidateQueries({ queryKey: ['variables'] });
      setVariableDialogOpen(false);
      resetVariableForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const createEnvironmentMutation = useMutation({
    mutationFn: environmentsApi.createEnvironment,
    onSuccess: () => {
      toast({ title: 'Environnement créé' });
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      setEnvDialogOpen(false);
      resetEnvForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEnvironmentMutation = useMutation({
    mutationFn: environmentsApi.deleteEnvironment,
    onSuccess: () => {
      toast({ title: 'Environnement supprimé' });
      queryClient.invalidateQueries({ queryKey: ['environments'] });
    },
  });

  const setVariableValueMutation = useMutation({
    mutationFn: environmentsApi.setVariableValue,
    onSuccess: () => {
      toast({ title: 'Valeur mise à jour' });
      queryClient.invalidateQueries({ queryKey: ['variables'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const deleteVariableMutation = useMutation({
    mutationFn: environmentsApi.deleteVariable,
    onSuccess: () => {
      toast({ title: 'Variable supprimée' });
      queryClient.invalidateQueries({ queryKey: ['variables'] });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: environmentsApi.promoteVariables,
    onSuccess: () => {
      toast({ title: 'Demande de promotion créée' });
      queryClient.invalidateQueries({ queryKey: ['pending-promotions'] });
      setPromoteDialogOpen(false);
      setSourceEnvId('');
      setTargetEnvId('');
      setSelectedVarIds([]);
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const approvePromotionMutation = useMutation({
    mutationFn: environmentsApi.approvePromotion,
    onSuccess: () => {
      toast({ title: 'Promotion approuvée' });
      queryClient.invalidateQueries({ queryKey: ['pending-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['variables'] });
    },
  });

  const rejectPromotionMutation = useMutation({
    mutationFn: environmentsApi.rejectPromotion,
    onSuccess: () => {
      toast({ title: 'Promotion rejetée' });
      queryClient.invalidateQueries({ queryKey: ['pending-promotions'] });
    },
  });

  const resetVariableForm = () => {
    setNewVariableKey('');
    setNewVariableType('STRING');
    setNewVariableDescription('');
    setNewVariableIsSecret(false);
  };

  const resetEnvForm = () => {
    setNewEnvName('');
    setNewEnvSlug('');
    setNewEnvDescription('');
    setNewEnvColor('blue');
    setNewEnvIsProduction(false);
    setNewEnvIsDefault(false);
  };

  const handleCreateVariable = () => {
    createVariableMutation.mutate({
      key: newVariableKey,
      type: newVariableType,
      description: newVariableDescription || undefined,
      isSecret: newVariableIsSecret || newVariableType === 'SECRET',
    });
  };

  const handleCreateEnvironment = () => {
    createEnvironmentMutation.mutate({
      name: newEnvName,
      slug: newEnvSlug,
      description: newEnvDescription || undefined,
      color: newEnvColor,
      isDefault: newEnvIsDefault,
      isProduction: newEnvIsProduction,
    });
  };

  const handleValueChange = (variableId: string, environmentId: string, value: string) => {
    setVariableValueMutation.mutate({ variableId, environmentId, value });
  };

  const handlePromote = () => {
    if (!sourceEnvId || !targetEnvId || selectedVarIds.length === 0) return;
    promoteMutation.mutate({
      sourceEnvId,
      targetEnvId,
      variableIds: selectedVarIds,
    });
  };

  const toggleSecretVisibility = (varId: string) => {
    setShowSecrets((prev) => ({ ...prev, [varId]: !prev[varId] }));
  };

  // Auto-generate slug from name
  const handleEnvNameChange = (name: string) => {
    setNewEnvName(name);
    if (!newEnvSlug || newEnvSlug === newEnvName.toLowerCase().replace(/\s+/g, '-')) {
      setNewEnvSlug(name.toLowerCase().replace(/\s+/g, '-'));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Environnements & Variables</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos variables d'environnement et secrets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEnvDialogOpen(true)}>
            <Server className="h-4 w-4 mr-2" />
            Nouvel environnement
          </Button>
          <Button variant="outline" onClick={() => setPromoteDialogOpen(true)}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Promouvoir
          </Button>
          <Button onClick={() => setVariableDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle variable
          </Button>
        </div>
      </div>

      {/* Environment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {environments.length === 0 ? (
          <div className="col-span-3 text-center py-12 border rounded-xl bg-muted/20">
            <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun environnement</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre premier environnement pour commencer
            </p>
            <Button onClick={() => setEnvDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un environnement
            </Button>
          </div>
        ) : (
          environments.map((env) => (
            <div
              key={env.id}
              className="rounded-xl border bg-card p-5 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-3 w-3 rounded-full',
                    getEnvColor(env.color, env.slug)
                  )}
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{env.name}</h3>
                  <p className="text-sm text-muted-foreground">{env.slug}</p>
                </div>
                {env.isProduction && (
                  <Badge variant="destructive">
                    <Shield className="h-3 w-3 mr-1" />
                    Production
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                  onClick={() => deleteEnvironmentMutation.mutate(env.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {env.description && (
                <p className="text-sm text-muted-foreground mt-2">{env.description}</p>
              )}
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Database className="h-4 w-4" />
                  {env._count?.variables || 0} variables
                </span>
                {env.isDefault && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Par défaut
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pending Promotions Alert */}
      {pendingPromotions.length > 0 && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold text-yellow-500">
              {pendingPromotions.length} promotion(s) en attente
            </h3>
          </div>
          <div className="space-y-2">
            {pendingPromotions.map((promo) => (
              <div
                key={promo.id}
                className="flex items-center justify-between rounded-lg bg-background/50 p-3"
              >
                <div className="flex items-center gap-2">
                  <span>{promo.sourceEnv?.name}</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>{promo.targetEnv?.name}</span>
                  <Badge variant="secondary">{promo.variableIds.length} variables</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectPromotionMutation.mutate(promo.id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejeter
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => approvePromotionMutation.mutate(promo.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approuver
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Variables Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="secrets">Secrets</TabsTrigger>
        </TabsList>

        <TabsContent value="variables" className="mt-4">
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Nom</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  {environments.map((env) => (
                    <TableHead key={env.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full',
                            getEnvColor(env.color, env.slug)
                          )}
                        />
                        {env.name}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {variables
                  .filter((v) => !v.isSecret)
                  .map((variable) => (
                    <TableRow key={variable.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium font-mono">{variable.name}</span>
                          {variable.description && (
                            <p className="text-xs text-muted-foreground">
                              {variable.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {variableTypeLabels[variable.type]}
                        </Badge>
                      </TableCell>
                      {environments.map((env) => (
                        <TableCell key={env.id}>
                          <Input
                            className="h-8 text-sm"
                            defaultValue={variable.values?.[env.id] || ''}
                            onBlur={(e) =>
                              handleValueChange(variable.id, env.id, e.target.value)
                            }
                            placeholder="—"
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => deleteVariableMutation.mutate(variable.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                {variables.filter((v) => !v.isSecret).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={environments.length + 3} className="text-center py-8 text-muted-foreground">
                      Aucune variable. Cliquez sur "Nouvelle variable" pour en créer une.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="secrets" className="mt-4">
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Nom</TableHead>
                  {environments.map((env) => (
                    <TableHead key={env.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full',
                            getEnvColor(env.color, env.slug)
                          )}
                        />
                        {env.name}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {variables
                  .filter((v) => v.isSecret)
                  .map((variable) => (
                    <TableRow key={variable.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium font-mono">{variable.name}</span>
                        </div>
                      </TableCell>
                      {environments.map((env) => {
                        const hasValue = !!variable.values?.[env.id];
                        const isVisible = showSecrets[`${variable.id}-${env.id}`];
                        return (
                          <TableCell key={env.id}>
                            <div className="flex items-center gap-2">
                              <Input
                                className="h-8 text-sm font-mono"
                                type={isVisible ? 'text' : 'password'}
                                defaultValue={variable.values?.[env.id] || ''}
                                onBlur={(e) =>
                                  handleValueChange(variable.id, env.id, e.target.value)
                                }
                                placeholder={hasValue ? '••••••••' : '—'}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  toggleSecretVisibility(`${variable.id}-${env.id}`)
                                }
                              >
                                {isVisible ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => deleteVariableMutation.mutate(variable.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                {variables.filter((v) => v.isSecret).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={environments.length + 2} className="text-center py-8 text-muted-foreground">
                      Aucun secret. Créez une variable de type "Secret" pour stocker des données sensibles.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Variable Dialog */}
      <Dialog open={variableDialogOpen} onOpenChange={setVariableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle variable</DialogTitle>
            <DialogDescription>
              Créez une nouvelle variable d'environnement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Clé</label>
              <Input
                value={newVariableKey}
                onChange={(e) => setNewVariableKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                placeholder="MY_VARIABLE"
                className="mt-1 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Utilisez des majuscules et des underscores
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Type</label>
              <Select
                value={newVariableType}
                onValueChange={(v) => setNewVariableType(v as VariableType)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRING">Texte</SelectItem>
                  <SelectItem value="NUMBER">Nombre</SelectItem>
                  <SelectItem value="BOOLEAN">Booléen</SelectItem>
                  <SelectItem value="JSON">JSON</SelectItem>
                  <SelectItem value="SECRET">Secret</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={newVariableDescription}
                onChange={(e) => setNewVariableDescription(e.target.value)}
                placeholder="Description optionnelle"
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isSecret"
                checked={newVariableIsSecret || newVariableType === 'SECRET'}
                onCheckedChange={(checked) => setNewVariableIsSecret(checked as boolean)}
                disabled={newVariableType === 'SECRET'}
              />
              <label htmlFor="isSecret" className="text-sm">
                Cette variable contient des données sensibles
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVariableDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateVariable}
              disabled={!newVariableKey || createVariableMutation.isPending}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Environment Dialog */}
      <Dialog open={envDialogOpen} onOpenChange={setEnvDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel environnement</DialogTitle>
            <DialogDescription>
              Créez un nouvel environnement pour vos workflows
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input
                value={newEnvName}
                onChange={(e) => handleEnvNameChange(e.target.value)}
                placeholder="Production"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input
                value={newEnvSlug}
                onChange={(e) => setNewEnvSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="production"
                className="mt-1 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Identifiant unique (minuscules et tirets)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newEnvDescription}
                onChange={(e) => setNewEnvDescription(e.target.value)}
                placeholder="Description de l'environnement..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Couleur</label>
              <div className="flex gap-2 mt-2">
                {envColorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewEnvColor(color.value)}
                    className={cn(
                      'h-8 w-8 rounded-full transition-all',
                      color.class,
                      newEnvColor === color.value
                        ? 'ring-2 ring-offset-2 ring-primary'
                        : 'hover:scale-110'
                    )}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isProduction"
                  checked={newEnvIsProduction}
                  onCheckedChange={(checked) => setNewEnvIsProduction(checked as boolean)}
                />
                <label htmlFor="isProduction" className="text-sm">
                  Environnement de production
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDefault"
                  checked={newEnvIsDefault}
                  onCheckedChange={(checked) => setNewEnvIsDefault(checked as boolean)}
                />
                <label htmlFor="isDefault" className="text-sm">
                  Environnement par défaut
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEnvDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateEnvironment}
              disabled={!newEnvName || !newEnvSlug || createEnvironmentMutation.isPending}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promouvoir des variables</DialogTitle>
            <DialogDescription>
              Copiez les valeurs d'un environnement vers un autre
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Source</label>
                <Select value={sourceEnvId} onValueChange={setSourceEnvId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {environments.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Destination</label>
                <Select value={targetEnvId} onValueChange={setTargetEnvId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {environments
                      .filter((env) => env.id !== sourceEnvId)
                      .map((env) => (
                        <SelectItem key={env.id} value={env.id}>
                          {env.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Variables à promouvoir</label>
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {variables.map((variable) => (
                  <label
                    key={variable.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedVarIds.includes(variable.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedVarIds([...selectedVarIds, variable.id]);
                        } else {
                          setSelectedVarIds(selectedVarIds.filter((id) => id !== variable.id));
                        }
                      }}
                    />
                    <span className="font-mono text-sm">{variable.name}</span>
                    {variable.isSecret && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handlePromote}
              disabled={
                !sourceEnvId ||
                !targetEnvId ||
                selectedVarIds.length === 0 ||
                promoteMutation.isPending
              }
            >
              Promouvoir {selectedVarIds.length} variable(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
