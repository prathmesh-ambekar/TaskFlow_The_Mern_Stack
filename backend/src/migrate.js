const Task = require('./models/Task');
const { TIMEZONE } = require('./utils');

// One-time upgrade for tasks created before daily planning existed:
// give each one the day it was created on, and a completedAt if it is done.
// Safe to run on every start: it only touches tasks that are missing these fields.
// timestamps: false keeps updatedAt as it was, so completedAt can be copied from it.
const migrate = async () => {
  await Task.updateMany(
    { status: 'Completed', completedAt: { $exists: false } },
    [{ $set: { completedAt: '$updatedAt' } }],
    { timestamps: false }
  );
  const dated = await Task.updateMany(
    { date: { $exists: false } },
    [{ $set: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIMEZONE } } } }],
    { timestamps: false }
  );
  if (dated.modifiedCount) console.log(`Added a date to ${dated.modifiedCount} older task(s)`);
};

module.exports = migrate;
