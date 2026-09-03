const {
  registerUser,
  loginUser,
  getUserById,
  updateProfile,
  logoutUser,
  createGuestSession,
} = require('../services/authService');

// Register a new user
exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const result = await registerUser(name, email, password);
    if (!result.success) {
      return res.status(result.status || 400).json({ error: 'Registration Failed', message: result.message });
    }
    return res.status(201).json({ token: result.token, user: result.user });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

// Login existing user
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await loginUser(email, password);
    if (!result.success) {
      return res.status(result.status || 401).json({ error: 'Login Failed', message: result.message });
    }
    return res.status(200).json({ token: result.token, user: result.user });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

// Guest session
exports.guest = (req, res) => {
  const result = createGuestSession();
  return res.status(200).json(result);
};

// Get current user profile (protected)
exports.me = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No active authentication session.' });
  }

  if (req.user.isGuest) {
    return res.status(200).json({
      authenticated: true,
      user: {
        id: null,
        name: 'Guest User',
        email: null,
        role: 'guest',
        isGuest: true,
      },
    });
  }

  try {
    const userId = req.user.sub || req.user.id;
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    }
    return res.status(200).json({ authenticated: true, user });
  } catch (err) {
    console.error('Me endpoint error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

// Update user profile (protected)
exports.update = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No active authentication session.' });
  }

  if (req.user.isGuest) {
    return res.status(403).json({ error: 'Forbidden', message: 'Guest accounts cannot modify profile data.' });
  }

  const userId = req.user.sub || req.user.id;
  const updates = req.body;
  try {
    const result = await updateProfile(userId, updates);
    if (!result.success) {
      return res.status(result.status || 400).json({ error: 'Update Failed', message: result.message });
    }
    return res.status(200).json({ user: result.user });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

// Logout (protected – stateless)
exports.logout = (req, res) => {
  const result = logoutUser();
  return res.status(200).json(result);
};

