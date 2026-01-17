import express from 'express';
import http from 'http'; // Import http module
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './config/database.js';

import { resolveTenant } from './middlewares/tenant.middleware.js';
import { protect } from './middlewares/auth.middleware.js';
import { initSocket } from './config/socket.js'; // Import Socket Init
import { startGoldScheduler, getLastPrice } from './utils/gold.service.js'; // Import Gold Service

import platformRoutes from './domains/platform/platform.routes.js';
import authRoutes from './domains/auth/auth.routes.js';
import whatsappRoutes from './domains/platform/whatsapp.routes.js';
import inventoryRoutes from './domains/inventory/inventory.routes.js';
import customerRoutes from './domains/customers/customer.routes.js';
import salesRoutes from './domains/sales/sales.routes.js';
import oldGoldRoutes from './domains/old-gold/old-gold.routes.js';
import managementRoutes from './domains/management/management.routes.js';
import dashboardRoutes from './domains/dashboard/dashboard.routes.js';

import Tenant from './domains/platform/tenant.model.js';
import WhatsappConfig from './domains/platform/whatsapp.config.model.js';
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
const httpServer = http.createServer(app); // Wrap express app in HTTP server

// Initialize Socket.io
initSocket(httpServer);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Associations
User.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Branch.hasMany(User, { foreignKey: 'branch_id' });

Invoice.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Customer.hasMany(Invoice, { foreignKey: 'customer_id' });

Invoice.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Invoice, { foreignKey: 'created_by' });

Invoice.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Branch.hasMany(Invoice, { foreignKey: 'branch_id' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id' });

Invoice.hasMany(InvoicePayment, { foreignKey: 'invoice_id', as: 'payments' });
InvoicePayment.belongsTo(Invoice, { foreignKey: 'invoice_id' });

OldGold.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
OldGold.belongsTo(User, { foreignKey: 'created_by', as: 'buyer' });
OldGold.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

InventoryItem.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Branch.hasMany(InventoryItem, { foreignKey: 'branch_id' });

// Routes
app.use('/api/platform', platformRoutes);
app.use('/api/auth', resolveTenant, authRoutes);
app.use('/api/whatsapp', whatsappRoutes);

app.use('/api/inventory', resolveTenant, protect, inventoryRoutes);
app.use('/api/customers', resolveTenant, protect, customerRoutes);
app.use('/api/sales', resolveTenant, protect, salesRoutes);
app.use('/api/old-gold', resolveTenant, protect, oldGoldRoutes);
app.use('/api/manage', resolveTenant, protect, managementRoutes);
app.use('/api/dashboard', resolveTenant, protect, dashboardRoutes);

// Public route to get initial price (Rest API fallback)
app.get('/api/prices/live', (req, res) => {
    res.json(getLastPrice());
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connection Established.');

    await sequelize.query("SET search_path TO public");
    await Tenant.sync({ alter: true });
    await WhatsappConfig.sync({ alter: true });
    console.log('✅ Platform Tables Synced (Public Schema).');

    // Start Gold Price Scheduler
    startGoldScheduler();

    const PORT = process.env.PORT || 5000;
    // Important: Listen on httpServer, not app
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Database Connection Error:', error);
    process.exit(1);
  }
};

startServer();