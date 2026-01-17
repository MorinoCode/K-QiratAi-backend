import jwt from 'jsonwebtoken';
import User from '../domains/auth/user.model.js';

export const protect = async (req, res, next) => {
  try {
    // Critical Check: Tenant must be resolved BEFORE auth
    if (!req.tenant) {
        return res.status(500).json({ message: 'System Error: Tenant context not set before authentication.' });
    }

    let token;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // User.findByPk will now run on the correct schema because resolveTenant ran first
   const user = await User.schema(req.tenant.db_schema).findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found or access revoked.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'User account is inactive.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ message: 'Not authorized, token failed.' });
  }
};

export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user.role contains the string role name (e.g., 'store_owner')
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to perform this action.' 
      });
    }
    next();
  };
};