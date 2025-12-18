/**
 * Expression evaluator for workflow templates
 *
 * Supports expressions like:
 * - {{$trigger.body.name}} - Access trigger/input data
 * - {{$nodes.node1.data.value}} - Access previous node outputs
 * - {{$env.API_KEY}} - Access environment variables
 * - {{$input.data | json}} - Apply filters with pipe operator
 * - {{variables.myVar}} - Access workflow variables
 * - {{workflow.id}} - Access workflow metadata
 * - {{execution.id}} - Access execution metadata
 * - {{execution.timestamp}} - Current execution timestamp
 */

const EXPRESSION_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * Evaluate expressions in a string
 */
export function evaluateExpression(
  template: string,
  context: Record<string, any>,
): any {
  // If the entire string is a single expression, return the raw value
  const singleExpressionMatch = template.match(/^\{\{([^}]+)\}\}$/);
  if (singleExpressionMatch && singleExpressionMatch[1]) {
    return evaluateSingleExpression(singleExpressionMatch[1].trim(), context);
  }

  // Replace all expressions in the string
  return template.replace(EXPRESSION_REGEX, (_, expression) => {
    const result = evaluateSingleExpression(expression.trim(), context);
    // Convert to string for template interpolation
    if (typeof result === 'object') {
      return JSON.stringify(result);
    }
    return String(result ?? '');
  });
}

/**
 * Evaluate a single expression
 */
function evaluateSingleExpression(
  expression: string,
  context: Record<string, any>,
): any {
  // Check for pipe operators (filters)
  const pipeIndex = expression.indexOf('|');
  let path = expression;
  let filters: string[] = [];

  if (pipeIndex !== -1) {
    path = expression.substring(0, pipeIndex).trim();
    filters = expression
      .substring(pipeIndex + 1)
      .split('|')
      .map((f) => f.trim());
  }

  // Evaluate the path
  let value = getValueByPath(context, path);

  // Apply filters
  for (const filter of filters) {
    value = applyFilter(value, filter);
  }

  return value;
}

/**
 * Get value from object by dot-notation path
 */
function getValueByPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }

    // Handle array access like items[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      const index = arrayMatch[2];
      if (key && index) {
        current = current[key];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return undefined;
        }
      }
    } else {
      current = current[part];
    }
  }

  return current;
}

/**
 * Apply a filter to a value
 */
function applyFilter(value: any, filter: string): any {
  // Parse filter with arguments like: filter(arg1, arg2)
  const filterMatch = filter.match(/^(\w+)(?:\((.*)\))?$/);
  if (!filterMatch) {
    return value;
  }

  const filterName = filterMatch[1];
  const argsString = filterMatch[2];
  if (!filterName) {
    return value;
  }
  const args = argsString
    ? argsString.split(',').map((arg) => {
        const trimmed = arg.trim();
        // Try to parse as JSON
        try {
          return JSON.parse(trimmed);
        } catch {
          // Return as string
          return trimmed.replace(/^['"]|['"]$/g, '');
        }
      })
    : [];

  switch (filterName.toLowerCase()) {
    // String filters
    case 'uppercase':
    case 'upper':
      return String(value).toUpperCase();

    case 'lowercase':
    case 'lower':
      return String(value).toLowerCase();

    case 'trim':
      return String(value).trim();

    case 'replace':
      return String(value).replace(String(args[0]), String(args[1] || ''));

    case 'split':
      return String(value).split(String(args[0] || ','));

    case 'slice':
      return String(value).slice(
        parseInt(args[0] as string, 10) || 0,
        args[1] ? parseInt(args[1] as string, 10) : undefined,
      );

    case 'length':
      if (typeof value === 'string' || Array.isArray(value)) {
        return value.length;
      }
      return 0;

    // JSON filters
    case 'json':
      return JSON.stringify(value, null, 2);

    case 'parse':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }

    // Number filters
    case 'number':
    case 'int':
      return parseInt(String(value), 10);

    case 'float':
      return parseFloat(String(value));

    case 'round':
      return Math.round(parseFloat(String(value)));

    case 'floor':
      return Math.floor(parseFloat(String(value)));

    case 'ceil':
      return Math.ceil(parseFloat(String(value)));

    case 'abs':
      return Math.abs(parseFloat(String(value)));

    // Array filters
    case 'first':
      return Array.isArray(value) ? value[0] : value;

    case 'last':
      return Array.isArray(value) ? value[value.length - 1] : value;

    case 'join':
      return Array.isArray(value) ? value.join(String(args[0] || ', ')) : value;

    case 'reverse':
      if (Array.isArray(value)) {
        return [...value].reverse();
      }
      return String(value).split('').reverse().join('');

    case 'sort':
      if (Array.isArray(value)) {
        return [...value].sort();
      }
      return value;

    case 'unique':
      if (Array.isArray(value)) {
        return [...new Set(value)];
      }
      return value;

    case 'flatten':
      if (Array.isArray(value)) {
        return value.flat();
      }
      return value;

    // Object filters
    case 'keys':
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value);
      }
      return [];

    case 'values':
      if (typeof value === 'object' && value !== null) {
        return Object.values(value);
      }
      return [];

    case 'entries':
      if (typeof value === 'object' && value !== null) {
        return Object.entries(value);
      }
      return [];

    // Boolean filters
    case 'bool':
    case 'boolean':
      return Boolean(value);

    case 'not':
      return !value;

    // Date filters
    case 'date':
      return new Date(value).toISOString();

    case 'timestamp':
      return new Date(value).getTime();

    // Default: passthrough
    case 'default':
      return value === undefined || value === null || value === ''
        ? args[0]
        : value;

    default:
      console.warn(`Unknown filter: ${filterName}`);
      return value;
  }
}

/**
 * Check if a string contains expressions
 */
export function hasExpressions(value: string): boolean {
  return EXPRESSION_REGEX.test(value);
}

/**
 * Extract all expressions from a string
 */
export function extractExpressions(value: string): string[] {
  const expressions: string[] = [];
  let match;

  const regex = new RegExp(EXPRESSION_REGEX);
  while ((match = regex.exec(value)) !== null) {
    if (match[1]) {
      expressions.push(match[1].trim());
    }
  }

  return expressions;
}
