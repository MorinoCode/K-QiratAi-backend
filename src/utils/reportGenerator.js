import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generateExcelReport = async (invoices) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Invoices');

  worksheet.columns = [
    { header: 'Invoice No', key: 'invoice_number', width: 20 },
    { header: 'Customer', key: 'customer_name', width: 25 },
    { header: 'Phone', key: 'customer_phone', width: 15 },
    { header: 'Total (KWD)', key: 'total_amount', width: 15 },
    { header: 'Method', key: 'payment_method', width: 12 },
    { header: 'Date', key: 'createdAt', width: 20 }
  ];

  invoices.forEach(inv => {
    worksheet.addRow({
      invoice_number: inv.invoice_number,
      customer_name: inv.customer_name,
      customer_phone: inv.customer_phone,
      total_amount: inv.total_amount,
      payment_method: inv.payment_method,
      createdAt: new Date(inv.createdAt).toLocaleDateString()
    });
  });

  return await workbook.xlsx.writeBuffer();
};

export const generateInvoicePDF = (invoice, items) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('K-QIRAT GOLD STORE', 105, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Invoice: ${invoice.invoice_number}`, 14, 30);
  doc.text(`Customer: ${invoice.customer_name}`, 14, 35);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 14, 40);

  const tableData = items.map(item => [
    item.karat + 'K',
    item.weight + 'g',
    parseFloat(item.price_per_gram).toFixed(3),
    parseFloat(item.labor_cost).toFixed(3),
    parseFloat(item.subtotal).toFixed(3)
  ]);

  doc.autoTable({
    startY: 50,
    head: [['Karat', 'Weight', 'Price/g', 'Labor', 'Subtotal (KWD)']],
    body: tableData,
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.text(`TOTAL AMOUNT: ${parseFloat(invoice.total_amount).toFixed(3)} KWD`, 14, finalY);

  return doc.output('arraybuffer');
};