import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  invoice_number: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customer_civil_id: {
    type: DataTypes.STRING(12),
    allowNull: true
  },
  customer_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  total_weight: {
    type: DataTypes.DECIMAL(10, 3),
    defaultValue: 0,
    allowNull: false
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  tax_amount: {
    type: DataTypes.DECIMAL(15, 3),
    defaultValue: 0
  },
  discount: {
    type: DataTypes.DECIMAL(15, 3),
    defaultValue: 0
  },
  payment_method: {
    type: DataTypes.ENUM('Cash', 'K-Net', 'Visa/Master', 'Link', 'Installment'),
    defaultValue: 'Cash'
  },
  user_id: {
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