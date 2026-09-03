const { verifyToken } = require('../services/authService');

/**
 * Express middleware to authenticate Bearer JWT tokens.
 * Health check endpoints remain public.
 */
function authenticateJwt(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token required. Please log in or use Guest Access.'
    });
  }

  const token = authHeader.split(' ')[1];
  const authResult = verifyToken(token);

  if (!authResult.valid) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token. Please log in again.',
      details: authResult.error
    });
  }

  req.user = {
    ...authResult.user,
    id: authResult.user.sub || null,
  };
  next();
}

/**
 * Optional authentication middleware: attaches req.user if token present, but does not block request.
 */
function optionalJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const authResult = verifyToken(token);
    if (authResult.valid) {
      req.user = {
        ...authResult.user,
        id: authResult.user.sub || null,
      };
    }
  }
  next();
}

module.exports = {
  authenticateJwt,
  optionalJwt
};
