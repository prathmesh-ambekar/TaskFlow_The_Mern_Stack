const mongoose = require('mongoose');

// A habit is a task template that is added to every day automatically
const habitSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // First day the habit creates tasks for ("YYYY-MM-DD")
    startDate: { type: String, required: true },
    // Paused habits stop creating new daily tasks
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Habit', habitSchema);
