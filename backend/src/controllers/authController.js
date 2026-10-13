const User = require('../models/User');
const { AppError, asyncHandler, signToken } = require('../utils');

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const isString = (v) => typeof v === 'string';

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) throw new AppError('Name, email and password are required', 400);
  if (!isString(name) || !isString(email) || !isString(password)) {
    throw new AppError('Name, email and password must be text', 400);
  }
  if (!EMAIL_REGEX.test(email)) throw new AppError('Please provide a valid email', 400);
  if (password.length < 6) throw new AppError('Password must be at least 6 characters', 400);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError('Email is already registered', 409);

  const user = await User.create({ name, email, password });
  const token = signToken(user._id);

  res.status(201).json({ success: true, message: 'Registered successfully', data: { user, token } });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);
  if (!isString(email) || !isString(password)) throw new AppError('Email and password must be text', 400);

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user._id);
  res.status(200).json({ success: true, message: 'Logged in successfully', data: { user, token } });
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
});
