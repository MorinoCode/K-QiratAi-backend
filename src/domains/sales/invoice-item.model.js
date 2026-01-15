import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  inventory_item_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  item_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  item_name_ar: { // ✅ ذخیره نام عربی در فاکتور
    type: DataTypes.STRING,
    allowNull: true
  },
  karat: {
    type: DataTypes.STRING,
    allowNull: false
  },
  weight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  sell_price_per_gram: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  labor_cost: {
    type: DataTypes.DECIMAL(15, 3),
    defaultValue: 0
  },
  total_price: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  }
}, {
  tableName: 'invoice_items',
  underscored: true,
  timestamps: false
});

export default InvoiceItem;