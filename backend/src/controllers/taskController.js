const mongoose = require('mongoose');
const Task = require('../models/Task');
const { STATUSES } = require('../models/Task');
const { AppError, asyncHandler } = require('../utils');

const checkId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid task ID', 400);
};

const isString = (v) => typeof v === 'string';

// Description and status are optional, but must be text when sent
const checkOptionalFields = ({ description, status }) => {
  if (description !== undefined && description !== null && !isString(description)) {
    throw new AppError('Description must be text', 400);
  }
  if (status !== undefined && !STATUSES.includes(status)) throw new AppError('Invalid status', 400);
};

// Always search by BOTH task id and owner, so users can never touch others' tasks
const findOwnedTask = async (id, userId) => {
  checkId(id);
  const task = await Task.findOne({ _id: id, user: userId });
  if (!task) throw new AppError('Task not found', 404);
  return task;
};

// POST /api/tasks
exports.createTask = asyncHandler(async (req, res) => {
  const { title, description, status } = req.body;
  if (!isString(title) || !title.trim()) throw new AppError('Title is required', 400);
  checkOptionalFields({ description, status });

  const task = await Task.create({ title, description, status, user: req.user._id });
  res.status(201).json({ success: true, message: 'Task created', data: { task } });
});

// GET /api/tasks?status=Pending
exports.getTasks = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.status) {
    if (!STATUSES.includes(req.query.status)) throw new AppError('Invalid status filter', 400);
    filter.status = req.query.status;
  }

  const tasks = await Task.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: tasks.length, data: { tasks } });
});

// GET /api/tasks/:id
exports.getTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req.params.id, req.user._id);
  res.status(200).json({ success: true, data: { task } });
});

// PUT /api/tasks/:id
exports.updateTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req.params.id, req.user._id);
  const { title, description, status } = req.body;

  if (title !== undefined) {
    if (!isString(title) || !title.trim()) throw new AppError('Title cannot be empty', 400);
    task.title = title;
  }
  checkOptionalFields({ description, status });
  if (description !== undefined) task.description = description ?? '';
  if (status !== undefined) task.status = status;

  await task.save();
  res.status(200).json({ success: true, message: 'Task updated', data: { task } });
});

// DELETE /api/tasks/:id
exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req.params.id, req.user._id);
  await task.deleteOne();
  res.status(200).json({ success: true, message: 'Task deleted' });
});
