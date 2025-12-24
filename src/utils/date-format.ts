/**
 * Format date/time for display in Thai locale.
 * 
 * IMPORTANT: MySQL stores timestamps in Bangkok timezone (server timezone).
 * The Date object from Drizzle represents this time but JavaScript may
 * misinterpret it based on the runtime timezone. We extract the components
 * directly to avoid timezone conversion issues.
 */

const thaiMonthsShort = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const thaiMonthsLong = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export function formatThaiDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  
  // Date objects from Drizzle contain the raw MySQL timestamp value
  // interpreted as UTC. Since MySQL stores Bangkok time, we need to
  // display in UTC (no conversion) to show the actual stored value.
  let dateStr: string;
  if (date instanceof Date) {
    // Format in UTC to get the raw value stored in DB
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC' // Use UTC = raw DB value = Bangkok time
    });
    dateStr = formatter.format(date);
  } else {
    dateStr = String(date);
  }
  
  // Match datetime format: YYYY-MM-DD HH:MM or similar
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})\D+(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    const thaiYear = parseInt(year) + 543;
    const monthIndex = parseInt(month) - 1;
    return `${parseInt(day)} ${thaiMonthsShort[monthIndex]} ${thaiYear} ${hour}:${minute}`;
  }
  
  return "-";
}

export function formatThaiDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  
  let dateStr: string;
  if (date instanceof Date) {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC'
    });
    dateStr = formatter.format(date);
  } else {
    dateStr = String(date);
  }
  
  // Match date format: YYYY-MM-DD
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const thaiYear = parseInt(year) + 543;
    const monthIndex = parseInt(month) - 1;
    return `${parseInt(day)} ${thaiMonthsLong[monthIndex]} ${thaiYear}`;
  }
  
  return "-";
}
