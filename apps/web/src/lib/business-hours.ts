export interface DayHours {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export type BusinessHours = Partial<Record<string, DayHours | null>>;

export const WEEKDAYS: { key: string; label: string }[] = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

const JS_DAY_TO_KEY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export function isWithinBusinessHours(hours: BusinessHours | null | undefined, date: Date): boolean {
  if (!hours || Object.keys(hours).length === 0) return true;
  const day = hours[JS_DAY_TO_KEY[date.getDay()]];
  if (day === undefined) return true;
  if (day === null) return false;
  const minutes = date.getHours() * 60 + date.getMinutes();
  const [sh, sm] = day.start.split(':').map(Number);
  const [eh, em] = day.end.split(':').map(Number);
  return minutes >= sh * 60 + sm && minutes <= eh * 60 + em;
}

export function formatBusinessHours(hours: BusinessHours | null | undefined): string[] {
  if (!hours || Object.keys(hours).length === 0) return [];
  return WEEKDAYS.filter((d) => hours[d.key] !== undefined).map((d) => {
    const day = hours[d.key];
    return day ? `${d.label}: ${day.start}–${day.end}` : `${d.label}: fechado`;
  });
}
