'use client';

import { useState, useCallback, useMemo } from 'react';
import { Code, Variable, ChevronDown, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TypeBadge } from './type-badge';
import type { FieldMapping, NodeDataSchema, FieldSchema } from '@/types/mapping.types';

// Available filters for simple mode
const AVAILABLE_FILTERS = [
  { name: 'uppercase', description: 'Convertit en majuscules', example: '{{value | uppercase}}' },
  { name: 'lowercase', description: 'Convertit en minuscules', example: '{{value | lowercase}}' },
  { name: 'trim', description: 'Supprime les espaces', example: '{{value | trim}}' },
  { name: 'first', description: 'Premier element', example: '{{items | first}}' },
  { name: 'last', description: 'Dernier element', example: '{{items | last}}' },
  { name: 'length', description: 'Nombre d\'elements', example: '{{items | length}}' },
  { name: 'join', description: 'Joindre avec separateur', example: '{{items | join(", ")}}' },
  { name: 'default', description: 'Valeur par defaut', example: '{{value | default("N/A")}}' },
  { name: 'json', description: 'Formater en JSON', example: '{{value | json}}' },
  { name: 'number', description: 'Convertir en nombre', example: '{{value | number}}' },
  { name: 'round', description: 'Arrondir', example: '{{value | round}}' },
  { name: 'keys', description: 'Cles de l\'objet', example: '{{obj | keys}}' },
  { name: 'values', description: 'Valeurs de l\'objet', example: '{{obj | values}}' },
];

interface ExpressionEditorProps {
  mapping: FieldMapping;
  mode: 'simple' | 'advanced';
  sourceSchema: NodeDataSchema | null;
  onChange: (expression: string) => void;
}

export function ExpressionEditor({
  mapping,
  mode,
  sourceSchema,
  onChange,
}: ExpressionEditorProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [localValue, setLocalValue] = useState(mapping.expression || '');

  // Generate default expression
  const defaultExpression = useMemo(() => {
    return `{{${mapping.sourcePath}}}`;
  }, [mapping.sourcePath]);

  // Find source field schema
  const sourceField = useMemo((): FieldSchema | null => {
    if (!sourceSchema) return null;

    const findField = (fields: FieldSchema[], path: string): FieldSchema | null => {
      for (const field of fields) {
        if (field.path === path) return field;
        if (field.children) {
          const found = findField(field.children, path);
          if (found) return found;
        }
      }
      return null;
    };

    return findField(sourceSchema.outputSchema, mapping.sourcePath);
  }, [sourceSchema, mapping.sourcePath]);

  // Handle input change
  const handleChange = useCallback(
    (value: string) => {
      setLocalValue(value);
      onChange(value);
    },
    [onChange]
  );

  // Handle filter selection
  const handleFilterSelect = useCallback(
    (filterName: string) => {
      const currentValue = localValue || defaultExpression;
      // Insert filter before closing braces
      const newValue = currentValue.replace(/\}\}$/, ` | ${filterName}}}`);
      handleChange(newValue);
      setShowFilters(false);
    },
    [localValue, defaultExpression, handleChange]
  );

  // Validate expression
  const validationResult = useMemo(() => {
    const expr = localValue || defaultExpression;

    if (mode === 'simple') {
      // Check for balanced braces
      const openCount = (expr.match(/\{\{/g) || []).length;
      const closeCount = (expr.match(/\}\}/g) || []).length;
      if (openCount !== closeCount) {
        return { valid: false, error: 'Accolades non equilibrees' };
      }

      // Check for valid path syntax
      if (expr.includes('{{') && !expr.match(/\{\{[\w\.\[\]\|\s]+\}\}/)) {
        return { valid: false, error: 'Syntaxe invalide' };
      }

      return { valid: true };
    } else {
      // Basic JS validation
      try {
        // Check for obvious syntax errors
        if (expr.includes('function') && !expr.includes('return')) {
          return { valid: false, error: 'Fonction sans return' };
        }
        return { valid: true };
      } catch {
        return { valid: false, error: 'Erreur de syntaxe JavaScript' };
      }
    }
  }, [localValue, defaultExpression, mode]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-[#1a1a2e]/50">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-purple-400" />
          <span className="text-xs font-medium text-white">Expression</span>
          {sourceField && <TypeBadge type={sourceField.type} />}
        </div>

        <div className="flex items-center gap-2">
          {/* Validation indicator */}
          {validationResult.valid ? (
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <Check className="h-3 w-3" />
              Valide
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <AlertCircle className="h-3 w-3" />
              {validationResult.error}
            </span>
          )}
        </div>
      </div>

      {/* Mapping info */}
      <div className="px-3 py-2 bg-gray-900/50 border-b border-gray-800">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Source:</span>
          <code className="text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded font-mono">
            {mapping.sourcePath}
          </code>
          <span className="text-gray-600">→</span>
          <span className="text-gray-500">Cible:</span>
          <code className="text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded font-mono">
            {mapping.targetPath}
          </code>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 p-3">
        {mode === 'simple' ? (
          <div className="space-y-3">
            {/* Simple expression input */}
            <div className="relative">
              <div className="flex items-center gap-2 mb-1.5">
                <Variable className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Expression template
                </span>
              </div>
              <input
                type="text"
                value={localValue || defaultExpression}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={defaultExpression}
                className={cn(
                  'w-full px-3 py-2 bg-gray-800/50 border rounded-md font-mono text-sm',
                  'text-white placeholder:text-gray-600',
                  'focus:outline-none focus:ring-1',
                  validationResult.valid
                    ? 'border-gray-700 focus:ring-purple-500'
                    : 'border-red-500 focus:ring-red-500'
                )}
              />
            </div>

            {/* Filters dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-7 text-xs gap-1 border-gray-700 bg-gray-800/50"
              >
                <span>Ajouter un filtre</span>
                <ChevronDown className={cn('h-3 w-3 transition-transform', showFilters && 'rotate-180')} />
              </Button>

              {showFilters && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-[#1e1e2e] border border-gray-700 rounded-lg shadow-xl z-10 py-1 max-h-48 overflow-auto">
                  {AVAILABLE_FILTERS.map((filter) => (
                    <button
                      key={filter.name}
                      onClick={() => handleFilterSelect(filter.name)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{filter.name}</span>
                        <code className="text-[10px] text-gray-500 font-mono">
                          {filter.example}
                        </code>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{filter.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick examples */}
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Exemples
              </p>
              <div className="space-y-1">
                <code className="block text-xs text-gray-400 font-mono">
                  {'{{value}}'}
                  <span className="text-gray-600"> - Valeur directe</span>
                </code>
                <code className="block text-xs text-gray-400 font-mono">
                  {'{{value | uppercase}}'}
                  <span className="text-gray-600"> - Avec filtre</span>
                </code>
                <code className="block text-xs text-gray-400 font-mono">
                  {'{{value | default("N/A")}}'}
                  <span className="text-gray-600"> - Avec argument</span>
                </code>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 h-full flex flex-col">
            {/* Advanced JavaScript editor */}
            <div className="flex items-center gap-2 mb-1.5">
              <Code className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                JavaScript Expression
              </span>
            </div>

            <textarea
              value={localValue || `// value = ${mapping.sourcePath}\nreturn value;`}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={`// Transformer ${mapping.sourcePath}\nreturn value;`}
              className={cn(
                'flex-1 w-full px-3 py-2 bg-gray-800/50 border rounded-md font-mono text-sm',
                'text-white placeholder:text-gray-600 resize-none',
                'focus:outline-none focus:ring-1',
                validationResult.valid
                  ? 'border-gray-700 focus:ring-purple-500'
                  : 'border-red-500 focus:ring-red-500'
              )}
            />

            {/* JS help */}
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Variables disponibles
              </p>
              <div className="space-y-1">
                <code className="block text-xs text-gray-400 font-mono">
                  <span className="text-blue-400">value</span>
                  <span className="text-gray-600"> - Valeur du champ source</span>
                </code>
                <code className="block text-xs text-gray-400 font-mono">
                  <span className="text-blue-400">data</span>
                  <span className="text-gray-600"> - Donnees completes du node</span>
                </code>
                <code className="block text-xs text-gray-400 font-mono">
                  <span className="text-blue-400">_</span>
                  <span className="text-gray-600"> - Lodash utilities</span>
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
