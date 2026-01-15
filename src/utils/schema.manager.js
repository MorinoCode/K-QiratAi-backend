//utils/schema.manager.js
import sequelize from '../config/database.js';
import bcrypt from 'bcrypt';
import User from '../domains/auth/user.model.js';
import Role from '../domains/auth/role.model.js';
import Branch from '../domains/store/branch.model.js';
import InventoryItem from '../domains/inventory/item.model.js';
import Customer from '../domains/customers/customer.model.js';
import Invoice from '../domains/sales/invoice.model.js';
import InvoiceItem from '../domains/sales/invoice-item.model.js';
import InvoicePayment from '../domains/sales/payment.model.js';
import OldGold from '../domains/old-gold/old-gold.model.js';

export const createTenantSchema = async (tenantData, adminUserData) => {
  const schemaName = tenantData.db_schema;
  const t = await sequelize.transaction();

  try {
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`, { transaction: t });
    await sequelize.query(`SET search_path TO "${schemaName}"`, { transaction: t });

    await Role.sync({ force: true, transaction: t });
    await Branch.sync({ force: true, transaction: t });
    await User.sync({ force: true, transaction: t });
    await InventoryItem.sync({ force: true, transaction: t });
    await Customer.sync({ force: true, transaction: t });
    await Invoice.sync({ force: true, transaction: t });
    await InvoiceItem.sync({ force: true, transaction: t });
    await InvoicePayment.sync({ force: true, transaction: t });
    await OldGold.sync({ force: true, transaction: t });

    const ownerRole = await Role.create({
      name: 'Store Owner',
      permissions: ['ALL_ACCESS'],
      description: 'Full access to all system features'
    }, { transaction: t });

    await Role.create({
      name: 'Branch Manager',
      permissions: ['VIEW_DASHBOARD', 'MANAGE_INVENTORY', 'MANAGE_STAFF', 'CREATE_SALE'],
      description: 'Manages a specific branch'
    }, { transaction: t });

    await Role.create({
      name: 'Sales Man',
      permissions: ['CREATE_SALE', 'VIEW_INVENTORY', 'REGISTER_CUSTOMER'],
      description: 'Standard sales access'
    }, { transaction: t });

    const mainBranch = await Branch.create({
      name: 'Main Branch',
      location: 'Main Location',
      phone: tenantData.phone,
      is_main: true
    }, { transaction: t });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminUserData.password, salt);

    await User.create({
      full_name: adminUserData.full_name,
      username: adminUserData.username,
      password: hashedPassword,
      role: 'store_owner',
      branch_id: mainBranch.id,
      is_active: true
    }, { transaction: t });

    await t.commit();
    return true;

  } catch (error) {
    await t.rollback();
    console.error('Schema Creation Error:', error);
    throw error;
  } finally {
    await sequelize.query(`SET search_path TO public`);
  }
};