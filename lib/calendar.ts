export type FaerunDate = {
  dayOfMonth: number;
  month: number;
  monthName: string;
  monthAlias: string;
  year: number;
  dayOfYear: number;
};

export const FAERUN_MONTHS: { name: string; alias: string }[] = [
  { name: 'Hammer',    alias: 'Deepwinter' },
  { name: 'Alturiak',  alias: 'The Claw of Winter' },
  { name: 'Ches',      alias: 'The Claw of the Sunsets' },
  { name: 'Tarsakh',   alias: 'The Claw of Storms' },
  { name: 'Mirtul',    alias: 'The Melting' },
  { name: 'Kythorn',   alias: 'The Time of Flowers' },
  { name: 'Flamerule', alias: 'Summertide' },
  { name: 'Eleasias',  alias: 'Highsun' },
  { name: 'Eleint',    alias: 'The Fading' },
  { name: 'Marpenoth', alias: 'Leaffall' },
  { name: 'Uktar',     alias: 'The Rotting' },
  { name: 'Nightal',   alias: 'The Drawing Down' },
];

const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = FAERUN_MONTHS.length * DAYS_PER_MONTH; // 360

/** Convert an absolute game day (1-based) to a Faerun calendar date. */
export function dayToFaerunDate(day: number): FaerunDate {
  const d = Math.max(1, Math.floor(day));
  const year = Math.floor((d - 1) / DAYS_PER_YEAR) + 1;
  const dayOfYear = ((d - 1) % DAYS_PER_YEAR) + 1;
  const monthIndex = Math.floor((dayOfYear - 1) / DAYS_PER_MONTH);
  const dayOfMonth = ((dayOfYear - 1) % DAYS_PER_MONTH) + 1;

  return {
    dayOfMonth,
    month: monthIndex + 1,
    monthName: FAERUN_MONTHS[monthIndex].name,
    monthAlias: FAERUN_MONTHS[monthIndex].alias,
    year,
    dayOfYear,
  };
}

/** Short display string, e.g. "15 Kythorn, Year 4" */
export function faerunDateShort(day: number): string {
  const d = dayToFaerunDate(day);
  return `${d.dayOfMonth} ${d.monthName}, Year ${d.year}`;
}

/** Long display string, e.g. "15 Kythorn (The Time of Flowers), Year 4" */
export function faerunDateLong(day: number): string {
  const d = dayToFaerunDate(day);
  return `${d.dayOfMonth} ${d.monthName} (${d.monthAlias}), Year ${d.year}`;
}
