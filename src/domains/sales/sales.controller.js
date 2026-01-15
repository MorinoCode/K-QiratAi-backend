import sequelize from '../../config/database.js';
import Invoice from './invoice.model.js';
import InvoiceItem from './invoice-item.model.js';
import InvoicePayment from './payment.model.js';
import InventoryItem from '../inventory/item.model.js';
import Customer from '../customers/customer.model.js';
import User from '../auth/user.model.js';
import Branch from '../store/branch.model.js';
import { generateInvoicePDF, updateSalesExcel } from '../../utils/invoiceGenerator.js';

const generateWhatsAppLink = (invoice, customer, items) => {
  if (!customer.phone) return null;
  
  let message = `*Gold Store Invoice*\n`;
  message += `Invoice No: ${invoice.invoice_number}\n`;
  message += `Date: ${new Date().toLocaleDateString()}\n`;
  message += `------------------\n`;
  
  items.forEach(item => {
    const name = item.item_name_ar ? `${item.item_name} / ${item.item_name_ar}` : item.item_name;
    message += `${name} (${item.karat}K) - ${item.weight}g\n`;
    message += `Price: ${Number(item.total_price).toFixed(3)} KD\n`;
  });
  
  message += `------------------\n`;
  message += `*Total: ${Number(invoice.total_amount).toFixed(3)} KD*`;

  return `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`;
};

export const createSale = async (req, res) => {
  let user = null;
  try {
      user = await User.findByPk(req.user.id);
  } catch (e) {
      user = { full_name: 'Cashier' };
  }

  let branchName = 'Main Branch';

  const t = await sequelize.transaction();

  try {
    await sequelize.query('SET search_path TO "tenant_gold_mubarakiye"', { transaction: t });

    const { customer_id, items, payments, notes } = req.body;

    if (!items || items.length === 0) {
      throw new Error('No items in cart.');
    }

    const customer = await Customer.findByPk(customer_id, { transaction: t });
    if (!customer) {
      throw new Error('Customer not found.');
    }

    let totalWeight = 0;
    let totalLaborCost = 0;
    let grandTotal = 0;
    const invoiceItemsData = [];

    for (const item of items) {
      const inventoryItem = await InventoryItem.findByPk(item.id, { transaction: t });

      if (!inventoryItem) throw new Error(`Item with ID ${item.id} not found.`);
      if (inventoryItem.status !== 'In Stock') throw new Error(`Item ${inventoryItem.item_name} is already sold.`);

      const weight = parseFloat(inventoryItem.weight);
      const labor = parseFloat(item.labor_cost || 0);
      const pricePerGram = parseFloat(item.price_per_gram);
      const itemTotal = (weight * pricePerGram) + labor;

      totalWeight += weight;
      totalLaborCost += labor;
      grandTotal += itemTotal;

      invoiceItemsData.push({
        inventory_item_id: inventoryItem.id,
        item_name: inventoryItem.item_name,
        item_name_ar: inventoryItem.item_name_ar,
        karat: inventoryItem.karat,
        weight: weight,
        sell_price_per_gram: pricePerGram,
        labor_cost: labor,
        total_price: itemTotal
      });

      if (inventoryItem.quantity > 1) {
        inventoryItem.quantity -= 1;
      } else {
        inventoryItem.quantity = 0;
        inventoryItem.status = 'Sold';
      }
      await inventoryItem.save({ transaction: t });
    }

    const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
    if (Math.abs(totalPaid - grandTotal) > 0.01) {
        throw new Error(`Payment amount (${totalPaid}) does not match Total Amount (${grandTotal})`);
    }

    const invoiceNumber = `INV-${Date.now()}`;

    const newInvoice = await Invoice.create({
      invoice_number: invoiceNumber,
      customer_id,
      total_weight: totalWeight,
      total_labor_cost: totalLaborCost,
      total_amount: grandTotal,
      notes,
      branch_id: req.user.branch_id || 1,
      created_by: req.user.id
    }, { transaction: t });

    for (const itemData of invoiceItemsData) {
      await InvoiceItem.create({
        invoice_id: newInvoice.id,
        ...itemData
      }, { transaction: t });
    }

    for (const payment of payments) {
      await InvoicePayment.create({
        invoice_id: newInvoice.id,
        method: payment.method,
        amount: payment.amount,
        reference_number: payment.reference
      }, { transaction: t });
    }

    newInvoice.payments = payments;

    // Await PDF & Excel Generation
    const pdfResult = await generateInvoicePDF(newInvoice, invoiceItemsData, customer, user, branchName);
    await updateSalesExcel(newInvoice, invoiceItemsData, customer, user, branchName);

    await t.commit();

    const whatsappLink = generateWhatsAppLink(newInvoice, customer, invoiceItemsData);

    const fullInvoice = await Invoice.findByPk(newInvoice.id, {
        include: [
            { model: InvoiceItem, as: 'items' },
            { model: InvoicePayment, as: 'payments' },
            { model: Customer, as: 'customer' }
        ]
    });

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully.',
      data: {
        invoice: fullInvoice,
        items: invoiceItemsData,
        whatsapp_link: whatsappLink,
        pdf_url: pdfResult?.cloudUrl || null,
        local_pdf: pdfResult?.localPath || null
      }
    });

  } catch (error) {
    if (t) await t.rollback();
    console.error('Sales Error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      include: [
        { model: Customer, as: 'customer', attributes: ['full_name'] },
        { model: User, as: 'creator', attributes: ['full_name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: InvoicePayment, as: 'payments' },
        { model: Customer, as: 'customer' },
        { model: User, as: 'creator', attributes: ['full_name'] }
      ]
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};