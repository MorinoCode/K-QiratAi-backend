//domains/sales/invoice.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_number: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total_weight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  total_labor_cost: {
    type: DataTypes.DECIMAL(15, 3),
    defaultValue: 0
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Paid', 'Void', 'Refunded'),
    defaultValue: 'Paid'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'invoices',
  underscored: true,
  timestamps: true
});

export default Invoice;