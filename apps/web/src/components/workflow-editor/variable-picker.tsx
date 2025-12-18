'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Variable, ChevronRight, Search, Zap, Database, Code, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface VariableOption {
  id: string;
  label: string;
  path: string; // e.g., "variables.myVar" or "node-1.output.data"
  type: 'node' | 'workflow' | 'env' | 'system';
  nodeId?: string;
  nodeName?: string;
  description?: string;
  dataType?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'json';
}

interface VariablePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  availableVariables: VariableOption[];
  className?: string;
  disabled?: boolean;
}

const typeIcons: Record<VariableOption['type'], ReactNode> = {
  node: <Database className="h-3.5 w-3.5" />,
  workflow: <Variable className="h-3.5 w-3.5" />,
  env: <Settings className="h-3.5 w-3.5" />,
  system: <Zap className="h-3.5 w-3.5" />,
};

const typeColors: Record<VariableOption['type'], string> = {
  node: 'text-blue-400 bg-blue-900/50',
  workflow: 'text-purple-400 bg-purple-900/50',
  env: 'text-orange-400 bg-orange-900/50',
  system: 'text-green-400 bg-green-900/50',
};

const typeLabels: Record<VariableOption['type'], string> = {
  node: 'Output de node',
  workflow: 'Variable de workflow',
  env: 'Variable d\'environnement',
  system: 'Variable système',
};

export function VariablePicker({
  value,
  onChange,
  placeholder = 'Entrez une valeur ou sélectionnez une variable...',
  availableVariables,
  className,
  disabled,
}: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [autocompleteSearch, setAutocompleteSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Filtrer les variables par recherche
  const filterVariables = (searchTerm: string) => {
    return availableVariables.filter((v) =>
      v.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.nodeName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredVariables = filterVariables(search);
  const autocompleteVariables = filterVariables(autocompleteSearch);

  // Grouper par type
  const groupVariables = (variables: VariableOption[]) => {
    return variables.reduce((acc, variable) => {
      if (!acc[variable.type]) {
        acc[variable.type] = [];
      }
      acc[variable.type].push(variable);
      return acc;
    }, {} as Record<VariableOption['type'], VariableOption[]>);
  };

  const groupedVariables = groupVariables(filteredVariables);
  const groupedAutocompleteVariables = groupVariables(autocompleteVariables);

  // Flatten variables for keyboard navigation
  const flattenedAutocompleteVariables = autocompleteVariables;

  // Détecter la saisie de {{ pour déclencher l'autocomplete
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const newCursorPosition = e.target.selectionStart || 0;
    onChange(newValue);
    setCursorPosition(newCursorPosition);

    // Chercher si on est dans un contexte {{...
    const textBeforeCursor = newValue.slice(0, newCursorPosition);
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
    const lastCloseBrace = textBeforeCursor.lastIndexOf('}}');

    if (lastOpenBrace > lastCloseBrace) {
      // On est dans un contexte {{ sans }} fermant
      const searchText = textBeforeCursor.slice(lastOpenBrace + 2);
      setAutocompleteSearch(searchText);
      setIsAutocompleteOpen(true);
      setSelectedIndex(0);

      // Calculer la position de l'autocomplete
      if (inputRef.current) {
        const inputRect = inputRef.current.getBoundingClientRect();
        // Position approximative basée sur la longueur du texte
        const charWidth = 8; // Approximation pour monospace
        const leftOffset = Math.min((lastOpenBrace + 2) * charWidth, inputRect.width - 200);
        setAutocompletePosition({
          top: inputRect.height + 4,
          left: Math.max(0, leftOffset),
        });
      }
    } else {
      setIsAutocompleteOpen(false);
      setAutocompleteSearch('');
    }
  };

  // Gérer les touches clavier pour l'autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isAutocompleteOpen || flattenedAutocompleteVariables.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flattenedAutocompleteVariables.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flattenedAutocompleteVariables.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        const selectedVar = flattenedAutocompleteVariables[selectedIndex];
        if (selectedVar) {
          insertVariableAtCursor(selectedVar);
        }
        break;
      case 'Escape':
        setIsAutocompleteOpen(false);
        break;
    }
  };

  // Insérer une variable à la position du curseur (pour autocomplete)
  const insertVariableAtCursor = (variable: VariableOption) => {
    if (!inputRef.current) return;

    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');

    // Remplacer depuis {{ jusqu'au curseur
    const newValue =
      value.slice(0, lastOpenBrace) +
      `{{${variable.path}}}` +
      textAfterCursor;

    onChange(newValue);
    setIsAutocompleteOpen(false);
    setAutocompleteSearch('');

    // Repositionner le curseur après l'insertion
    setTimeout(() => {
      if (inputRef.current) {
        const newPosition = lastOpenBrace + variable.path.length + 4; // +4 pour {{ et }}
        inputRef.current.setSelectionRange(newPosition, newPosition);
        inputRef.current.focus();
      }
    }, 0);
  };

  // Insérer une variable depuis le popover (bouton)
  const insertVariable = (variable: VariableOption) => {
    const variableExpression = `{{${variable.path}}}`;

    if (inputRef.current) {
      const start = inputRef.current.selectionStart || value.length;
      const end = inputRef.current.selectionEnd || value.length;
      const newValue = value.slice(0, start) + variableExpression + value.slice(end);
      onChange(newValue);

      // Repositionner le curseur après l'insertion
      setTimeout(() => {
        if (inputRef.current) {
          const newPosition = start + variableExpression.length;
          inputRef.current.setSelectionRange(newPosition, newPosition);
          inputRef.current.focus();
        }
      }, 0);
    } else {
      onChange(value + variableExpression);
    }

    setIsOpen(false);
    setSearch('');
  };

  // Fermer l'autocomplete quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsAutocompleteOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mettre en évidence les variables dans la valeur
  const hasVariables = value.includes('{{') && value.includes('}}');

  // Rendre la liste de variables (réutilisé pour popover et autocomplete)
  const renderVariablesList = (
    grouped: Record<VariableOption['type'], VariableOption[]>,
    onSelect: (v: VariableOption) => void,
    highlightIndex?: number,
    flat?: VariableOption[]
  ) => {
    if (Object.keys(grouped).length === 0) {
      return (
        <div className="p-4 text-center text-sm text-gray-500">
          <Variable className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>Aucune variable trouvée</p>
        </div>
      );
    }

    let currentIndex = 0;

    return (
      <div className="p-2 space-y-3">
        {(Object.keys(grouped) as VariableOption['type'][]).map((type) => (
          <div key={type}>
            <div className="flex items-center gap-2 px-2 py-1">
              <span className={cn('rounded p-1', typeColors[type])}>
                {typeIcons[type]}
              </span>
              <span className="text-xs font-medium text-gray-500">
                {typeLabels[type]}
              </span>
            </div>
            <div className="space-y-1">
              {grouped[type].map((variable) => {
                const index = flat ? flat.indexOf(variable) : currentIndex++;
                const isHighlighted = highlightIndex !== undefined && index === highlightIndex;

                return (
                  <button
                    key={variable.id}
                    onClick={() => onSelect(variable)}
                    className={cn(
                      'w-full rounded-md px-2 py-1.5 text-left transition-colors',
                      isHighlighted ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-gray-800'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate text-white">
                        {variable.label}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-xs text-gray-500 font-mono truncate">
                        {`{{${variable.path}}}`}
                      </code>
                      {variable.dataType && (
                        <span className="text-[10px] rounded bg-gray-700 px-1 py-0.5 text-gray-400">
                          {variable.dataType}
                        </span>
                      )}
                    </div>
                    {variable.nodeName && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        depuis: {variable.nodeName}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex gap-1">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'pr-8 font-mono text-sm bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500',
              hasVariables && 'bg-purple-900/30 border-purple-700'
            )}
          />
          {hasVariables && (
            <Code className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-500" />
          )}

          {/* Autocomplete dropdown */}
          {isAutocompleteOpen && flattenedAutocompleteVariables.length > 0 && (
            <div
              ref={autocompleteRef}
              className="absolute z-50 w-72 rounded-md border border-gray-700 bg-[#1e1e2e] shadow-lg"
              style={{
                top: autocompletePosition.top,
                left: 0,
              }}
            >
              <div className="border-b border-gray-700 px-3 py-2 bg-gray-800/50">
                <p className="text-xs text-gray-500">
                  <kbd className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-mono text-gray-300">↑↓</kbd> naviguer
                  <kbd className="ml-2 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-mono text-gray-300">Tab</kbd> sélectionner
                  <kbd className="ml-2 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-mono text-gray-300">Esc</kbd> fermer
                </p>
              </div>
              <ScrollArea className="max-h-48">
                {renderVariablesList(
                  groupedAutocompleteVariables,
                  insertVariableAtCursor,
                  selectedIndex,
                  flattenedAutocompleteVariables
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white"
              disabled={disabled}
              title="Insérer une variable"
            >
              <Variable className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0 bg-[#1e1e2e] border-gray-700"
            align="end"
            side="bottom"
          >
            {/* Search */}
            <div className="border-b border-gray-700 p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une variable..."
                  className="pl-8 h-8 text-sm bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Variables list */}
            <ScrollArea className="h-64">
              {renderVariablesList(groupedVariables, insertVariable)}
            </ScrollArea>

            {/* Help text */}
            <div className="border-t border-gray-700 p-2 bg-gray-800/50">
              <p className="text-xs text-gray-500">
                Tapez <code className="bg-gray-700 px-1 rounded text-gray-300">{'{{'}</code> dans le champ pour l'autocomplete
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
