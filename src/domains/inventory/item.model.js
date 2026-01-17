import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const InventoryItem = sequelize.define('InventoryItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  rfid_tag: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  barcode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
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
  karat: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['18', '21', '22', '24']]
    }
  },
  weight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  min_stock_level: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
    allowNull: false
  },
  buy_price_per_gram: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  supplier_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'In Stock',
    validate: {
      isIn: [['In Stock', 'Sold', 'Reserved', 'Melted']]
    }
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // ✅ تغیر مهم: استفاده از آرایه برای ذخیره چند عکس
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  description_ar: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  country_of_origin: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metal_type: {
    type: DataTypes.STRING,
    defaultValue: 'Gold'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'inventory_items',
  underscored: true,
  timestamps: true
});

export default InventoryItem;