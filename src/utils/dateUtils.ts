export function normalizeDateISO(dateStr: string): string {
  if (!dateStr) return '';
  
  // If it's already in YYYY-MM-DD format, return it directly to avoid timezone shifts
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // If it's an ISO string with time (e.g. 2023-10-27T...), take the date part
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }

  // Fallback for other formats (e.g. "10/27/2023") - use local time parsing
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function areDatesEqual(d1: string, d2: string): boolean {
  return normalizeDateISO(d1) === normalizeDateISO(d2);
}
