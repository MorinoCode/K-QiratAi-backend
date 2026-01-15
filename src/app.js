import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './config/database.js';
import Tenant from './domains/platform/tenant.model.js';

import platformRoutes from './domains/platform/platform.routes.js';
import authRoutes from './domains/auth/auth.routes.js';
import inventoryRoutes from './domains/inventory/inventory.routes.js';
import customerRoutes from './domains/customers/customer.routes.js';
import salesRoutes from './domains/sales/sales.routes.js';
import oldGoldRoutes from './domains/old-gold/old-gold.routes.js';
import managementRoutes from './domains/management/management.routes.js';
import dashboardRoutes from './domains/dashboard/dashboard.routes.js';

import Customer from './domains/customers/customer.model.js';
import User from './domains/auth/user.model.js';
import Branch from './domains/store/branch.model.js';
import Invoice from './domains/sales/invoice.model.js';
import InvoiceItem from './domains/sales/invoice-item.model.js';
import InvoicePayment from './domains/sales/payment.model.js';
import OldGold from './domains/old-gold/old-gold.model.js';
import InventoryItem from './domains/inventory/item.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

app.use(express.json());
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

User.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Branch.hasMany(User, { foreignKey: 'branch_id' });

Invoice.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Customer.hasMany(Invoice, { foreignKey: 'customer_id' });

Invoice.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Invoice, { foreignKey: 'created_by' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id' });

Invoice.hasMany(InvoicePayment, { foreignKey: 'invoice_id', as: 'payments' });
InvoicePayment.belongsTo(Invoice, { foreignKey: 'invoice_id' });

OldGold.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
OldGold.belongsTo(User, { foreignKey: 'created_by', as: 'buyer' });

app.use('/api/platform', platformRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/old-gold', oldGoldRoutes);
app.use('/api/manage', managementRoutes);
app.use('/api/dashboard', dashboardRoutes);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connection Established.');

    await Tenant.sync({ alter: true });
    console.log('✅ Platform Tables Synced.');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Database Connection Error:', error);
  }
};

startServer();