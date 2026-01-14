import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const GoldItem = sequelize.define('GoldItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  item_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'General'
  },
  karat: {
    type: DataTypes.STRING,
    allowNull: false
  },
  weight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  buy_price_per_gram: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  image_data: {
    type: DataTypes.BLOB('long'),
    allowNull: true
  },
  image_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  barcode: {
    type: DataTypes.STRING,
    unique: true
  },
  // --- فیلد جدید: وضعیت کالا ---
  status: {
    type: DataTypes.ENUM('In Stock', 'Sold', 'Reserved'),
    defaultValue: 'In Stock'
  },
  store_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  added_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'gold_inventory',
  underscored: true,
  timestamps: true
});

export default GoldItem;