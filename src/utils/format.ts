/**
 * Formatting utilities
 */

import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from 'date-fns';

/**
 * Format time in 12-hour format
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'h:mm a');
}

/**
 * Format date with smart relative labels
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE, MMM d');
}

/**
 * Format date and time together
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return `${formatDate(d)} at ${formatTime(d)}`;
}

/**
 * Format relative time (e.g., "3 min ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format occupancy percentage with color hint
 */
export function formatOccupancy(percent: number): {
  text: string;
  color: 'green' | 'yellow' | 'orange' | 'red';
} {
  if (percent >= 95) return { text: 'Full', color: 'red' };
  if (percent >= 80) return { text: 'Filling', color: 'orange' };
  if (percent >= 60) return { text: 'Busy', color: 'yellow' };
  return { text: 'Open', color: 'green' };
}

/**
 * Format walk time in minutes
 */
export function formatWalkTime(minutes: number): string {
  if (minutes === 1) return '1 min walk';
  return `${minutes} min walk`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with suffix (1K, 2.5K, etc.)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format time duration (minutes to human readable)
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

/**
 * Get greeting based on time of day
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
}

/**
 * Format day of week
 */
export function formatDayOfWeek(dayIndex: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex] ?? '';
}

/**
 * Format day of week short
 */
export function formatDayOfWeekShort(dayIndex: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex] ?? '';
}
