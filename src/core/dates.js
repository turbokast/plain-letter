// Dates as UK letters write them. Worked out on the device, no model involved.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** @returns {Date|null} midnight UTC of the date, or null if it is not a real date */
export function parseUkDate(s) {
  const str = String(s || '').trim();
  let d, m, y;
  let r = str.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{2,4})/);
  if (r) {
    d = +r[1];
    m = MONTHS.indexOf(r[2].slice(0, 3).toLowerCase()) + 1;
    y = +r[3];
  } else if ((r = str.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))) {
    d = +r[1];
    m = +r[2];
    y = +r[3];
  } else if ((r = str.match(/(\d{4})-(\d{2})-(\d{2})/))) {
    y = +r[1];
    m = +r[2];
    d = +r[3];
  } else return null;
  if (y < 100) y += 2000;
  if (!m || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCDate() === d && date.getUTCMonth() === m - 1 ? date : null;
}

/** Whole days from `today` to the date (negative when it has passed). */
export function daysUntil(dateText, today = new Date()) {
  const date = parseUkDate(dateText);
  if (!date) return null;
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((date.getTime() - t) / 86400000);
}

export function deadlineLabel(dateText, today = new Date()) {
  const n = daysUntil(dateText, today);
  if (n === null) return null;
  if (n < 0) return `${-n} day${n === -1 ? '' : 's'} ago`;
  if (n === 0) return 'today';
  return `${n} day${n === 1 ? '' : 's'} left`;
}
