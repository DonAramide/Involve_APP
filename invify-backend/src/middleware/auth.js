// src/middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Authentication middleware to verify JWT tokens and inject tenant context.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Inject user and tenant context into the request object
    req.user = {
      id: decoded.id,
      tenantId: decoded.tenantId,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware] Invalid Token:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Authorization middleware to check for specific roles
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
