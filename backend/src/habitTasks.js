const Habit = require('./models/Habit');
const Task = require('./models/Task');

// Make sure every active habit has its task on each of the given days.
// Runs whenever a day (or month) is viewed, so tasks appear "automatically" each morning.
// Existing tasks, including ones the user skipped, are left untouched.
const ensureHabitTasks = async (userId, dates) => {
  if (!dates.length) return;
  const habits = await Habit.find({ user: userId, active: true });

  const ops = [];
  for (const habit of habits) {
    for (const date of dates) {
      if (date < habit.startDate) continue;
      ops.push({
        updateOne: {
          filter: { user: userId, habit: habit._id, date },
          update: { $setOnInsert: { title: habit.title, description: habit.description, status: 'Pending' } },
          upsert: true,
        },
      });
    }
  }
  if (!ops.length) return;

  try {
    await Task.bulkWrite(ops, { ordered: false });
  } catch (err) {
    // Two requests at the same moment may both try to insert; the unique index keeps just one
    if (err.code !== 11000 && !err.writeErrors?.every((e) => e.code === 11000)) throw err;
  }
};

module.exports = { ensureHabitTasks };
