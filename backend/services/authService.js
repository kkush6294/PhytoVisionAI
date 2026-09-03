const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured.');
  }
  return secret;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '7d';
}

/**
 * Format user object for public/client consumption (never exposes passwordHash)
 */
function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user._id ? user._id.toString() : user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    avatarUrl: user.avatarUrl || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isGuest: false,
  };
}

/**
 * Generate JWT token for a registered user.
 */
function generateToken(user) {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role || 'user',
    isGuest: false,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
}

/**
 * Register a new user.
 */
async function registerUser(name, email, password) {
  if (!name || !email || !password) {
    return { success: false, status: 400, message: 'Name, email, and password are required.' };
  }
  if (typeof password !== 'string' || password.length < 6) {
    return { success: false, status: 400, message: 'Password must be at least 6 characters long.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    return { success: false, status: 409, message: 'A user with this email address already exists.' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
    role: 'user',
  });

  try {
    await user.save();
  } catch (err) {
    if (err.code === 11000) {
      return { success: false, status: 409, message: 'A user with this email address already exists.' };
    }
    throw err;
  }

  const token = generateToken(user);
  return {
    success: true,
    token,
    user: sanitizeUser(user),
  };
}

/**
 * Authenticate a user and return JWT.
 */
async function loginUser(email, password) {
  if (!email || !password) {
    return { success: false, status: 400, message: 'Email and password are required.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    return { success: false, status: 401, message: 'Invalid email or password.' };
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return { success: false, status: 401, message: 'Invalid email or password.' };
  }

  const token = generateToken(user);
  return {
    success: true,
    token,
    user: sanitizeUser(user),
  };
}

/**
 * Retrieve user by ID from MongoDB (excluding passwordHash).
 */
async function getUserById(userId) {
  if (!userId) return null;
  const user = await User.findById(userId).select('-passwordHash');
  return sanitizeUser(user);
}

/**
 * Update user profile.
 */
async function updateProfile(userId, updates) {
  if (!userId) {
    return { success: false, status: 400, message: 'User ID is required.' };
  }

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, status: 404, message: 'User not found.' };
  }

  if (updates.name && typeof updates.name === 'string') {
    user.name = updates.name.trim();
  }

  if (updates.email && typeof updates.email === 'string') {
    const newEmail = updates.email.trim().toLowerCase();
    if (newEmail !== user.email) {
      const emailInUse = await User.findOne({ email: newEmail, _id: { $ne: userId } });
      if (emailInUse) {
        return { success: false, status: 409, message: 'Email is already in use by another account.' };
      }
      user.email = newEmail;
    }
  }

  if (updates.avatarUrl !== undefined) {
    user.avatarUrl = updates.avatarUrl;
  }

  if (updates.password) {
    if (typeof updates.password !== 'string' || updates.password.length < 6) {
      return { success: false, status: 400, message: 'New password must be at least 6 characters long.' };
    }
    user.passwordHash = await bcrypt.hash(updates.password, 10);
  }

  await user.save();

  return {
    success: true,
    user: sanitizeUser(user),
  };
}

/**
 * Create guest session (stateless token, no DB records).
 */
function createGuestSession() {
  const payload = {
    sub: null,
    email: null,
    name: 'Guest User',
    role: 'guest',
    isGuest: true,
  };
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
  return {
    token,
    user: {
      id: null,
      name: 'Guest User',
      email: null,
      role: 'guest',
      isGuest: true,
    },
  };
}

/**
 * Logout placeholder — JWT is stateless on server, client removes token.
 */
function logoutUser() {
  return { success: true, message: 'Logged out successfully.' };
}

/**
 * Verify JWT token.
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return { valid: true, user: decoded };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  updateProfile,
  createGuestSession,
  logoutUser,
  verifyToken,
  sanitizeUser,
};
