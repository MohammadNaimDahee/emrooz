export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export function timeOfDay(hour: number = new Date().getHours()): TimeOfDay {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}
