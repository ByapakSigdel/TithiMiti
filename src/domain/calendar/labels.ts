// Mappings for Romanized Nepali

export const BS_MONTHS_ROMANIZED = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

export const BS_DAYS_ROMANIZED = [
  'Aaitabar', 'Sombar', 'Mangalbar', 'Budhabar', 'Bihibar', 'Shukrabar', 'Sanibar'
];

export const AD_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const AD_DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

// Tithi Mapping (Devanagari -> Romanized)
export const TITHI_MAP: Record<string, string> = {
  'प्रतिपदा': 'Pratipada',
  'द्वितीया': 'Dwitiya',
  'तृतीया': 'Tritiya',
  'चतुर्थी': 'Chaturthi',
  'पञ्चमी': 'Panchami',
  'षष्ठी': 'Shasthi',
  'सप्तमी': 'Saptami',
  'अष्टमी': 'Ashtami',
  'नवमी': 'Navami',
  'दशमी': 'Dashami',
  'एकादशी': 'Ekadashi',
  'द्वादशी': 'Dwadashi',
  'त्रयोदशी': 'Trayodashi',
  'चतुर्दशी': 'Chaturdashi',
  'औँशी': 'Aunsi',
  'पूर्णिमा': 'Purnima',
  'पुर्णिमा': 'Purnima',
};

export function romanizeTithi(nepaliTithi: string | null): string {
  if (!nepaliTithi) return '';
  // Remove " बजेसम्म" or other suffixes if present in the raw string
  // Also handle "प्रतिपदा " (trailing space)
  const clean = nepaliTithi.trim().split(' ')[0]; 
  return TITHI_MAP[clean] || nepaliTithi; 
}

export function getBsMonthName(monthIndex: number): string {
  return BS_MONTHS_ROMANIZED[monthIndex - 1] || '';
}

export function getBsDayName(dayIndex: number): string {
  return BS_DAYS_ROMANIZED[dayIndex - 1] || '';
}
