'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Star,
  Clock,
  Users,
  Zap,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Layout,
  Grid3X3,
  List,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { templatesApi, type WorkflowTemplate, type TemplateDifficulty } from '@/lib/api/templates';
import { cn } from '@/lib/utils';

const difficultyColors: Record<TemplateDifficulty, string> = {
  BEGINNER: 'bg-green-500/20 text-green-400 border-green-500/30',
  INTERMEDIATE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ADVANCED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  EXPERT: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const difficultyLabels: Record<TemplateDifficulty, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
  EXPERT: 'Expert',
};

export default function TemplatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedDifficulty, setSelectedDifficulty] = useState<TemplateDifficulty | undefined>();
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});

  // Fetch gallery
  const { data: gallery, isLoading } = useQuery({
    queryKey: ['templates-gallery', searchQuery, selectedCategory, selectedDifficulty, sortBy],
    queryFn: () =>
      templatesApi.getGallery({
        search: searchQuery || undefined,
        category: selectedCategory,
        difficulty: selectedDifficulty,
        sortBy,
        take: 50,
      }),
  });

  // Fetch featured
  const { data: featured } = useQuery({
    queryKey: ['templates-featured'],
    queryFn: () => templatesApi.getFeatured(6),
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['templates-categories'],
    queryFn: () => templatesApi.getCategories(),
  });

  // Deploy mutation
  const deployMutation = useMutation({
    mutationFn: templatesApi.deploy,
    onSuccess: (workflow) => {
      toast({ title: 'Workflow créé avec succès' });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      router.push(`/workflows/${workflow.id}`);
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message || 'Erreur lors du déploiement', variant: 'destructive' });
    },
  });

  const handleDeploy = () => {
    if (!selectedTemplate || !workflowName.trim()) return;

    deployMutation.mutate({
      templateId: selectedTemplate.id,
      name: workflowName,
      parameters: parameterValues,
    });
  };

  const openDeployDialog = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setWorkflowName(`${template.name} - Copy`);
    // Set default parameter values
    const defaults: Record<string, string> = {};
    template.parameters.forEach((p) => {
      if (p.defaultValue) {
        defaults[p.name] = p.defaultValue;
      }
    });
    setParameterValues(defaults);
    setDeployDialogOpen(true);
  };

  const categories = categoriesData?.legacyCategories || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground mt-1">
            Découvrez et déployez des workflows prêts à l'emploi
          </p>
        </div>
      </div>

      {/* Featured Templates */}
      {featured && featured.length > 0 && !searchQuery && !selectedCategory && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Templates à la une</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onDeploy={() => openDeployDialog(template)}
                featured
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedCategory || 'all'}
            onValueChange={(v) => setSelectedCategory(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedDifficulty || 'all'}
            onValueChange={(v) =>
              setSelectedDifficulty(v === 'all' ? undefined : (v as TemplateDifficulty))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Difficulté" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="BEGINNER">Débutant</SelectItem>
              <SelectItem value="INTERMEDIATE">Intermédiaire</SelectItem>
              <SelectItem value="ADVANCED">Avancé</SelectItem>
              <SelectItem value="EXPERT">Expert</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-40">
              <TrendingUp className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Populaires</SelectItem>
              <SelectItem value="rating">Mieux notés</SelectItem>
              <SelectItem value="newest">Plus récents</SelectItem>
            </SelectContent>
          </Select>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
            <TabsList>
              <TabsTrigger value="grid">
                <Grid3X3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-xl bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : gallery?.templates.length === 0 ? (
        <div className="text-center py-12">
          <Layout className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Aucun template trouvé</h3>
          <p className="text-muted-foreground mt-1">
            Essayez de modifier vos filtres
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gallery?.templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDeploy={() => openDeployDialog(template)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {gallery?.templates.map((template) => (
            <TemplateListItem
              key={template.id}
              template={template}
              onDeploy={() => openDeployDialog(template)}
            />
          ))}
        </div>
      )}

      {/* Deploy Dialog */}
      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Déployer le template</DialogTitle>
            <DialogDescription>
              Créez un nouveau workflow à partir de ce template
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nom du workflow</label>
                <Input
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="Mon workflow"
                  className="mt-1"
                />
              </div>

              {selectedTemplate.parameters.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Paramètres</label>
                  {selectedTemplate.parameters.map((param) => (
                    <div key={param.name}>
                      <label className="text-sm text-muted-foreground">
                        {param.label}
                        {param.required && <span className="text-red-500">*</span>}
                      </label>
                      <Input
                        value={parameterValues[param.name] || ''}
                        onChange={(e) =>
                          setParameterValues((prev) => ({
                            ...prev,
                            [param.name]: e.target.value,
                          }))
                        }
                        placeholder={param.description || param.defaultValue}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeployDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleDeploy}
                  disabled={!workflowName.trim() || deployMutation.isPending}
                >
                  {deployMutation.isPending ? 'Déploiement...' : 'Déployer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TemplateCardProps {
  template: WorkflowTemplate;
  onDeploy: () => void;
  featured?: boolean;
}

function TemplateCard({ template, onDeploy, featured }: TemplateCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5',
        featured && 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-transparent'
      )}
    >
      {featured && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-yellow-500 text-black">
            <Star className="h-3 w-3 mr-1" />
            Featured
          </Badge>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Zap className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{template.name}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {template.category}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
        {template.description || 'Aucune description'}
      </p>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {template.difficulty && (
          <Badge variant="outline" className={difficultyColors[template.difficulty]}>
            {difficultyLabels[template.difficulty]}
          </Badge>
        )}
        {template.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500" />
            {template.avgRating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {template.usageCount}
          </span>
          {template.estimatedTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {template.estimatedTime}min
            </span>
          )}
        </div>
      </div>

      <Button
        onClick={onDeploy}
        className="mt-4 w-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Zap className="h-4 w-4 mr-2" />
        Déployer
      </Button>
    </div>
  );
}

function TemplateListItem({ template, onDeploy }: TemplateCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4 hover:border-primary/50 transition-colors">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Zap className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{template.name}</h3>
          {template.difficulty && (
            <Badge variant="outline" className={cn('text-xs', difficultyColors[template.difficulty])}>
              {difficultyLabels[template.difficulty]}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {template.description || template.category}
        </p>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Star className="h-4 w-4 text-yellow-500" />
          {template.avgRating.toFixed(1)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {template.usageCount}
        </span>
      </div>
      <Button size="sm" onClick={onDeploy}>
        Déployer
      </Button>
    </div>
  );
}
