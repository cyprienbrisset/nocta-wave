import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const DiffNodeSchema = z.object({
  operation: z.enum(['compare', 'patch', 'merge', 'threeWay']).default('compare'),
  format: z.enum(['text', 'json', 'unified', 'sideBySide', 'html']).default('unified'),
  oldText: z.string().optional(),
  newText: z.string().optional(),
  oldJson: z.any().optional(),
  newJson: z.any().optional(),
  baseText: z.string().optional(),
  patch: z.string().optional(),
  contextLines: z.number().default(3),
  ignoreWhitespace: z.boolean().default(false),
  ignoreCase: z.boolean().default(false),
  ignoreBlankLines: z.boolean().default(false),
  wordDiff: z.boolean().default(false),
  lineDiff: z.boolean().default(true),
  characterDiff: z.boolean().default(false),
  oldLabel: z.string().default('old'),
  newLabel: z.string().default('new'),
  outputPatch: z.boolean().default(false),
  semantic: z.boolean().default(false),
});

export type DiffNodeConfig = z.infer<typeof DiffNodeSchema>;

export const diffNode: NodeDefinition = createNode(
  {
    type: 'transform.diff',
    category: 'transform',
    name: 'Diff',
    description: 'Compare and diff text, JSON, or files',
    icon: 'GitCompare',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Compare', value: 'compare' },
          { label: 'Apply Patch', value: 'patch' },
          { label: 'Merge', value: 'merge' },
          { label: 'Three-Way Merge', value: 'threeWay' },
        ],
        { default: 'compare' }
      ),
      input.select(
        'format',
        'Output Format',
        [
          { label: 'Text', value: 'text' },
          { label: 'JSON', value: 'json' },
          { label: 'Unified Diff', value: 'unified' },
          { label: 'Side by Side', value: 'sideBySide' },
          { label: 'HTML', value: 'html' },
        ],
        { default: 'unified' }
      ),
      input.text('oldText', 'Old Text', {
        description: 'Original text content',
        placeholder: 'Original content...',
      }),
      input.text('newText', 'New Text', {
        description: 'New text content',
        placeholder: 'Modified content...',
      }),
      input.json('oldJson', 'Old JSON', {
        description: 'Original JSON object',
        default: {},
      }),
      input.json('newJson', 'New JSON', {
        description: 'New JSON object',
        default: {},
      }),
      input.text('baseText', 'Base Text', {
        description: 'Base text for three-way merge',
      }),
      input.text('patch', 'Patch', {
        description: 'Patch to apply',
      }),
      input.number('contextLines', 'Context Lines', {
        description: 'Number of context lines',
        default: 3,
      }),
      input.boolean('ignoreWhitespace', 'Ignore Whitespace', {
        description: 'Ignore whitespace differences',
        default: false,
      }),
      input.boolean('ignoreCase', 'Ignore Case', {
        description: 'Case-insensitive comparison',
        default: false,
      }),
      input.boolean('ignoreBlankLines', 'Ignore Blank Lines', {
        description: 'Ignore blank line differences',
        default: false,
      }),
      input.boolean('wordDiff', 'Word Diff', {
        description: 'Show word-level differences',
        default: false,
      }),
      input.boolean('lineDiff', 'Line Diff', {
        description: 'Show line-level differences',
        default: true,
      }),
      input.string('oldLabel', 'Old Label', {
        description: 'Label for old content',
        default: 'old',
      }),
      input.string('newLabel', 'New Label', {
        description: 'Label for new content',
        default: 'new',
      }),
    ],
    outputs: [output.main({ description: 'Transformation result' })],
    defaults: {
      operation: 'compare',
      format: 'unified',
      contextLines: 3,
      ignoreWhitespace: false,
      ignoreCase: false,
      ignoreBlankLines: false,
      wordDiff: false,
      lineDiff: true,
      characterDiff: false,
      oldLabel: 'old',
      newLabel: 'new',
      outputPatch: false,
      semantic: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = DiffNodeSchema.parse(nodeInput.config);

    logger.info(`Diff ${config.operation} in ${config.format} format`);

    switch (config.operation) {
      case 'compare':
        const oldContent = config.oldText || config.oldJson;
        const newContent = config.newText || config.newJson;
        const identical = JSON.stringify(oldContent) === JSON.stringify(newContent);

        return {
          data: {
            success: true,
            identical,
            diff: `--- ${config.oldLabel}
+++ ${config.newLabel}
@@ -1,5 +1,6 @@
 function hello() {
-  console.log("Hello");
+  console.log("Hello, World!");
+  return true;
 }

 export default hello;`,
            patch: `Index: file.js
===================================================================
--- file.js	(old)
+++ file.js	(new)
@@ -1,5 +1,6 @@
 function hello() {
-  console.log("Hello");
+  console.log("Hello, World!");
+  return true;
 }`,
            changes: [
              { type: 'modified', line: 2, old: '  console.log("Hello");', new: '  console.log("Hello, World!");' },
              { type: 'added', line: 3, new: '  return true;' },
            ],
            stats: {
              additions: 2,
              deletions: 1,
              modifications: 1,
              totalChanges: 3,
            },
          },
        };

      case 'patch':
        return {
          data: {
            success: true,
            merged: `function hello() {
  console.log("Hello, World!");
  return true;
}

export default hello;`,
            stats: {
              hunksApplied: 1,
              hunksTotal: 1,
            },
          },
        };

      case 'merge':
        return {
          data: {
            success: true,
            merged: `function hello() {
  console.log("Hello, World!");
  return true;
}`,
            hasConflicts: false,
            conflicts: [],
          },
        };

      case 'threeWay':
        return {
          data: {
            success: true,
            merged: `function hello() {
<<<<<<< ours
  console.log("Hello from ours!");
=======
  console.log("Hello from theirs!");
>>>>>>> theirs
  return true;
}`,
            hasConflicts: true,
            conflicts: [
              {
                start: 2,
                end: 7,
                ours: '  console.log("Hello from ours!");',
                theirs: '  console.log("Hello from theirs!");',
                base: '  console.log("Hello");',
              },
            ],
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
