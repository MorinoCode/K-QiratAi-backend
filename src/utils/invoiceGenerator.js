import puppeteer from 'puppeteer';
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { v2 as cloudinary } from 'cloudinary';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Image Processing (Base64) ---
const getImageAsBase64 = async (url) => {
    if (!url) return null;
    try {
        if (url.startsWith('http')) {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');
            const contentType = response.headers['content-type'] || 'image/webp';
            return `data:${contentType};base64,${buffer.toString('base64')}`;
        }
        
        const cleanPath = url.startsWith('/') ? url.slice(1) : url;
        const fullPath = path.join(process.cwd(), 'public', cleanPath);
        
        if (fs.existsSync(fullPath)) {
            const bitmap = fs.readFileSync(fullPath);
            const ext = path.extname(fullPath).toLowerCase().substring(1);
            const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');
            return `data:${mime};base64,${bitmap.toString('base64')}`;
        }
        return null;
    } catch (e) {
        console.error(`❌ Failed to download image: ${url}`, e.message);
        return null;
    }
};

// --- PDF Generator ---
export const generateInvoicePDF = async (invoice, items, customer, user, branchName) => {
    let browser = null;
    try {
        console.log("--- START PDF GENERATION ---");
        
        const idFrontBase64 = customer.id_card_front_url ? await getImageAsBase64(customer.id_card_front_url) : null;
        const idBackBase64 = customer.id_card_back_url ? await getImageAsBase64(customer.id_card_back_url) : null;

        const paymentMethods = invoice.payments && invoice.payments.length > 0 
            ? invoice.payments.map(p => `${p.method}: ${parseFloat(p.amount).toFixed(3)}`).join(', ') 
            : 'Cash';

        const itemsHtml = items.map((i, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td style="text-align: left; padding-left: 10px;">
                    ${i.item_name} 
                    ${i.item_name_ar ? `<br/><small style="color:#666">${i.item_name_ar}</small>` : ''}
                </td>
                <td>${i.karat}</td>
                <td>${parseFloat(i.weight).toFixed(3)} g</td>
                <td>${parseFloat(i.sell_price_per_gram).toFixed(3)}</td>
                <td>${parseFloat(i.total_price).toFixed(3)} KD</td>
            </tr>
        `).join('');

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #000; font-size: 12px; }
                .header-box { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
                .title { font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase; }
                .branch { font-size: 16px; margin-top: 5px; color: #333; font-weight: bold; }
                .meta-table { width: 100%; margin-bottom: 20px; font-size: 14px; }
                .label { font-weight: bold; margin-right: 5px; color: #444; }
                .customer-box { border: 1px solid #333; padding: 15px; border-radius: 6px; margin-bottom: 25px; background-color: #fcfcfc; }
                .section-title { font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 10px; padding-bottom: 5px; font-size: 14px; text-transform: uppercase; }
                table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                table.items th { background-color: #333; color: white; padding: 10px; font-size: 12px; font-weight: bold; text-align: center; }
                table.items td { border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 12px; }
                table.items tr:nth-child(even) { background-color: #f2f2f2; }
                .totals-container { display: flex; justify-content: flex-end; }
                .totals-table { width: 350px; border-collapse: collapse; }
                .totals-table td { padding: 10px; border: 1px solid #ccc; font-size: 14px; }
                .totals-table .grand { font-weight: 900; font-size: 18px; background: #e0e0e0; border: 2px solid #000; }
                .footer { margin-top: 60px; display: flex; justify-content: space-between; text-align: center; font-weight: bold; }
                .sig-box { width: 250px; border-top: 2px solid #000; padding-top: 10px; }
                .id-section { margin-top: 50px; page-break-inside: avoid; border: 1px dashed #999; padding: 10px; }
                .id-header { font-weight: bold; margin-bottom: 15px; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                .id-images { display: flex; gap: 20px; justify-content: center; }
                .id-wrapper { text-align: center; width: 45%; }
                .id-img { width: 100%; max-height: 200px; object-fit: contain; border: 1px solid #ccc; display: block; margin: 0 auto; }
            </style>
        </head>
        <body>
            <div class="header-box">
                <h1 class="title">INVOICE</h1>
                <div class="branch">${branchName}</div>
            </div>
            <table class="meta-table">
                <tr>
                    <td><span class="label">Invoice No:</span> ${invoice.invoice_number}</td>
                    <td style="text-align: right;"><span class="label">Date:</span> ${new Date(invoice.createdAt).toLocaleDateString()}</td>
                </tr>
                <tr>
                    <td><span class="label">Seller:</span> ${user?.full_name || 'Admin'}</td>
                    <td style="text-align: right;"><span class="label">Time:</span> ${new Date(invoice.createdAt).toLocaleTimeString()}</td>
                </tr>
            </table>
            <div class="customer-box">
                <div class="section-title">Customer Information</div>
                <div style="display:flex; justify-content: space-between;">
                    <div style="width: 48%">
                        <div style="margin-bottom:5px"><span class="label">Name:</span> ${customer.full_name}</div>
                        <div style="margin-bottom:5px"><span class="label">Phone:</span> ${customer.phone}</div>
                        <div><span class="label">Address:</span> ${customer.address || '-'}</div>
                    </div>
                    <div style="width: 48%">
                        <div style="margin-bottom:5px"><span class="label">Civil ID:</span> ${customer.civil_id || '-'}</div>
                        <div><span class="label">Nationality:</span> ${customer.nationality || '-'}</div>
                    </div>
                </div>
            </div>
            <table class="items">
                <thead>
                    <tr>
                        <th style="width: 5%">#</th>
                        <th style="width: 40%">Item Name</th>
                        <th style="width: 10%">Karat</th>
                        <th style="width: 15%">Weight</th>
                        <th style="width: 15%">Unit Price</th>
                        <th style="width: 15%">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            <div class="totals-container">
                <table class="totals-table">
                    <tr>
                        <td>Total Weight</td>
                        <td style="text-align:right; font-weight:bold;">${parseFloat(invoice.total_weight).toFixed(3)} g</td>
                    </tr>
                    <tr>
                        <td>Total Labor Cost</td>
                        <td style="text-align:right; font-weight:bold;">${parseFloat(invoice.total_labor_cost).toFixed(3)} KD</td>
                    </tr>
                    <tr>
                        <td class="grand">NET AMOUNT</td>
                        <td class="grand" style="text-align:right">${parseFloat(invoice.total_amount).toFixed(3)} KD</td>
                    </tr>
                </table>
            </div>
            <div style="margin-top: 20px; font-size: 12px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
                <strong>Payment Methods:</strong> ${paymentMethods}
            </div>
            <div class="footer">
                <div class="sig-box">Seller Signature</div>
                <div class="sig-box">Customer Signature</div>
            </div>
            ${(idFrontBase64 || idBackBase64) ? `
            <div class="id-section">
                <div class="id-header">Customer Identification</div>
                <div class="id-images">
                    ${idFrontBase64 ? `
                    <div class="id-wrapper">
                        <img src="${idFrontBase64}" class="id-img" />
                        <div style="margin-top:5px;font-size:10px;color:#555;">Front Side</div>
                    </div>` : ''}
                    ${idBackBase64 ? `
                    <div class="id-wrapper">
                        <img src="${idBackBase64}" class="id-img" />
                        <div style="margin-top:5px;font-size:10px;color:#555;">Back Side</div>
                    </div>` : ''}
                </div>
            </div>
            ` : ''}
        </body>
        </html>`;

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const safeBranchName = branchName ? branchName.replace(/[^a-zA-Z0-9]/g, '-') : 'Main';
        const fileName = `INV-${safeBranchName}-${invoice.invoice_number}.pdf`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices');
        
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        
        const filePath = path.join(uploadDir, fileName);
        
        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
        });

        console.log("✅ PDF Generated Locally:", filePath);

        let cloudUrl = null;
        if (process.env.USE_CLOUD_STORAGE === 'true') {
            try {
                const result = await cloudinary.uploader.upload(filePath, {
                    folder: `${process.env.CLOUDINARY_FOLDER || 'gold_app'}/invoices`,
                    resource_type: "raw", 
                    use_filename: true, 
                    unique_filename: false,
                    public_id: fileName.replace('.pdf', '')
                });
                cloudUrl = result.secure_url;
            } catch (err) {
                console.error("Cloudinary Error:", err.message);
            }
        }

        return { localPath: `/uploads/invoices/${fileName}`, cloudUrl };

    } catch (error) {
        console.error("❌ PDF Generation Error:", error);
        return null;
    } finally {
        if (browser) await browser.close();
    }
};

// --- Excel Generator (Fixed to Append Rows) ---
export const updateSalesExcel = async (invoice, items, customer, user, branchName) => {
  try {
    console.log("--- START EXCEL UPDATE (BULLETPROOF) ---");

    // ---------- Paths ----------
    const reportDir = path.join(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    const safeBranch = (branchName || 'Main').replace(/[^a-zA-Z0-9]/g, '-');
    const filePath = path.join(reportDir, `sales_${safeBranch}.xlsx`);

    // ---------- Workbook ----------
    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(filePath)) {
      await workbook.xlsx.readFile(filePath);
      console.log("📂 Existing file loaded");
    }

    // ---------- Monthly Sheet ----------
    const invoiceDate = new Date(invoice.createdAt);
    const sheetName = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;

    let worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      worksheet = workbook.addWorksheet(sheetName);
      console.log(`🆕 Created new sheet: ${sheetName}`);
    }

    // ---------- FORCE COLUMNS (CRITICAL) ----------
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Invoice #', key: 'inv', width: 25 },
      { header: 'Branch', key: 'branch', width: 15 },
      { header: 'Seller', key: 'seller', width: 20 },
      { header: 'Customer Name', key: 'cust_name', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Civil ID', key: 'civil_id', width: 18 },
      { header: 'Total Weight (g)', key: 'weight', width: 18 },
      { header: 'Total Amount (KD)', key: 'amount', width: 18 },
      { header: 'Payment Method', key: 'payment', width: 25 },
    ];

    // ---------- Payment ----------
    const paymentMethods = invoice.payments?.length
      ? invoice.payments.map(p => `${p.method}:${parseFloat(p.amount).toFixed(3)}`).join(' | ')
      : 'Cash';

    // ---------- SAFE INSERT (NO OVERWRITE) ----------
    const insertAt = worksheet.lastRow ? worksheet.lastRow.number + 1 : 2;

    worksheet.insertRow(insertAt, {
      date: invoiceDate.toLocaleDateString(),
      time: invoiceDate.toLocaleTimeString(),
      inv: invoice.invoice_number,
      branch: branchName || 'Main',
      seller: user?.full_name || 'Admin',
      cust_name: customer.full_name,
      phone: customer.phone,
      civil_id: customer.civil_id || '-',
      weight: parseFloat(invoice.total_weight).toFixed(3),
      amount: parseFloat(invoice.total_amount).toFixed(3),
      payment: paymentMethods,
    });

    // ---------- Save ----------
    await workbook.xlsx.writeFile(filePath);

    console.log(`✅ Excel Updated | File: sales_${safeBranch}.xlsx | Sheet: ${sheetName}`);

  } catch (error) {
    console.error("❌ Excel Update Failed:", error.message);

    if (error.code === 'EBUSY') {
      console.error("⛔ FILE IS OPEN! Please close Excel and retry.");
    }
  }
};
