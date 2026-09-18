/**
 * Zero-Dependency In-Memory Rate Limiter Middleware (PhytoVisionAI)
 *
 * Implements sliding/fixed window rate limiting without introducing
 * heavy external packages.
 */

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 60, message = 'Too many requests, please try again later.' }) {
  const requests = new Map();

  // Periodic cleanup of stale IP records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of requests.entries()) {
      if (now - entry.startTime > windowMs) {
        requests.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref(); // unref so it does not keep event loop open in tests

  return function rateLimiter(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    let record = requests.get(ip);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      requests.set(ip, record);
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.startTime + windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: typeof message === 'string' ? message : (message.message || 'Rate limit exceeded. Please try again later.')
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter
};
