const mongoose = require('mongoose');

const STATUSES = ['Pending', 'In Progress', 'Completed'];

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: { values: STATUSES, message: 'Status must be Pending, In Progress or Completed' }, default: 'Pending' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // The day this task is planned for, as "YYYY-MM-DD"
    date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'] },
    completedAt: { type: Date, default: null },
    // Set when the task was created automatically from a daily habit
    habit: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', default: null },
    // Habit tasks are hidden instead of deleted, so they are not re-created for that day
    skipped: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, date: 1 });
// A habit can only create one task per day
taskSchema.index({ user: 1, habit: 1, date: 1 }, { unique: true, partialFilterExpression: { habit: { $type: 'objectId' } } });

module.exports = mongoose.model('Task', taskSchema);
module.exports.STATUSES = STATUSES;
