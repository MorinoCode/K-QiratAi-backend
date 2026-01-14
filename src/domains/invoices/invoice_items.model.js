import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  gold_item_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  weight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  karat: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price_per_gram: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  labor_cost: {
    type: DataTypes.DECIMAL(15, 3),
    defaultValue: 0
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  }
}, {
  tableName: 'invoice_items',
  underscored: true,
  timestamps: false
});

export default InvoiceItem;