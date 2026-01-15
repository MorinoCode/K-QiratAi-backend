//domains/dashboard/dashboard.controller.js
import axios from 'axios';
import Invoice from '../sales/invoice.model.js';
import InventoryItem from '../inventory/item.model.js';
import OldGold from '../old-gold/old-gold.model.js';

export const getLiveRates = async (req, res) => {
  try {
    const response = await axios.get(`https://api.metalpriceapi.com/v1/latest?api_key=${process.env.GOLD_API_KEY}&base=KWD&currencies=XAU,XAG`);
    
    const xauPrice = response.data.rates.KWDXAU || response.data.rates.XAU; 
    const price24k = (1 / xauPrice) / 31.1035;

    res.json({
      success: true,
      rates: {
        Gold: {
          '24K': price24k,
          '22K': price24k * 0.9167,
          '21K': price24k * 0.875,
          '18K': price24k * 0.75
        },
        Silver: response.data.rates.KWDXAG || 0,
        updated_at: new Date()
      }
    });
  } catch (error) {
    res.json({
      success: true,
      source: 'fallback',
      rates: {
        Gold: { '24K': 20.500, '22K': 18.800, '21K': 17.950, '18K': 15.350 },
        Silver: 0.250,
        updated_at: new Date()
      }
    });
  }
};

export const getStats = async (req, res) => {
  try {
    const totalSales = await Invoice.sum('total_amount') || 0;
    const itemsInStock = await InventoryItem.count({ where: { status: 'In Stock' } });
    const oldGoldWeight = await OldGold.sum('weight', { where: { status: 'In Stock' } }) || 0;
    
    const inventoryItems = await InventoryItem.findAll({ where: { status: 'In Stock' } });
    let inventoryValue = 0;
    inventoryItems.forEach(item => {
      inventoryValue += parseFloat(item.weight) * parseFloat(item.buy_price_per_gram);
    });

    res.json({
      success: true,
      data: {
        total_sales: totalSales,
        items_count: itemsInStock,
        inventory_value_cost: inventoryValue,
        old_gold_stock_weight: oldGoldWeight
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};