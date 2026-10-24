const Task = require('../models/Task');
const Habit = require('../models/Habit');
const { AppError, asyncHandler, isMonthStr, todayStr, addDays, dateRange, monthBounds } = require('../utils');
const { ensureHabitTasks } = require('../habitTasks');

const percent = (done, total) => (total ? Math.round((done / total) * 100) : null);

// Count tasks per day: { "2026-10-24": { total, completed, inProgress } }
const countByDay = (tasks) => {
  const byDay = {};
  for (const t of tasks) {
    const d = (byDay[t.date] ||= { total: 0, completed: 0, inProgress: 0 });
    d.total += 1;
    if (t.status === 'Completed') d.completed += 1;
    if (t.status === 'In Progress') d.inProgress += 1;
  }
  return byDay;
};

const isPerfect = (d) => d && d.total > 0 && d.completed === d.total;

// Days in a row where every task was completed, ending today
// (or yesterday, if today isn't finished yet - the day isn't over)
const currentStreak = (byDay, today) => {
  let day = isPerfect(byDay[today]) ? today : addDays(today, -1);
  let streak = 0;
  while (isPerfect(byDay[day])) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
};

// GET /api/stats/monthly?month=2026-10
exports.getMonthly = asyncHandler(async (req, res) => {
  const today = todayStr();
  const month = req.query.month || today.slice(0, 7);
  if (!isMonthStr(month)) throw new AppError('Month must be YYYY-MM', 400);

  const { start, end } = monthBounds(month);
  const user = req.user._id;

  // Fill in habit tasks for past days of this month and for the streak window
  // (only from the earliest habit's start date, so this stays small)
  const firstHabit = await Habit.findOne({ user, active: true }).sort({ startDate: 1 });
  if (firstHabit) {
    const windowStart = start < addDays(today, -365) ? start : addDays(today, -365);
    const from = firstHabit.startDate > windowStart ? firstHabit.startDate : windowStart;
    if (from <= today) await ensureHabitTasks(user, dateRange(from, today));
  }

  const notSkipped = { user, skipped: { $ne: true } };
  const [monthTasks, recentTasks] = await Promise.all([
    Task.find({ ...notSkipped, date: { $gte: start, $lte: end } }).select('title status date habit').lean(),
    Task.find({ ...notSkipped, date: { $gte: addDays(today, -365), $lte: today } }).select('status date').lean(),
  ]);

  // ---- Per day ----
  const byDay = countByDay(monthTasks);
  const days = dateRange(start, end).map((date) => {
    const d = byDay[date] || { total: 0, completed: 0, inProgress: 0 };
    const isPast = date < today;
    const notDone = d.total - d.completed;
    return {
      date,
      total: d.total,
      completed: d.completed,
      inProgress: isPast ? 0 : d.inProgress,
      pending: isPast ? 0 : notDone - d.inProgress,
      missed: isPast ? notDone : 0, // unfinished tasks on a past day count as missed
      percent: percent(d.completed, d.total),
      future: date > today,
    };
  });

  // ---- Month summary (only days up to today count) ----
  const counted = days.filter((d) => !d.future);
  const sum = (key) => counted.reduce((n, d) => n + d[key], 0);
  const totalTasks = sum('total');
  const completed = sum('completed');
  const withTasks = counted.filter((d) => d.total > 0);
  const best = withTasks.reduce(
    (b, d) => (!b || d.percent > b.percent || (d.percent === b.percent && d.completed > b.completed) ? d : b),
    null
  );

  let longestStreak = 0;
  let run = 0;
  for (const d of counted) {
    run = d.total > 0 && d.completed === d.total ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }

  const summary = {
    totalTasks,
    completed,
    missed: sum('missed'),
    completionRate: percent(completed, totalTasks),
    activeDays: withTasks.length,
    perfectDays: withTasks.filter((d) => d.percent === 100).length,
    bestDay: best && { date: best.date, percent: best.percent, completed: best.completed, total: best.total },
    longestStreak,
    currentStreak: currentStreak(countByDay(recentTasks), today),
  };

  // ---- Per habit and most-missed tasks (days up to today) ----
  const pastTasks = monthTasks.filter((t) => t.date <= today);
  const habitDocs = await Habit.find({ user }).select('title').lean();
  const habitTitles = Object.fromEntries(habitDocs.map((h) => [String(h._id), h.title]));

  const habitMap = {};
  const missedMap = {};
  for (const t of pastTasks) {
    if (t.habit) {
      const id = String(t.habit);
      const h = (habitMap[id] ||= { habitId: id, title: habitTitles[id] || t.title, total: 0, completed: 0 });
      h.total += 1;
      if (t.status === 'Completed') h.completed += 1;
    }
    if (t.date < today && t.status !== 'Completed') {
      missedMap[t.title] = (missedMap[t.title] || 0) + 1;
    }
  }
  const habits = Object.values(habitMap)
    .map((h) => ({ ...h, percent: percent(h.completed, h.total) }))
    .sort((a, b) => b.percent - a.percent);
  const topMissed = Object.entries(missedMap)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.status(200).json({ success: true, data: { month, today, summary, days, habits, topMissed } });
});
