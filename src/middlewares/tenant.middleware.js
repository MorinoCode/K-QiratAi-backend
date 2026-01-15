//middlewares/tenant.middleware.js
import Tenant from '../domains/platform/tenant.model.js';
import sequelize from '../config/database.js';

export const resolveTenant = async (req, res, next) => {
  const tenantSlug = req.headers['x-tenant-id'];

  if (!tenantSlug) {
    return res.status(400).json({ message: 'Tenant ID header (x-tenant-id) is missing.' });
  }

  try {
    const tenant = await Tenant.findOne({ 
      where: { slug: tenantSlug, subscription_status: 'active' } 
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Store not found or inactive.' });
    }

    await sequelize.query(`SET search_path TO ${tenant.db_schema}, public`);

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Tenant Resolution Error:', error);
    res.status(500).json({ message: 'Internal Server Error during tenant resolution.' });
  }
};