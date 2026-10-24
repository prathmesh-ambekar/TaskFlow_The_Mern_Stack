const jwt = require('jsonwebtoken');

// Custom error that carries an HTTP status code
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Wrap async controllers so errors go to the central error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ---- Dates ----
// A task's day is stored as a plain "YYYY-MM-DD" string, so there are no timezone surprises.
// "Today" is worked out in TIMEZONE (e.g. Asia/Kolkata) so the day changes at your local midnight.
const TIMEZONE = process.env.TIMEZONE || 'UTC';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;

// Also rejects impossible dates like 2026-02-30 or 2026-13-01
const isDateStr = (v) => {
  if (typeof v !== 'string' || !DATE_REGEX.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
};
const isMonthStr = (v) => typeof v === 'string' && MONTH_REGEX.test(v) && isDateStr(`${v}-01`);

// en-CA formats dates as YYYY-MM-DD
const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());

const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Every date from start to end (inclusive)
const dateRange = (start, end) => {
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
};

const monthBounds = (month) => {
  const start = `${month}-01`;
  const end = addDays(addDays(start, 31).slice(0, 7) + '-01', -1); // last day of the month
  return { start, end };
};

module.exports = {
  AppError, asyncHandler, signToken,
  TIMEZONE, isDateStr, isMonthStr, todayStr, addDays, dateRange, monthBounds,
};
