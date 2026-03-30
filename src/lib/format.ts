import { format, formatDuration, intervalToDuration } from 'date-fns';
import { sv } from 'date-fns/locale';

export function formatSwedishDateTime(dateStr: string): string {
  return format(new Date(dateStr), "EEE d MMM, HH:mm", { locale: sv });
}

export function formatSwedishDate(dateStr: string): string {
  return format(new Date(dateStr), "d MMM yyyy", { locale: sv });
}

export function formatSwedishTime(dateStr: string): string {
  return format(new Date(dateStr), "HH:mm", { locale: sv });
}

export function calculateDuration(start: string, end: string): string {
  const duration = intervalToDuration({
    start: new Date(start),
    end: new Date(end),
  });
  const parts: string[] = [];
  if (duration.hours) parts.push(`${duration.hours}h`);
  if (duration.minutes) parts.push(`${duration.minutes}min`);
  return parts.join(' ') || '0min';
}

export function calculateDecimalHours(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round((ms / 3600000) * 100) / 100;
}
