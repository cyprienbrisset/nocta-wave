'use client';

import { useState, useEffect } from 'react';
import { Template, templatesApi, CreateTemplateRequest } from '@/lib/api/collaboration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  LayoutTemplate,
  Plus,
  Search,
  Star,
  Users,
  Lock,
  Zap,
  Database,
  MessageSquare,
  Cloud,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  mode: 'use' | 'create';
  workflowId?: string;
  workflowName?: string;
  workflowGraph?: any;
  onUseTemplate?: (workflowId: string) => void;
  onCreateSuccess?: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  automation: Zap,
  integration: Cloud,
  'data-sync': Database,
  communication: MessageSquare,
  custom: Code,
};

const CATEGORIES = [
  { value: 'automation', label: 'Automatisation' },
  { value: 'integration', label: 'Intégration' },
  { value: 'data-sync', label: 'Synchronisation de données' },
  { value: 'communication', label: 'Communication' },
  { value: 'custom', label: 'Personnalisé' },
];

export function TemplatesDialog({
  open,
  onOpenChange,
  teamId,
  mode,
  workflowId,
  workflowName,
  workflowGraph,
  onUseTemplate,
  onCreateSuccess,
}: TemplatesDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [newName, setNewName] = useState(workflowName || '');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('custom');
  const [isPublic, setIsPublic] = useState(false);

  // Use template form state
  const [useTemplateName, setUseTemplateName] = useState('');

  useEffect(() => {
    if (open && mode === 'use') {
      loadTemplates();
      loadCategories();
    }
  }, [open, mode, teamId]);

  useEffect(() => {
    if (workflowName) {
      setNewName(`${workflowName} Template`);
    }
  }, [workflowName]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const result = await templatesApi.list({
        teamId,
        category: selectedCategory || undefined,
        search: search || undefined,
      });
      setTemplates(result.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await templatesApi.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleUseTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setCreating(true);
      const result = await templatesApi.useTemplate(selectedTemplate.id, teamId, {
        name: useTemplateName || selectedTemplate.name,
      });
      toast({ title: 'Workflow créé à partir du template', duration: 2000 });
      onUseTemplate?.(result.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to use template:', error);
      toast({ title: 'Erreur lors de la création', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!workflowId || !newName.trim()) return;

    try {
      setCreating(true);
      await templatesApi.createFromWorkflow(workflowId, {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory,
        isPublic,
      });
      toast({ title: 'Template créé avec succès', duration: 2000 });
      onCreateSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create template:', error);
      toast({ title: 'Erreur lors de la création', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const Icon = CATEGORY_ICONS[category] || Code;
    return <Icon className="h-4 w-4" />;
  };

  if (mode === 'create') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" />
              Créer un template
            </DialogTitle>
            <DialogDescription>
              Transformez ce workflow en template réutilisable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom du template</Label>
              <Input
                value={newName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                placeholder="Mon template"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDescription(e.target.value)}
                placeholder="Décrivez ce que fait ce workflow..."
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(cat.value)}
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Users className="h-5 w-5 text-green-400" />
                ) : (
                  <Lock className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {isPublic ? 'Template public' : 'Template privé'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isPublic
                      ? 'Visible par tous les utilisateurs'
                      : 'Visible uniquement par votre équipe'}
                  </p>
                </div>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={!newName.trim() || creating}
            >
              {creating ? 'Création...' : 'Créer le template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-indigo-400" />
            Templates de workflows
          </DialogTitle>
          <DialogDescription>
            Démarrez rapidement avec un template préconfiguré.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 mt-4">
          {/* Sidebar with categories */}
          <div className="w-48 shrink-0 space-y-2">
            <button
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                !selectedCategory
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800'
              )}
              onClick={() => {
                setSelectedCategory(null);
                loadTemplates();
              }}
            >
              Tous les templates
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between',
                  selectedCategory === cat.name
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800'
                )}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  loadTemplates();
                }}
              >
                <span className="flex items-center gap-2">
                  {getCategoryIcon(cat.name)}
                  {cat.name}
                </span>
                <Badge variant="secondary" className="ml-2">
                  {cat.count}
                </Badge>
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearch(e.target.value);
                  loadTemplates();
                }}
                placeholder="Rechercher un template..."
                className="pl-9 bg-gray-800 border-gray-700"
              />
            </div>

            {/* Templates grid */}
            {loading ? (
              <div className="flex items-center justify-center h-48 text-gray-500">
                Chargement...
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <LayoutTemplate className="h-10 w-10 mb-2 opacity-50" />
                <p>Aucun template trouvé</p>
              </div>
            ) : selectedTemplate ? (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTemplate(null)}
                >
                  ← Retour aux templates
                </Button>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                      {getCategoryIcon(selectedTemplate.category)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{selectedTemplate.name}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {selectedTemplate.description || 'Aucune description'}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {selectedTemplate.usageCount} utilisations
                        </span>
                        {selectedTemplate.isPublic ? (
                          <Badge variant="secondary" className="text-green-400">
                            <Users className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-gray-400">
                            <Lock className="h-3 w-3 mr-1" />
                            Privé
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nom du nouveau workflow</Label>
                  <Input
                    value={useTemplateName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseTemplateName(e.target.value)}
                    placeholder={selectedTemplate.name}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleUseTemplate}
                  disabled={creating}
                >
                  {creating ? 'Création...' : 'Utiliser ce template'}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    className="text-left p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors group"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setUseTemplateName('');
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
                        {getCategoryIcon(template.category)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium truncate group-hover:text-indigo-400 transition-colors">
                          {template.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {template.description || 'Aucune description'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                          <Star className="h-3 w-3" />
                          {template.usageCount}
                          {template.isPublic && (
                            <Users className="h-3 w-3 ml-2 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
