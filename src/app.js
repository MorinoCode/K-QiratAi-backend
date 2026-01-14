import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import sequelize from './config/database.js';

import Customer from './domains/customers/customer.model.js';
import Invoice from './domains/invoices/invoice.model.js';
import InvoiceItem from './domains/invoices/invoice_items.model.js';
import User from './domains/auth/user.model.js';
import Store from './domains/auth/store.model.js';
import GoldItem from './domains/gold/gold.model.js';

import authRoutes from './domains/auth/auth.routes.js';
import goldRoutes from './domains/gold/gold.routes.js';
import invoiceRoutes from './domains/invoices/invoice.routes.js';
import customerRoutes from './domains/customers/customer.routes.js';
import manageRoutes from './domains/manage/manage.routes.js';

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

Customer.hasMany(Invoice, { foreignKey: 'customer_id', as: 'purchases' });
Invoice.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer_details' });

Store.hasMany(User, { foreignKey: 'store_id', as: 'staff' });
User.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id' });

InvoiceItem.belongsTo(GoldItem, { foreignKey: 'gold_item_id', as: 'gold_item' });

app.use('/api/auth', authRoutes);
app.use('/api/gold', goldRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/manage', manageRoutes);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection to PostgreSQL established.');
    
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized.');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Database error:', error);
  }
};

startServer();