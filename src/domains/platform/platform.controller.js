//domains/platform/platform.controller.js
import Tenant from './tenant.model.js';
import { createTenantSchema } from '../../utils/schema.manager.js';

export const registerStore = async (req, res) => {
  try {
    const { store_name, owner_name, phone, username, password } = req.body;

    const slug = store_name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const db_schema = `tenant_${slug.replace(/-/g, '_')}`;

    const existingTenant = await Tenant.findOne({ where: { slug } });
    if (existingTenant) {
      return res.status(400).json({ message: 'Store name is already taken.' });
    }

    const newTenant = await Tenant.create({
      name: store_name,
      slug,
      db_schema,
      owner_name,
      phone,
      subscription_status: 'active'
    });

    await createTenantSchema(newTenant, {
      full_name: owner_name,
      username,
      password
    });

    res.status(201).json({
      success: true,
      message: 'Store registered successfully.',
      tenant_id: slug, 
      schema: db_schema
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: error.message });
  }
};