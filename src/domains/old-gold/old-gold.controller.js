//domains/old-gold/old-gold.controller.js
import OldGold from './old-gold.model.js';
import Customer from '../customers/customer.model.js';
import User from '../auth/user.model.js';

export const createPurchase = async (req, res) => {
  try {
    const { customer_id, description, karat, weight, price_per_gram, branch_id } = req.body;

    const total_amount = parseFloat(weight) * parseFloat(price_per_gram);
    const purchase_number = `PUR-${Date.now()}`;

    let image_url = null;
    if (req.file) {
      image_url = `/uploads/old-gold/${req.file.filename}`;
    }

    const newPurchase = await OldGold.create({
      purchase_number,
      customer_id,
      description,
      karat,
      weight,
      price_per_gram,
      total_amount,
      image_url,
      branch_id: branch_id || req.user.branch_id,
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Old gold purchase recorded successfully',
      data: newPurchase
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPurchases = async (req, res) => {
  try {
    const purchases = await OldGold.findAll({
      include: [
        { model: Customer, as: 'customer', attributes: ['full_name', 'civil_id'] },
        { model: User, as: 'buyer', attributes: ['full_name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: purchases
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};