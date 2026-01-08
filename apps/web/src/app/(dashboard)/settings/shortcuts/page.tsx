'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Keyboard,
  Search,
  RotateCcw,
  Save,
  ChevronLeft,
  AlertCircle,
  Check,
  X,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DEFAULT_SHORTCUTS, CATEGORY_LABELS } from '@/lib/keyboard/default-shortcuts';
import type { ShortcutCategory } from '@/lib/keyboard/types';

// Helper to format keys for display
function formatKeys(keys: string[]): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return keys.map(key => {
    if (isMac) {
      switch (key) {
        case 'Ctrl': return '⌘';
        case 'Alt': return '⌥';
        case 'Shift': return '⇧';
        case 'Meta': return '⌘';
        default: return key;
      }
    }
    return key;
  }).join(' + ');
}

// Shortcut item component
function ShortcutItem({
  shortcut,
  customKeys,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onReset,
  recordedKeys,
  hasConflict,
  conflictWith,
}: {
  shortcut: typeof DEFAULT_SHORTCUTS[0];
  customKeys?: string[];
  isEditing: boolean;
  onEdit: () => void;
  onSave: (keys: string[]) => void;
  onCancel: () => void;
  onReset: () => void;
  recordedKeys: string[];
  hasConflict: boolean;
  conflictWith?: string;
}) {
  const currentKeys = customKeys || shortcut.defaultKeys;
  const isCustomized = customKeys && JSON.stringify(customKeys) !== JSON.stringify(shortcut.defaultKeys);

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border transition-colors',
        isEditing
          ? 'border-primary bg-primary/5'
          : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
      )}
    >
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{shortcut.label}</span>
          {isCustomized && (
            <Badge variant="secondary" className="text-xs">
              Personnalisé
            </Badge>
          )}
          {shortcut.global && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">
                    Global
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ce raccourci fonctionne partout dans l'application</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">{shortcut.description}</p>
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <div
              className={cn(
                'flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-dashed min-w-[120px] justify-center',
                hasConflict
                  ? 'border-red-500 bg-red-500/10'
                  : recordedKeys.length > 0
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-500 bg-gray-800/50'
              )}
            >
              {recordedKeys.length > 0 ? (
                <span className="font-mono text-sm">
                  {formatKeys(recordedKeys)}
                </span>
              ) : (
                <span className="text-gray-500 text-sm">Appuyez sur les touches...</span>
              )}
            </div>
            {hasConflict && conflictWith && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Conflit avec: {conflictWith}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => onSave(recordedKeys)}
              disabled={recordedKeys.length === 0 || hasConflict}
              className="h-8 w-8 p-0"
            >
              <Check className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div
              onClick={onEdit}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
            >
              {currentKeys.map((key, index) => (
                <span key={index}>
                  <kbd className="px-2 py-1 text-xs font-mono bg-gray-700 rounded border border-gray-600 text-gray-300">
                    {key === 'Ctrl' && typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
                      ? '⌘'
                      : key}
                  </kbd>
                  {index < currentKeys.length - 1 && (
                    <span className="text-gray-500 mx-1">+</span>
                  )}
                </span>
              ))}
            </div>
            {isCustomized && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onReset}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-300"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Réinitialiser (défaut: {formatKeys(shortcut.defaultKeys)})</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ShortcutsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | 'all'>('all');
  const [customShortcuts, setCustomShortcuts] = useState<Record<string, string[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load custom shortcuts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customKeyboardShortcuts');
    if (saved) {
      try {
        setCustomShortcuts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load custom shortcuts:', e);
      }
    }
  }, []);

  // Filter shortcuts
  const filteredShortcuts = useMemo(() => {
    return DEFAULT_SHORTCUTS.filter(shortcut => {
      const matchesSearch = searchQuery === '' ||
        shortcut.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shortcut.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || shortcut.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, typeof DEFAULT_SHORTCUTS> = {};

    filteredShortcuts.forEach(shortcut => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category]!.push(shortcut);
    });

    return groups;
  }, [filteredShortcuts]);

  // Check for conflicts
  const checkConflict = useCallback((keys: string[], excludeId?: string): string | undefined => {
    const keysStr = keys.join('+').toLowerCase();

    for (const shortcut of DEFAULT_SHORTCUTS) {
      if (shortcut.id === excludeId) continue;

      const currentKeys = customShortcuts[shortcut.id] || shortcut.defaultKeys;
      const currentStr = currentKeys.join('+').toLowerCase();

      if (keysStr === currentStr) {
        return shortcut.label;
      }
    }

    return undefined;
  }, [customShortcuts]);

  // Handle key recording
  useEffect(() => {
    if (!editingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const keys: string[] = [];

      if (e.ctrlKey || e.metaKey) keys.push('Ctrl');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');

      // Add the main key
      const key = e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        // Normalize key names
        let normalizedKey = key;
        if (key === ' ') normalizedKey = 'Space';
        else if (key === 'Escape') normalizedKey = 'Escape';
        else if (key === 'Enter') normalizedKey = 'Enter';
        else if (key === 'Tab') normalizedKey = 'Tab';
        else if (key === 'Backspace') normalizedKey = 'Backspace';
        else if (key === 'Delete') normalizedKey = 'Delete';
        else if (key.startsWith('Arrow')) normalizedKey = key;
        else if (key.startsWith('F') && !isNaN(Number(key.slice(1)))) normalizedKey = key;
        else normalizedKey = key.length === 1 ? key.toUpperCase() : key;

        keys.push(normalizedKey);
        setRecordedKeys(keys);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId]);

  const handleEdit = (id: string) => {
    setEditingId(id);
    setRecordedKeys([]);
  };

  const handleSave = (id: string, keys: string[]) => {
    setCustomShortcuts(prev => ({
      ...prev,
      [id]: keys,
    }));
    setEditingId(null);
    setRecordedKeys([]);
    setHasUnsavedChanges(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setRecordedKeys([]);
  };

  const handleReset = (id: string) => {
    setCustomShortcuts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleResetAll = () => {
    setCustomShortcuts({});
    setShowResetDialog(false);
    setHasUnsavedChanges(true);
    toast({
      title: 'Raccourcis réinitialisés',
      description: 'Tous les raccourcis ont été remis à leurs valeurs par défaut',
    });
  };

  const handleSaveAll = () => {
    localStorage.setItem('customKeyboardShortcuts', JSON.stringify(customShortcuts));
    setHasUnsavedChanges(false);
    toast({
      title: 'Raccourcis sauvegardés',
      description: 'Vos raccourcis personnalisés ont été enregistrés',
    });
  };

  const categories = ['all', 'file', 'edit', 'navigation', 'view', 'debug', 'collaboration'] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/settings')}
            className="text-gray-400 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Keyboard className="h-6 w-6 text-primary" />
              Raccourcis clavier
            </h1>
            <p className="text-gray-500 text-sm">
              Personnalisez les raccourcis clavier de l'application
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowResetDialog(true)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Tout réinitialiser
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-400 shrink-0" />
            <p className="text-sm text-blue-200">
              Cliquez sur un raccourci pour le modifier. Appuyez sur les touches souhaitées puis validez.
              Les raccourcis marqués "Global" fonctionnent partout dans l'application.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher un raccourci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                selectedCategory !== cat && 'border-gray-700 text-gray-400 hover:bg-gray-800'
              )}
            >
              {cat === 'all' ? 'Tous' : CATEGORY_LABELS[cat as ShortcutCategory]}
            </Button>
          ))}
        </div>
      </div>

      {/* Shortcuts List */}
      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-6 pr-4">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <Card key={category} className="border-gray-700 bg-[#1a1a2e]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white">
                  {CATEGORY_LABELS[category as ShortcutCategory]}
                </CardTitle>
                <CardDescription className="text-gray-500">
                  {shortcuts.length} raccourci{shortcuts.length > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {shortcuts.map((shortcut) => {
                  const isEditing = editingId === shortcut.id;
                  const conflict = isEditing ? checkConflict(recordedKeys, shortcut.id) : undefined;

                  return (
                    <ShortcutItem
                      key={shortcut.id}
                      shortcut={shortcut}
                      customKeys={customShortcuts[shortcut.id]}
                      isEditing={isEditing}
                      onEdit={() => handleEdit(shortcut.id)}
                      onSave={(keys) => handleSave(shortcut.id, keys)}
                      onCancel={handleCancel}
                      onReset={() => handleReset(shortcut.id)}
                      recordedKeys={recordedKeys}
                      hasConflict={!!conflict}
                      conflictWith={conflict}
                    />
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser tous les raccourcis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action remettra tous les raccourcis à leurs valeurs par défaut.
              Vos personnalisations seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAll}>
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
