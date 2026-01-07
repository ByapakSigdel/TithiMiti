export type CalendarMode = 'AD' | 'BS';
export type LanguageMode = 'en' | 'np-rom';

export interface BsDay {
  bsYear: number;
  bsMonth: number; // 1-12
  bsDay: number; // 1-32
  adDateISO: string; // YYYY-MM-DD
  weekday: number; // 0-6 (0=Sunday)
  tithiRom?: string; // Romanized Nepali (e.g., 'Purnima')
  holidayNameRom?: string | null;
  events?: string[]; // List of event names (API provided)
  nepalSambat?: number; // Nepal Sambat year
  sakSambat?: number; // Sak Sambat year
  extraDetails?: {
    // Times
    sunrise?: string;
    sunset?: string;
    moonrise?: string;
    moonset?: string;
    tithiEnd?: string;
    tithiEndDisplay?: string;
    // Panchanga
    pakshya?: string;
    nakshatra?: string;
    nakshatraEnd?: string;
    yog?: string;
    yogEnd?: string;
    karan?: string;
    karanSecond?: string;
    // Rashi
    chandraRashi?: string;
    chandraRashiEnd?: string;
    suryaRashi?: string;
    // Season
    ritu?: string;
    ayan?: string;
    // Muhurats
    muhurats?: Array<{ name: string; time: string }>;
    [key: string]: any; // Allow dynamic fields
  };
}

export interface BsMonth {
  bsYear: number;
  bsMonth: number;
  bsMonthNameRom?: string;
  days: BsDay[];
}

export interface RawBsMonth {
  [key: string]: any;
}

export interface AdDay {
  dateISO: string; // YYYY-MM-DD
  day: number; // 1-31
  month: number; // 1-12
  year: number;
  weekday: number; // 0-6
}

export interface ConverterResult {
  mode: CalendarMode;
  ad?: AdDay;
  bs?: BsDay;
}

export interface EventItem {
  id: string;
  title: string;
  description?: string;
  adDateISO: string; // YYYY-MM-DD
  reminderAtISO?: string; // ISO datetime for local schedules
  isAllDay?: boolean;
}
