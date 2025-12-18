import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const DateTimeSchema = z.object({
  operation: z.enum(['now', 'format', 'parse', 'add', 'subtract', 'diff', 'compare', 'startOf', 'endOf']).default('now'),
  input: z.string().optional(),
  format: z.string().default('ISO'),
  outputFormat: z.string().default('ISO'),
  timezone: z.string().default('UTC'),
  amount: z.number().default(0),
  unit: z.enum(['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds']).default('days'),
  input2: z.string().optional(),
});

const formatDate = (date: Date, format: string, timezone: string): string => {
  if (format === 'ISO') {
    return date.toISOString();
  }
  if (format === 'timestamp') {
    return date.getTime().toString();
  }
  if (format === 'unix') {
    return Math.floor(date.getTime() / 1000).toString();
  }

  const options: Intl.DateTimeFormatOptions = { timeZone: timezone };

  // Simple format patterns
  const formatMap: Record<string, Intl.DateTimeFormatOptions> = {
    'YYYY-MM-DD': { year: 'numeric', month: '2-digit', day: '2-digit' },
    'DD/MM/YYYY': { year: 'numeric', month: '2-digit', day: '2-digit' },
    'MM/DD/YYYY': { year: 'numeric', month: '2-digit', day: '2-digit' },
    'YYYY-MM-DD HH:mm:ss': { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false },
    'full': { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' },
    'date': { year: 'numeric', month: 'long', day: 'numeric' },
    'time': { hour: '2-digit', minute: '2-digit', second: '2-digit' },
  };

  const formatOptions = formatMap[format] || formatMap['YYYY-MM-DD HH:mm:ss'];
  return new Intl.DateTimeFormat('en-US', { ...options, ...formatOptions }).format(date);
};

const parseDate = (input: string, format: string): Date => {
  if (format === 'ISO' || format === 'auto') {
    return new Date(input);
  }
  if (format === 'timestamp') {
    return new Date(parseInt(input, 10));
  }
  if (format === 'unix') {
    return new Date(parseInt(input, 10) * 1000);
  }
  return new Date(input);
};

const addTime = (date: Date, amount: number, unit: string): Date => {
  const result = new Date(date);
  switch (unit) {
    case 'years':
      result.setFullYear(result.getFullYear() + amount);
      break;
    case 'months':
      result.setMonth(result.getMonth() + amount);
      break;
    case 'weeks':
      result.setDate(result.getDate() + amount * 7);
      break;
    case 'days':
      result.setDate(result.getDate() + amount);
      break;
    case 'hours':
      result.setHours(result.getHours() + amount);
      break;
    case 'minutes':
      result.setMinutes(result.getMinutes() + amount);
      break;
    case 'seconds':
      result.setSeconds(result.getSeconds() + amount);
      break;
    case 'milliseconds':
      result.setMilliseconds(result.getMilliseconds() + amount);
      break;
  }
  return result;
};

const startOf = (date: Date, unit: string): Date => {
  const result = new Date(date);
  switch (unit) {
    case 'years':
      result.setMonth(0, 1);
      result.setHours(0, 0, 0, 0);
      break;
    case 'months':
      result.setDate(1);
      result.setHours(0, 0, 0, 0);
      break;
    case 'weeks':
      const day = result.getDay();
      result.setDate(result.getDate() - day);
      result.setHours(0, 0, 0, 0);
      break;
    case 'days':
      result.setHours(0, 0, 0, 0);
      break;
    case 'hours':
      result.setMinutes(0, 0, 0);
      break;
    case 'minutes':
      result.setSeconds(0, 0);
      break;
    case 'seconds':
      result.setMilliseconds(0);
      break;
  }
  return result;
};

const endOf = (date: Date, unit: string): Date => {
  const result = new Date(date);
  switch (unit) {
    case 'years':
      result.setMonth(11, 31);
      result.setHours(23, 59, 59, 999);
      break;
    case 'months':
      result.setMonth(result.getMonth() + 1, 0);
      result.setHours(23, 59, 59, 999);
      break;
    case 'weeks':
      const day = result.getDay();
      result.setDate(result.getDate() + (6 - day));
      result.setHours(23, 59, 59, 999);
      break;
    case 'days':
      result.setHours(23, 59, 59, 999);
      break;
    case 'hours':
      result.setMinutes(59, 59, 999);
      break;
    case 'minutes':
      result.setSeconds(59, 999);
      break;
    case 'seconds':
      result.setMilliseconds(999);
      break;
  }
  return result;
};

export const datetimeNode: NodeDefinition = createNode(
  {
    type: 'utility.datetime',
    category: 'utility',
    name: 'Date & Time',
    description: 'Parse, format, and manipulate dates and times',
    icon: 'Calendar',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Current Time', value: 'now' },
        { label: 'Format Date', value: 'format' },
        { label: 'Parse Date', value: 'parse' },
        { label: 'Add Time', value: 'add' },
        { label: 'Subtract Time', value: 'subtract' },
        { label: 'Difference', value: 'diff' },
        { label: 'Compare', value: 'compare' },
        { label: 'Start Of', value: 'startOf' },
        { label: 'End Of', value: 'endOf' },
      ], { default: 'now' }),
      input.string('input', 'Input Date', { description: 'Date string to process' }),
      input.select('format', 'Input Format', [
        { label: 'ISO 8601', value: 'ISO' },
        { label: 'Auto Detect', value: 'auto' },
        { label: 'Unix Timestamp (seconds)', value: 'unix' },
        { label: 'Timestamp (milliseconds)', value: 'timestamp' },
        { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
        { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
        { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
      ], { default: 'ISO' }),
      input.select('outputFormat', 'Output Format', [
        { label: 'ISO 8601', value: 'ISO' },
        { label: 'Unix Timestamp (seconds)', value: 'unix' },
        { label: 'Timestamp (milliseconds)', value: 'timestamp' },
        { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
        { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
        { label: 'Full', value: 'full' },
        { label: 'Date Only', value: 'date' },
        { label: 'Time Only', value: 'time' },
      ], { default: 'ISO' }),
      input.string('timezone', 'Timezone', { default: 'UTC', description: 'IANA timezone (e.g., America/New_York)' }),
      input.number('amount', 'Amount', { default: 0, description: 'Amount to add/subtract' }),
      input.select('unit', 'Unit', [
        { label: 'Years', value: 'years' },
        { label: 'Months', value: 'months' },
        { label: 'Weeks', value: 'weeks' },
        { label: 'Days', value: 'days' },
        { label: 'Hours', value: 'hours' },
        { label: 'Minutes', value: 'minutes' },
        { label: 'Seconds', value: 'seconds' },
        { label: 'Milliseconds', value: 'milliseconds' },
      ], { default: 'days' }),
      input.string('input2', 'Second Date', { description: 'Second date for comparison/diff' }),
    ],
    outputs: [
      output.string('result', 'Formatted date/time result'),
      output.number('timestamp', 'Unix timestamp'),
      output.object('parts', 'Date parts (year, month, day, etc.)'),
    ],
    defaults: { operation: 'now', format: 'ISO', outputFormat: 'ISO', timezone: 'UTC', unit: 'days', amount: 0 },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = DateTimeSchema.parse(nodeInput.config);

    logger.info(`DateTime: ${config.operation}`);

    let date: Date;
    let result: string;
    let timestamp: number;

    switch (config.operation) {
      case 'now':
        date = new Date();
        break;

      case 'format':
        date = parseDate(config.input || new Date().toISOString(), config.format);
        break;

      case 'parse':
        date = parseDate(config.input || '', config.format);
        break;

      case 'add':
        date = parseDate(config.input || new Date().toISOString(), config.format);
        date = addTime(date, config.amount, config.unit);
        break;

      case 'subtract':
        date = parseDate(config.input || new Date().toISOString(), config.format);
        date = addTime(date, -config.amount, config.unit);
        break;

      case 'diff': {
        const date1 = parseDate(config.input || new Date().toISOString(), config.format);
        const date2 = parseDate(config.input2 || new Date().toISOString(), config.format);
        const diffMs = date2.getTime() - date1.getTime();

        const diffUnits: Record<string, number> = {
          milliseconds: diffMs,
          seconds: diffMs / 1000,
          minutes: diffMs / (1000 * 60),
          hours: diffMs / (1000 * 60 * 60),
          days: diffMs / (1000 * 60 * 60 * 24),
          weeks: diffMs / (1000 * 60 * 60 * 24 * 7),
          months: diffMs / (1000 * 60 * 60 * 24 * 30),
          years: diffMs / (1000 * 60 * 60 * 24 * 365),
        };

        return {
          data: {
            result: (diffUnits[config.unit as keyof typeof diffUnits] ?? diffMs).toString(),
            timestamp: diffMs,
            parts: diffUnits,
          },
        };
      }

      case 'compare': {
        const date1 = parseDate(config.input || new Date().toISOString(), config.format);
        const date2 = parseDate(config.input2 || new Date().toISOString(), config.format);
        const comparison = date1.getTime() - date2.getTime();

        return {
          data: {
            result: comparison < 0 ? 'before' : comparison > 0 ? 'after' : 'equal',
            timestamp: comparison,
            parts: {
              isBefore: comparison < 0,
              isAfter: comparison > 0,
              isEqual: comparison === 0,
              difference: comparison,
            },
          },
        };
      }

      case 'startOf':
        date = parseDate(config.input || new Date().toISOString(), config.format);
        date = startOf(date, config.unit);
        break;

      case 'endOf':
        date = parseDate(config.input || new Date().toISOString(), config.format);
        date = endOf(date, config.unit);
        break;

      default:
        throw new Error(`Unknown operation: ${config.operation}`);
    }

    result = formatDate(date, config.outputFormat, config.timezone);
    timestamp = date.getTime();

    const parts = {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
      millisecond: date.getMilliseconds(),
      dayOfWeek: date.getDay(),
      dayOfYear: Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)),
      weekOfYear: Math.ceil((((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(date.getFullYear(), 0, 1).getDay() + 1) / 7),
      iso: date.toISOString(),
    };

    return { data: { result, timestamp, parts } };
  }
);
