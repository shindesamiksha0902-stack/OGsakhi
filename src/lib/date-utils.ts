import { format, parseISO, differenceInDays, addDays, startOfDay } from 'date-fns';

/**
 * Formats a Date or ISO string to standard YYYY-MM-DD
 */
export function toISODate(date: Date | string): string {
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return format(date, 'yyyy-MM-dd');
}

/**
 * Friendly readable date (e.g., "Monday, Oct 2")
 */
export function formatFriendlyDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEEE, MMM d');
}

/**
 * Short date (e.g., "Oct 2")
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d');
}

/**
 * Difference in whole calendar days between two dates
 */
export function daysBetween(from: Date | string, to: Date | string): number {
  const d1 = typeof from === 'string' ? parseISO(from) : from;
  const d2 = typeof to === 'string' ? parseISO(to) : to;
  return differenceInDays(startOfDay(d2), startOfDay(d1));
}

/**
 * Adds N days to a date string or Date
 */
export function addDaysToDate(date: Date | string, days: number): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return toISODate(addDays(d, days));
}
