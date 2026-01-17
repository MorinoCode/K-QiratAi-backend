import Tenant from '../domains/platform/tenant.model.js';
import sequelize from '../config/database.js';

export const resolveTenant = async (req, res, next) => {
  // 1. Get Tenant Slug from Header
  const tenantSlug = req.headers['x-tenant-id'];

  if (!tenantSlug) {
    return res.status(400).json({ message: 'Tenant ID header (x-tenant-id) is missing.' });
  }

  try {
    // 2. Find Tenant in Public Schema
    // We explicitly set search_path to public to ensure we find the tenant record
    // This is crucial because the connection might be lingering on another schema from a previous request in the pool
    await sequelize.query("SET search_path TO public");
    
    const tenant = await Tenant.findOne({ 
      where: { slug: tenantSlug, subscription_status: 'active' } 
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Store not found or inactive.' });
    }

    // 3. Switch to Tenant Schema Securely
    // We verify the schema name matches a safe regex pattern to prevent SQL Injection
    const schemaName = tenant.db_schema;
    if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
        throw new Error('Invalid schema name detected.');
    }

    await sequelize.query(`SET search_path TO "${schemaName}", public`);

    // 4. Attach tenant info to request
    req.tenant = tenant;
    next();

  } catch (error) {
    console.error('Tenant Resolution Error:', error);
    // Reset path to public just in case
    await sequelize.query("SET search_path TO public");
    res.status(500).json({ message: 'Internal Server Error during tenant resolution.' });
  }
};