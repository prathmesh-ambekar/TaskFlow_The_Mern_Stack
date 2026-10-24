const mongoose = require('mongoose');
const Habit = require('../models/Habit');
const Task = require('../models/Task');
const { AppError, asyncHandler, todayStr } = require('../utils');

const isString = (v) => typeof v === 'string';

const findOwnedHabit = async (id, userId) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid habit ID', 400);
  const habit = await Habit.findOne({ _id: id, user: userId });
  if (!habit) throw new AppError('Habit not found', 404);
  return habit;
};

// This habit's tasks from today onward that haven't been started yet
const upcomingTasks = (habit) => ({
  user: habit.user, habit: habit._id, date: { $gte: todayStr() }, status: 'Pending',
});

// POST /api/habits
exports.createHabit = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!isString(title) || !title.trim()) throw new AppError('Title is required', 400);
  if (description != null && !isString(description)) throw new AppError('Description must be text', 400);

  const habit = await Habit.create({ title, description, user: req.user._id, startDate: todayStr() });
  res.status(201).json({ success: true, message: 'Habit created', data: { habit } });
});

// GET /api/habits
exports.getHabits = asyncHandler(async (req, res) => {
  const habits = await Habit.find({ user: req.user._id }).sort({ createdAt: 1 });
  res.status(200).json({ success: true, count: habits.length, data: { habits } });
});

// PUT /api/habits/:id  (title, description, active)
exports.updateHabit = asyncHandler(async (req, res) => {
  const habit = await findOwnedHabit(req.params.id, req.user._id);
  const { title, description, active } = req.body;

  if (title !== undefined) {
    if (!isString(title) || !title.trim()) throw new AppError('Title cannot be empty', 400);
    habit.title = title;
  }
  if (description !== undefined) {
    if (description !== null && !isString(description)) throw new AppError('Description must be text', 400);
    habit.description = description ?? '';
  }
  if (active !== undefined) {
    if (typeof active !== 'boolean') throw new AppError('Active must be true or false', 400);
    // Resuming starts again from today, so paused days don't count as missed
    if (active && !habit.active) habit.startDate = todayStr();
    habit.active = active;
  }
  await habit.save();

  if (habit.active) {
    // Rename today's and future tasks that are not started yet; past days keep their history
    await Task.updateMany(upcomingTasks(habit), { title: habit.title, description: habit.description });
  } else {
    // Paused: remove today's and future tasks that haven't been started
    await Task.deleteMany(upcomingTasks(habit));
  }

  res.status(200).json({ success: true, message: 'Habit updated', data: { habit } });
});

// DELETE /api/habits/:id  (past days are kept for analysis)
exports.deleteHabit = asyncHandler(async (req, res) => {
  const habit = await findOwnedHabit(req.params.id, req.user._id);
  await Task.deleteMany(upcomingTasks(habit));
  await habit.deleteOne();
  res.status(200).json({ success: true, message: 'Habit deleted' });
});
