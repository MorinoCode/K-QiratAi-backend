import * as goldService from './gold.service.js';
import GoldItem from './gold.model.js';

export const getLivePrice = async (req, res) => {
  try {
    const prices = await goldService.getLiveGoldPriceKWD();
    res.json({
      success: true,
      timestamp: prices.updated_at,
      rates: {
        "24K": prices.k24,
        "22K": prices.k22,
        "21K": prices.k21,
        "18K": prices.k18
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? req.user.id : req.user.store_id; 
    const data = await goldService.getDashboardSummary(userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const purchaseOldGold = async (req, res) => {
  try {
    const adminId = req.user.role === 'admin' ? req.user.id : req.user.store_id;
    const staffId = req.user.id;
    
    const purchase = await goldService.buyGoldFromCustomer(req.body, adminId, staffId);
    
    res.status(201).json({
      success: true,
      message: 'Old gold purchased and added to inventory',
      data: purchase
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const addGoldItem = async (req, res) => {
  try {
    const { item_name, category, karat, weight, buy_price_per_gram, barcode, store_id } = req.body;
    
    const itemData = {
      item_name,
      category,
      karat,
      weight,
      buy_price_per_gram,
      barcode,
      store_id,
      user_id: req.user.role === 'admin' ? req.user.id : req.user.store_id,
      added_by: req.user.id,
      image_data: req.file ? req.file.buffer : null,
      image_type: req.file ? req.file.mimetype : null,
      status: 'In Stock' // پیش‌فرض
    };

    const item = await goldService.addItemToInventory(itemData);
    const { image_data, ...itemWithoutImage } = item.toJSON();

    res.status(201).json({
      success: true,
      message: 'Item added successfully',
      item: itemWithoutImage
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getItemImage = async (req, res) => {
  try {
    const item = await GoldItem.findByPk(req.params.id);
    if (item && item.image_data) {
      res.set('Content-Type', item.image_type);
      res.send(item.image_data);
    } else {
      res.status(404).send('Image not found');
    }
  } catch (error) {
    res.status(500).send('Error retrieving image');
  }
};

export const getItemByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    // فقط کالاهای موجود را جستجو کن
    const item = await GoldItem.findOne({ where: { barcode, status: 'In Stock' } });

    if (!item) return res.status(404).json({ message: 'Barcode not found or Item sold' });

    const livePrices = await goldService.getLiveGoldPriceKWD();
    const karatKey = `k${item.karat}`;
    const currentPrice = livePrices[karatKey] || 0;

    const purchaseValue = parseFloat(item.weight) * parseFloat(item.buy_price_per_gram);
    const currentValue = parseFloat(item.weight) * currentPrice;
    const profit = currentValue - purchaseValue;

    res.json({
      success: true,
      item,
      analysis: {
        current_market_price: currentPrice,
        estimated_profit_kwd: profit.toFixed(3),
        profit_percentage: purchaseValue > 0 ? ((profit / purchaseValue) * 100).toFixed(2) + '%' : '0%'
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInventory = async (req, res) => {
  try {
    const { store_id } = req.query;
    if (!store_id) {
      return res.status(400).json({ message: "Store ID is required" });
    }

    const items = await GoldItem.findAll({ 
      // --- فیلتر کردن فقط کالاهای موجود ---
      where: { store_id: store_id, status: 'In Stock' },
      attributes: { exclude: ['image_data'] },
      order: [['createdAt', 'DESC']] 
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGoldItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await GoldItem.findOne({ where: { id } });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const { image_data, ...itemDetails } = item.toJSON();
    res.json(itemDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateGoldItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, weight, karat, buy_price_per_gram, category } = req.body;

    const item = await GoldItem.findOne({ where: { id } });
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    item.item_name = item_name || item.item_name;
    item.weight = weight || item.weight;
    item.karat = karat || item.karat;
    item.buy_price_per_gram = buy_price_per_gram || item.buy_price_per_gram;
    item.category = category || item.category;

    if (req.file) {
      item.image_data = req.file.buffer;
      item.image_type = req.file.mimetype;
    }

    await item.save();
    
    const { image_data, ...updatedItem } = item.toJSON();
    res.json({ message: "Item updated successfully", item: updatedItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteGoldItem = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await GoldItem.destroy({ where: { id } });

    if (!result) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};