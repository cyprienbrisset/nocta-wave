'use client';

import { useState, useEffect, useMemo } from 'react';
import { Play, AlertCircle, Check, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/stores/workflow.store';
import type { FieldMapping, NodeDataSchema, FieldSchema } from '@/types/mapping.types';

interface MappingPreviewProps {
  mapping: FieldMapping;
  sourceSchema: NodeDataSchema | null;
}

interface PreviewResult {
  success: boolean;
  inputValue: unknown;
  outputValue: unknown;
  error?: string;
  executionTime: number;
}

// Simple expression evaluator for preview
function evaluateSimpleExpression(
  expression: string,
  context: Record<string, unknown>
): unknown {
  // Extract path from {{path}} or {{path | filter}}
  const match = expression.match(/\{\{(.+?)\}\}/);
  if (!match || !match[1]) return expression;

  const parts = match[1].split('|').map((p) => p.trim());
  const path = parts[0] || '';
  const filters = parts.slice(1);

  // Get value from path
  let value: unknown = context;
  for (const key of path.split('.')) {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object') {
      value = (value as Record<string, unknown>)[key];
    }
  }

  // Apply filters
  for (const filter of filters) {
    const filterMatch = filter.match(/^(\w+)(?:\((.+)\))?$/);
    if (!filterMatch) continue;

    const [, filterName, filterArg] = filterMatch;

    switch (filterName) {
      case 'uppercase':
      case 'upper':
        value = String(value).toUpperCase();
        break;
      case 'lowercase':
      case 'lower':
        value = String(value).toLowerCase();
        break;
      case 'trim':
        value = String(value).trim();
        break;
      case 'first':
        value = Array.isArray(value) ? value[0] : value;
        break;
      case 'last':
        value = Array.isArray(value) ? value[value.length - 1] : value;
        break;
      case 'length':
        value = Array.isArray(value) ? value.length : String(value).length;
        break;
      case 'join':
        if (Array.isArray(value)) {
          const separator = filterArg?.replace(/['"]/g, '') || ', ';
          value = value.join(separator);
        }
        break;
      case 'default':
        if (value === undefined || value === null || value === '') {
          value = filterArg?.replace(/['"]/g, '') || '';
        }
        break;
      case 'json':
        value = JSON.stringify(value, null, 2);
        break;
      case 'number':
      case 'int':
        value = parseInt(String(value), 10);
        break;
      case 'float':
        value = parseFloat(String(value));
        break;
      case 'round':
        value = Math.round(Number(value));
        break;
      case 'keys':
        if (typeof value === 'object' && value !== null) {
          value = Object.keys(value);
        }
        break;
      case 'values':
        if (typeof value === 'object' && value !== null) {
          value = Object.values(value);
        }
        break;
    }
  }

  return value;
}

// Advanced JavaScript evaluator
function evaluateAdvancedExpression(
  expression: string,
  value: unknown,
  data: unknown
): unknown {
  try {
    // Create a safe function
    const fn = new Function('value', 'data', '_', expression);
    // Use a minimal lodash-like utility
    const _ = {
      get: (obj: any, path: string) => {
        return path.split('.').reduce((o, k) => o?.[k], obj);
      },
      map: (arr: any[], fn: (item: any) => any) => arr.map(fn),
      filter: (arr: any[], fn: (item: any) => boolean) => arr.filter(fn),
      first: (arr: any[]) => arr[0],
      last: (arr: any[]) => arr[arr.length - 1],
    };
    return fn(value, data, _);
  } catch (e) {
    throw new Error(`Erreur d'evaluation: ${(e as Error).message}`);
  }
}

export function MappingPreview({ mapping, sourceSchema }: MappingPreviewProps) {
  const { debug } = useWorkflowStore();
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  // Get source node data for preview
  const sourceData = useMemo(() => {
    if (!sourceSchema) return null;
    return debug.nodeData[sourceSchema.nodeId]?.output;
  }, [sourceSchema, debug.nodeData]);

  // Get value from source path
  const sourceValue = useMemo(() => {
    if (!sourceData) return undefined;

    let value: unknown = sourceData;
    for (const key of mapping.sourcePath.replace('output.', '').split('.')) {
      if (value === null || value === undefined) return undefined;
      if (typeof value === 'object') {
        value = (value as Record<string, unknown>)[key];
      }
    }
    return value;
  }, [sourceData, mapping.sourcePath]);

  // Run preview evaluation
  useEffect(() => {
    if (sourceValue === undefined) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(() => {
      const startTime = performance.now();

      try {
        let result: unknown;

        if (mapping.expressionMode === 'simple') {
          const expression = mapping.expression || `{{${mapping.sourcePath}}}`;
          result = evaluateSimpleExpression(expression, {
            [mapping.sourcePath]: sourceValue,
            value: sourceValue,
            ...sourceData as Record<string, unknown>,
          });
        } else {
          const expression = mapping.expression || 'return value;';
          result = evaluateAdvancedExpression(expression, sourceValue, sourceData);
        }

        setPreview({
          success: true,
          inputValue: sourceValue,
          outputValue: result,
          executionTime: performance.now() - startTime,
        });
      } catch (e) {
        setPreview({
          success: false,
          inputValue: sourceValue,
          outputValue: undefined,
          error: (e as Error).message,
          executionTime: performance.now() - startTime,
        });
      }
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [mapping, sourceValue, sourceData]);

  // Format value for display
  const formatValue = (value: unknown): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  // Truncate long values
  const truncateValue = (value: string, maxLength = 100): string => {
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength) + '...';
  };

  if (!sourceData) {
    return (
      <div className="flex flex-col h-full bg-[#0a0a14]">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-[#1a1a2e]/50">
          <Play className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-400">Preview</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Aucune donnee disponible</p>
            <p className="text-[10px] mt-1">Executez le workflow pour voir le preview</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a14]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-[#1a1a2e]/50">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-green-400" />
          <span className="text-xs font-medium text-white">Preview</span>
        </div>
        {preview && (
          <div className="flex items-center gap-2">
            {preview.success ? (
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <Check className="h-3 w-3" />
                Succes
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-red-400">
                <AlertCircle className="h-3 w-3" />
                Erreur
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <Clock className="h-3 w-3" />
              {preview.executionTime.toFixed(1)}ms
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 overflow-auto">
        {preview ? (
          <div className="space-y-3">
            {/* Input */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowRight className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] font-medium text-blue-400 uppercase">Input</span>
              </div>
              <pre className="bg-gray-900/50 rounded p-2 text-xs font-mono text-gray-300 overflow-auto max-h-20">
                {truncateValue(formatValue(preview.inputValue))}
              </pre>
            </div>

            {/* Output or Error */}
            {preview.success ? (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowRight className="h-3 w-3 text-green-400 rotate-180" />
                  <span className="text-[10px] font-medium text-green-400 uppercase">Output</span>
                </div>
                <pre className="bg-green-900/20 border border-green-900/50 rounded p-2 text-xs font-mono text-green-300 overflow-auto max-h-20">
                  {truncateValue(formatValue(preview.outputValue))}
                </pre>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertCircle className="h-3 w-3 text-red-400" />
                  <span className="text-[10px] font-medium text-red-400 uppercase">Erreur</span>
                </div>
                <pre className="bg-red-900/20 border border-red-900/50 rounded p-2 text-xs font-mono text-red-300">
                  {preview.error}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-xs">Chargement...</p>
          </div>
        )}
      </div>
    </div>
  );
}
