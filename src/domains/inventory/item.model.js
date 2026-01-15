import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const InventoryItem = sequelize.define('InventoryItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  metal_type: {
    type: DataTypes.ENUM('Gold', 'Silver', 'Platinum', 'Diamond', 'Gemstone'),
    defaultValue: 'Gold',
    allowNull: false
  },
  item_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  item_name_ar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  country_of_origin: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Kuwait'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  description_ar: {
    type: DataTypes.TEXT,
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
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false
  },
  buy_price_per_gram: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  barcode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  images: {
    type: DataTypes.JSONB, 
    defaultValue: [],
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('In Stock', 'Sold', 'Reserved', 'Returned'),
    defaultValue: 'In Stock'
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'inventory_items',
  underscored: true,
  timestamps: true
});

export default InventoryItem;