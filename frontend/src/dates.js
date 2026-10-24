// Dates are passed around as "YYYY-MM-DD" strings, the same format the API stores.
// Date math is done in UTC so it never shifts by a day because of the browser's timezone.

export const isDateStr = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
export const isMonthStr = (v) => /^\d{4}-\d{2}$/.test(v || '');

// Today in the browser's own timezone
export const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const toUTC = (dateStr) => new Date(`${dateStr}T00:00:00Z`);

export const addDays = (dateStr, n) => {
  const d = toUTC(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const addMonths = (month, n) => {
  const d = toUTC(`${month}-01`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};

// "Fri, 24 Oct 2026"
export const formatDay = (dateStr) =>
  toUTC(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

// "24 Oct"
export const formatShort = (dateStr) =>
  toUTC(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// "October 2026"
export const formatMonth = (month) =>
  toUTC(`${month}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// 0 = Monday ... 6 = Sunday
export const weekdayMon = (dateStr) => (toUTC(dateStr).getUTCDay() + 6) % 7;
