export const restrictTo = (...roles) => {
  return (req, res, next) => {
    const roles = ['store_owner', 'branch_manager', 'sale_man']
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to perform this action.' 
      });
    }
    next();
  };
};