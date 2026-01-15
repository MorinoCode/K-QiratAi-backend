//domains/sales/payment.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const InvoicePayment = sequelize.define('InvoicePayment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  method: {
    type: DataTypes.ENUM('Cash', 'K-Net', 'Visa/Master', 'Link', 'Cheque'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  reference_number: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'invoice_payments',
  underscored: true,
  timestamps: true
});

export default InvoicePayment;