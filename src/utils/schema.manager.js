import sequelize from '../config/database.js';
import bcrypt from 'bcrypt';
import User from '../domains/auth/user.model.js';
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
    // 1. Create Schema
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`, { transaction: t });
    
    // 2. Sync Tables using .schema() method
    await Branch.schema(schemaName).sync({ force: true, transaction: t });
    await User.schema(schemaName).sync({ force: true, transaction: t });
    
    await InventoryItem.schema(schemaName).sync({ force: true, transaction: t });
    await Customer.schema(schemaName).sync({ force: true, transaction: t });
    await Invoice.schema(schemaName).sync({ force: true, transaction: t });
    await InvoiceItem.schema(schemaName).sync({ force: true, transaction: t });
    await InvoicePayment.schema(schemaName).sync({ force: true, transaction: t });
    await OldGold.schema(schemaName).sync({ force: true, transaction: t });

    // 3. Create Main Branch (Fix: Use store name instead of 'Main Branch')
    const mainBranch = await Branch.schema(schemaName).create({
      name: tenantData.name || 'Main Branch', // Dynamic Name
      location: 'Main Location',
      phone: tenantData.phone,
      is_main: true
    }, { transaction: t });

    // 4. Create Owner User
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminUserData.password, salt);

    await User.schema(schemaName).create({
      full_name: adminUserData.full_name,
      username: adminUserData.username,
      password: hashedPassword,
      role: 'store_owner',
      branch_id: mainBranch.id,
      is_active: true
    }, { transaction: t });

    await t.commit();
    console.log(`✅ Schema & Owner created for: ${tenantData.slug}`);
    return true;

  } catch (error) {
    await t.rollback();
    console.error('Schema Creation Error:', error);
    throw error; 
  }
};