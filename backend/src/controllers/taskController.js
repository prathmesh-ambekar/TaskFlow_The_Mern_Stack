const mongoose = require('mongoose');
const Task = require('../models/Task');
const { STATUSES } = require('../models/Task');
const { AppError, asyncHandler, isDateStr, todayStr } = require('../utils');
const { ensureHabitTasks } = require('../habitTasks');

const checkId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid task ID', 400);
};

const isString = (v) => typeof v === 'string';

// Description, status and date are optional, but must be valid when sent
const checkOptionalFields = ({ description, status, date }) => {
  if (description !== undefined && description !== null && !isString(description)) {
    throw new AppError('Description must be text', 400);
  }
  if (status !== undefined && !STATUSES.includes(status)) throw new AppError('Invalid status', 400);
  if (date !== undefined && !isDateStr(date)) throw new AppError('Date must be YYYY-MM-DD', 400);
};

// Always search by BOTH task id and owner, so users can never touch others' tasks
const findOwnedTask = async (id, userId) => {
  checkId(id);
  const task = await Task.findOne({ _id: id, user: userId, skipped: { $ne: true } });
  if (!task) throw new AppError('Task not found', 404);
  return task;
};

// Keep completedAt in sync with the status
const setStatus = (task, status) => {
  if (status === task.status) return;
  task.status = status;
  task.completedAt = status === 'Completed' ? new Date() : null;
};

// POST /api/tasks
exports.createTask = asyncHandler(async (req, res) => {
  const { title, description, status, date } = req.body;
  if (!isString(title) || !title.trim()) throw new AppError('Title is required', 400);
  checkOptionalFields({ description, status, date });

  const task = await Task.create({
    title,
    description,
    status,
    date: date || todayStr(),
    completedAt: status === 'Completed' ? new Date() : null,
    user: req.user._id,
  });
  res.status(201).json({ success: true, message: 'Task created', data: { task } });
});

// GET /api/tasks?date=2026-10-24&status=Pending
exports.getTasks = asyncHandler(async (req, res) => {
  const { date, status } = req.query;
  const filter = { user: req.user._id, skipped: { $ne: true } };

  if (status) {
    if (!STATUSES.includes(status)) throw new AppError('Invalid status filter', 400);
    filter.status = status;
  }
  if (date) {
    if (!isDateStr(date)) throw new AppError('Date must be YYYY-MM-DD', 400);
    await ensureHabitTasks(req.user._id, [date]);
    filter.date = date;
  }

  // One day: in the order they were added. All tasks: newest day first.
  const sort = date ? { createdAt: 1 } : { date: -1, createdAt: -1 };
  const tasks = await Task.find(filter).sort(sort);
  res.status(200).json({ success: true, count: tasks.length, today: todayStr(), data: { tasks } });
});

// GET /api/tasks/:id
exports.getTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req.params.id, req.user._id);
  res.status(200).json({ success: true, data: { task } });
});

// PUT /api/tasks/:id
exports.updateTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req.params.id, req.user._id);
  const { title, description, status, date } = req.body;

  if (title !== undefined) {
    if (!isString(title) || !title.trim()) throw new AppError('Title cannot be empty', 400);
    task.title = title;
  }
  checkOptionalFields({ description, status, date });
  if (date !== undefined && date !== task.date) {
    if (task.habit) throw new AppError('Daily habit tasks cannot be moved to another day', 400);
    task.date = date;
  }
  if (description !== undefined) task.description = description ?? '';
  if (status !== undefined) setStatus(task, status);

  await task.save();
  res.status(200).json({ success: true, message: 'Task updated', data: { task } });
});

// DELETE /api/tasks/:id
exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req.params.id, req.user._id);
  if (task.habit) {
    // Hide it for this day only; deleting it would make the habit add it again
    task.skipped = true;
    await task.save();
  } else {
    await task.deleteOne();
  }
  res.status(200).json({ success: true, message: 'Task deleted' });
});
