import sequelize from '../../config/database.js';
import Invoice from './invoice.model.js';
import InvoiceItem from './invoice_items.model.js';
import GoldItem from '../gold/gold.model.js';

export const createFullInvoice = async (invoiceData, items, userId) => {
  const t = await sequelize.transaction();

  try {
    const totalWeight = items.reduce((sum, item) => sum + parseFloat(item.weight), 0);

    const invoice = await Invoice.create({
      ...invoiceData,
      total_weight: totalWeight,
      user_id: userId,
      created_by: userId,
      invoice_number: `INV-${Date.now()}`
    }, { transaction: t });

    for (const item of items) {
      await InvoiceItem.create({
        invoice_id: invoice.id,
        gold_item_id: item.gold_item_id,
        weight: item.weight,
        karat: item.karat,
        price_per_gram: item.sell_price_per_gram, 
        labor_cost: item.labor_cost_per_gram,
        subtotal: item.total_price
      }, { transaction: t });

      // --- تغییر مهم: به جای حذف، وضعیت را تغییر می‌دهیم ---
      const goldItem = await GoldItem.findByPk(item.gold_item_id);
      if (goldItem) {
        goldItem.status = 'Sold'; // تغییر وضعیت به فروخته شده
        await goldItem.save({ transaction: t });
      }
    }

    await t.commit();
    return invoice;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export const getStoreInvoices = async (userId) => {
  return await Invoice.findAll({
    where: { user_id: userId },
    include: [{ model: InvoiceItem, as: 'items' }],
    order: [['createdAt', 'DESC']]
  });
};

export const getInvoiceDetails = async (invoiceId, userId) => {
  return await Invoice.findOne({
    where: { id: invoiceId, user_id: userId },
    include: [{ model: InvoiceItem, as: 'items' }]
  });
};