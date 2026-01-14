import * as invoiceService from './invoice.service.js';
import * as reportGenerator from '../../utils/reportGenerator.js';

const generateWhatsAppLink = (invoice, items) => {
  const phoneNumber = invoice.customer_phone;
  
  let message = `*K-Qirat Gold Store 🇰🇼*\n`;
  message += `--------------------------\n`;
  message += `📜 *Invoice No:* ${invoice.invoice_number}\n`;
  message += `👤 *Customer:* ${invoice.customer_name}\n`;
  message += `📅 *Date:* ${new Date(invoice.createdAt).toLocaleDateString('en-GB')}\n`;
  message += `--------------------------\n`;
  
  items.forEach((item, index) => {
    message += `${index + 1}. ${item.karat}K Gold - ${item.weight}g\n`;
    message += `   Price/g: ${parseFloat(item.sell_price_per_gram).toFixed(3)} KWD\n`;
    if (item.labor_cost_per_gram > 0) {
      message += `   Labor: ${parseFloat(item.labor_cost_per_gram).toFixed(3)} KWD\n`;
    }
  });

  message += `--------------------------\n`;
  message += `💰 *Total Amount: ${parseFloat(invoice.total_amount).toFixed(3)} KWD*\n`;
  message += `💳 *Payment:* ${invoice.payment_method}\n`;
  message += `--------------------------\n`;
  message += `Thank you for choosing K-Qirat!`;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
};

export const createInvoice = async (req, res) => {
  try {
    const { items, ...invoiceData } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Invoice must contain at least one item.' });
    }

    const newInvoice = await invoiceService.createFullInvoice(invoiceData, items, req.user.id);
    const whatsappLink = generateWhatsAppLink(newInvoice, items);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: newInvoice,
      whatsappLink: whatsappLink
    });
  } catch (error) {
    console.error('Invoice Creation Error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create invoice'
    });
  }
};

export const getAllInvoices = async (req, res) => {
  try {
    const invoices = await invoiceService.getStoreInvoices(req.user.id);
    res.json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await invoiceService.getInvoiceDetails(id, req.user.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadInvoicesExcel = async (req, res) => {
  try {
    const invoices = await invoiceService.getStoreInvoices(req.user.id);
    const buffer = await reportGenerator.generateExcelReport(invoices);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceData = await invoiceService.getInvoiceDetails(id, req.user.id);

    if (!invoiceData) return res.status(404).send('Invoice not found');

    const buffer = await reportGenerator.generateInvoicePDF(invoiceData, invoiceData.items);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${id}.pdf`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};