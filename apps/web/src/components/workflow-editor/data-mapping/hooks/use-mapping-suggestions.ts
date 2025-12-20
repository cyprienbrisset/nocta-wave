'use client';

import { useMemo } from 'react';
import type {
  FieldSchema,
  NodeDataSchema,
  MappingSuggestion,
  MappingSuggestionReason,
  FieldMapping,
} from '@/types/mapping.types';
import { areTypesCompatible } from '@/types/mapping.types';

/**
 * Calculate string similarity using Levenshtein distance
 */
function stringSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 1;

  const matrix: number[][] = [];

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }

  const firstRow = matrix[0];
  if (firstRow) {
    for (let j = 0; j <= aLower.length; j++) {
      firstRow[j] = j;
    }
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      const currentRow = matrix[i];
      const prevRow = matrix[i - 1];
      if (!currentRow || !prevRow) continue;

      if (bLower[i - 1] === aLower[j - 1]) {
        currentRow[j] = prevRow[j - 1] ?? 0;
      } else {
        currentRow[j] = Math.min(
          (prevRow[j - 1] ?? 0) + 1,
          (currentRow[j - 1] ?? 0) + 1,
          (prevRow[j] ?? 0) + 1
        );
      }
    }
  }

  const maxLen = Math.max(aLower.length, bLower.length);
  const lastRow = matrix[bLower.length];
  const distance = lastRow ? (lastRow[aLower.length] ?? 0) : 0;
  return 1 - distance / maxLen;
}

/**
 * Check if two field names are semantically similar
 */
function areNamesRelated(sourceName: string, targetName: string): boolean {
  const normalizedSource = sourceName.toLowerCase().replace(/[_-]/g, '');
  const normalizedTarget = targetName.toLowerCase().replace(/[_-]/g, '');

  // Exact match
  if (normalizedSource === normalizedTarget) return true;

  // One contains the other
  if (normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)) {
    return true;
  }

  // Common patterns
  const patterns = [
    ['email', 'mail', 'emailaddress'],
    ['name', 'fullname', 'displayname', 'username'],
    ['firstname', 'first', 'prenom'],
    ['lastname', 'last', 'nom', 'surname'],
    ['id', 'identifier', 'uid', 'uuid'],
    ['phone', 'tel', 'telephone', 'mobile'],
    ['address', 'addr', 'location'],
    ['date', 'datetime', 'timestamp', 'time', 'at'],
    ['url', 'link', 'href', 'uri'],
    ['message', 'text', 'content', 'body'],
    ['title', 'subject', 'heading'],
    ['description', 'desc', 'summary'],
    ['status', 'state', 'active', 'enabled'],
    ['count', 'total', 'number', 'amount', 'quantity'],
    ['price', 'cost', 'amount', 'value'],
  ];

  for (const group of patterns) {
    if (
      group.some((p) => normalizedSource.includes(p)) &&
      group.some((p) => normalizedTarget.includes(p))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Flatten schema to get all leaf fields
 */
function flattenSchema(
  fields: FieldSchema[],
  prefix = ''
): FieldSchema[] {
  const result: FieldSchema[] = [];

  for (const field of fields) {
    const fullPath = prefix ? `${prefix}.${field.name}` : field.path;
    result.push({ ...field, path: fullPath });

    if (field.children && field.type !== 'array') {
      result.push(...flattenSchema(field.children, fullPath));
    }
  }

  return result;
}

/**
 * Generate mapping suggestions based on source and target schemas
 */
export function generateSuggestions(
  sourceSchema: NodeDataSchema | null,
  targetSchema: NodeDataSchema | null,
  existingMappings: FieldMapping[]
): MappingSuggestion[] {
  if (!sourceSchema || !targetSchema) return [];

  const suggestions: MappingSuggestion[] = [];
  const existingTargetPaths = new Set(existingMappings.map((m) => m.targetPath));

  const sourceFields = flattenSchema(sourceSchema.outputSchema);
  const targetFields = flattenSchema(targetSchema.inputSchema);

  for (const targetField of targetFields) {
    // Skip already mapped targets
    if (existingTargetPaths.has(targetField.path)) continue;

    let bestMatch: { source: FieldSchema; confidence: number; reason: MappingSuggestionReason } | null = null;

    for (const sourceField of sourceFields) {
      let confidence = 0;
      let reason: MappingSuggestionReason = 'same_type';

      // Exact name match
      if (sourceField.name.toLowerCase() === targetField.name.toLowerCase()) {
        confidence = 0.95;
        reason = 'exact_name_match';
      }
      // Similar names
      else if (areNamesRelated(sourceField.name, targetField.name)) {
        confidence = 0.8;
        reason = 'similar_name';
      }
      // String similarity
      else {
        const similarity = stringSimilarity(sourceField.name, targetField.name);
        if (similarity > 0.7) {
          confidence = similarity * 0.7;
          reason = 'similar_name';
        }
      }

      // Type compatibility bonus
      if (areTypesCompatible(sourceField.type, targetField.type)) {
        confidence += 0.1;
      } else {
        confidence -= 0.3;
      }

      // Same type bonus
      if (sourceField.type === targetField.type) {
        confidence += 0.05;
        if (!reason || reason === 'same_type') {
          reason = 'same_type';
        }
      }

      // Update best match
      if (confidence > 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { source: sourceField, confidence, reason };
      }
    }

    if (bestMatch) {
      suggestions.push({
        id: `suggestion-${targetField.path}-${bestMatch.source.path}`,
        sourcePath: bestMatch.source.path,
        targetPath: targetField.path,
        sourceField: bestMatch.source,
        targetField,
        confidence: Math.min(bestMatch.confidence, 1),
        reason: bestMatch.reason,
      });
    }
  }

  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Hook to get mapping suggestions for an edge
 */
export function useMappingSuggestions(
  sourceSchema: NodeDataSchema | null,
  targetSchema: NodeDataSchema | null,
  existingMappings: FieldMapping[]
) {
  return useMemo(
    () => generateSuggestions(sourceSchema, targetSchema, existingMappings),
    [sourceSchema, targetSchema, existingMappings]
  );
}
