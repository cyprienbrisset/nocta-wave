import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
    case 'ACTIVE':
      return 'text-green-600 bg-green-100';
    case 'RUNNING':
    case 'QUEUED':
    case 'PENDING':
      return 'text-blue-600 bg-blue-100';
    case 'FAILED':
    case 'TIMEOUT':
      return 'text-red-600 bg-red-100';
    case 'CANCELLED':
    case 'INACTIVE':
    case 'ARCHIVED':
      return 'text-gray-600 bg-gray-100';
    case 'DRAFT':
      return 'text-yellow-600 bg-yellow-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}
