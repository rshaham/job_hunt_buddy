import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatTimeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: false });
}

export function getGradeColor(grade: string): string {
  const letter = grade.charAt(0).toUpperCase();
  switch (letter) {
    case 'A':
      return 'text-green-600 bg-green-100';
    case 'B':
      return 'text-blue-600 bg-blue-100';
    case 'C':
      return 'text-yellow-600 bg-yellow-100';
    case 'D':
      return 'text-orange-600 bg-orange-100';
    case 'F':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getJobTypeIcon(type: string): string {
  switch (type) {
    case 'remote':
      return '🏠';
    case 'hybrid':
      return '🔀';
    case 'onsite':
      return '🏢';
    default:
      return '📍';
  }
}

export function encodeApiKey(key: string): string {
  return btoa(key);
}

export function decodeApiKey(encoded: string): string {
  try {
    return atob(encoded);
  } catch {
    return '';
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
