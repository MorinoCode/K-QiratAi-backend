import axios from 'axios';
import sequelize from '../../config/database.js';
import GoldItem from './gold.model.js';
import GoldPurchase from './gold_purchase.model.js';

export const getLiveGoldPriceKWD = async () => {
  try {
    const response = await axios.get(`https://api.metalpriceapi.com/v1/latest?api_key=${process.env.GOLD_API_KEY}&base=KWD&currencies=XAU`);
    const xauToKwd = response.data.rates.KWDXAU || response.data.rates.XAU;
    const price24k = (1 / xauToKwd) / 31.1035;

    return {
      k24: price24k,
      k22: price24k * 0.9167,
      k21: price24k * 0.875,
      k18: price24k * 0.75,
      updated_at: new Date()
    };
  } catch (error) {
    console.error("API Error, using fallback prices");
    return { k24: 19.500, k21: 17.100, k18: 14.600, updated_at: new Date() };
  }
};

export const addItemToInventory = async (itemData) => {
  return await GoldItem.create(itemData);
};

export const calculateInventoryValue = async (userId) => {
  const livePrices = await getLiveGoldPriceKWD();
  const items = await GoldItem.findAll({ where: { user_id: userId } });

  let totalPurchaseValue = 0;
  let totalCurrentValue = 0;

  items.forEach(item => {
    const weight = parseFloat(item.weight);
    const buyPrice = parseFloat(item.buy_price_per_gram);
    const karatKey = `k${item.karat}`;
    const currentMarketPrice = livePrices[karatKey] || 0;

    totalPurchaseValue += weight * buyPrice;
    totalCurrentValue += weight * currentMarketPrice;
  });

  return {
    summary: {
      total_items: items.length,
      total_purchase_kwd: totalPurchaseValue.toFixed(3),
      total_current_kwd: totalCurrentValue.toFixed(3),
      profit_loss_kwd: (totalCurrentValue - totalPurchaseValue).toFixed(3),
      profit_percentage: totalPurchaseValue > 0 ? (((totalCurrentValue - totalPurchaseValue) / totalPurchaseValue) * 100).toFixed(2) + '%' : '0%'
    },
    live_rates: livePrices
  };
};

export const buyGoldFromCustomer = async (purchaseData, userId, staffId) => {
  const t = await sequelize.transaction();
  try {
    const purchase = await GoldPurchase.create({
      ...purchaseData,
      user_id: userId,
      created_by: staffId,
      purchase_number: `PUR-${Date.now()}`
    }, { transaction: t });

    await GoldItem.create({
      item_name: `Old Gold: ${purchaseData.item_description}`,
      category: 'Old Gold',
      karat: purchaseData.karat,
      weight: purchaseData.weight,
      buy_price_per_gram: purchaseData.price_per_gram_bought,
      store_id: purchaseData.store_id || 1, 
      user_id: userId,
      added_by: staffId,
      barcode: `OLD-${Date.now()}`
    }, { transaction: t });

    await t.commit();
    return purchase;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export const getDashboardSummary = async (userId) => {
  return await calculateInventoryValue(userId);
};