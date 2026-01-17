import puppeteer from 'puppeteer';
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { v2 as cloudinary } from 'cloudinary';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        return null;
    }
};

export const generateInvoicePDF = async (invoice, items, customer, user, branchName, storeSettings = {}) => {
    let browser = null;
    try {
        const storeName = storeSettings.name || "GOLD STORE";
        const storePhone = storeSettings.phone || "";

        const idFrontBase64 = customer.id_card_front_url ? await getImageAsBase64(customer.id_card_front_url) : null;
        const idBackBase64 = customer.id_card_back_url ? await getImageAsBase64(customer.id_card_back_url) : null;
        
        const paymentMethods = Array.isArray(invoice.payments) && invoice.payments.length > 0 
            ? invoice.payments.map(p => `${p.method}: ${parseFloat(p.amount).toFixed(3)}`).join(', ') 
            : 'Cash';

        const itemsHtml = items.map((i, idx) => `
            <tr>
                <td style="text-align:center">${idx + 1}</td>
                <td style="text-align: left; padding-left: 10px;">
                    <div style="font-weight:bold">${i.item_name}</div>
                    ${i.item_name_ar ? `<div style="font-size:10px; color:#555;">${i.item_name_ar}</div>` : ''}
                </td>
                <td style="text-align:center">${i.karat}K</td>
                <td style="text-align:center">${parseFloat(i.weight).toFixed(3)}</td>
                <td style="text-align:center">${parseFloat(i.sell_price_per_gram).toFixed(3)}</td>
                <td style="text-align:center">${parseFloat(i.labor_cost || 0).toFixed(3)}</td>
                <td style="text-align:center; font-weight:bold;">${parseFloat(i.total_price).toFixed(3)}</td>
            </tr>
        `).join('');

        const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <style>
                @page { size: A4; margin: 0; }
                body { font-family: 'Times New Roman', serif; margin: 0; padding: 0; background: #fff; color: #000; -webkit-print-color-adjust: exact; }
                .page-frame { border: 3px double #D4AF37; margin: 10mm; min-height: calc(297mm - 20mm); position: relative; padding: 20px; box-sizing: border-box; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #D4AF37; padding-bottom: 15px; margin-bottom: 20px; }
                .store-info h1 { margin: 0; color: #D4AF37; text-transform: uppercase; font-size: 28px; letter-spacing: 2px; }
                .store-info p { margin: 2px 0; font-size: 12px; color: #555; }
                .invoice-title { text-align: right; }
                .invoice-title h2 { margin: 0; font-size: 24px; color: #000; }
                .invoice-title span { font-size: 14px; color: #777; display:block; }
                .info-grid { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 13px; }
                .box { width: 48%; border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #fdfdfd; }
                .box-title { font-weight: bold; color: #D4AF37; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 8px; text-transform: uppercase; font-size: 11px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                .label { font-weight: bold; color: #444; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                th { background-color: #D4AF37; color: white; padding: 8px; text-transform: uppercase; font-size: 11px; border: 1px solid #b8952b; }
                td { border: 1px solid #ddd; padding: 8px; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .totals-section { display: flex; justify-content: flex-end; }
                .totals-table { width: 40%; border-collapse: collapse; }
                .totals-table td { padding: 8px; border: 1px solid #eee; }
                .totals-table .t-label { font-weight: bold; background: #fdfdfd; }
                .totals-table .t-value { text-align: right; }
                .grand-total { background: #D4AF37 !important; color: #fff; font-weight: bold; font-size: 14px; }
                .terms { margin-top: 30px; font-size: 10px; color: #666; text-align: justify; border-top: 1px solid #eee; padding-top: 10px; }
                .signatures { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; font-size: 12px; font-weight: bold; }
                .sig-line { width: 200px; border-top: 1px solid #000; padding-top: 5px; }
                .id-cards { margin-top: 20px; text-align: center; border: 1px dashed #ccc; padding: 10px; background: #fafafa; }
                .id-cards img { height: 100px; margin: 0 10px; border: 1px solid #ddd; }
                .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; color: rgba(212, 175, 55, 0.05); z-index: -1; font-weight: bold; white-space: nowrap; }
            </style>
        </head>
        <body>
            <div class="page-frame">
                <div class="watermark">${storeName}</div>
                <div class="header">
                    <div class="store-info">
                        <h1>${storeName}</h1>
                        <p>${branchName}</p>
                        <p>${storePhone}</p>
                    </div>
                    <div class="invoice-title">
                        <h2>INVOICE / فاتورة</h2>
                        <span>#${invoice.invoice_number}</span>
                    </div>
                </div>
                <div class="info-grid">
                    <div class="box">
                        <div class="box-title">Customer Details / بيانات العميل</div>
                        <div class="row"><span class="label">Name:</span> <span>${customer.full_name}</span></div>
                        <div class="row"><span class="label">Phone:</span> <span>${customer.phone}</span></div>
                        <div class="row"><span class="label">Civil ID:</span> <span>${customer.civil_id || '-'}</span></div>
                        <div class="row"><span class="label">Nationality:</span> <span>${customer.nationality || '-'}</span></div>
                    </div>
                    <div class="box">
                        <div class="box-title">Invoice Details / تفاصيل الفاتورة</div>
                        <div class="row"><span class="label">Date:</span> <span>${new Date(invoice.createdAt).toLocaleDateString()}</span></div>
                        <div class="row"><span class="label">Time:</span> <span>${new Date(invoice.createdAt).toLocaleTimeString()}</span></div>
                        <div class="row"><span class="label">Salesman:</span> <span>${user?.full_name || 'Admin'}</span></div>
                        <div class="row"><span class="label">Payment:</span> <span>${paymentMethods}</span></div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th width="5%">#</th>
                            <th width="35%">Item / الصنف</th>
                            <th width="10%">Karat / العيار</th>
                            <th width="12%">Weight (g) / الوزن</th>
                            <th width="13%">Price/g / سعر الجرام</th>
                            <th width="10%">Labor / المصنعية</th>
                            <th width="15%">Total / الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div class="totals-section">
                    <table class="totals-table">
                        <tr>
                            <td class="t-label">Total Weight / الوزن الكلي</td>
                            <td class="t-value">${parseFloat(invoice.total_weight).toFixed(3)} g</td>
                        </tr>
                        <tr>
                            <td class="t-label">Total Labor / إجمالي المصنعية</td>
                            <td class="t-value">${parseFloat(invoice.total_labor_cost).toFixed(3)} KD</td>
                        </tr>
                        <tr class="grand-total">
                            <td style="border:none;">NET AMOUNT / الصافي</td>
                            <td style="text-align:right; border:none;">${parseFloat(invoice.total_amount).toFixed(3)} KD</td>
                        </tr>
                    </table>
                </div>
                <div class="terms">
                    <strong>Terms & Conditions / الشروط والأحكام:</strong><br/>
                    1. Goods sold are gold of standard purity (18K, 21K, 22K) as specified.<br/>
                    2. No refund or exchange for cut or customized gold items.<br/>
                    3. Exchange is valid within 3 days provided the item is in original condition and tag is attached.<br/>
                    4. Original invoice is required for any exchange or refund.<br/>
                    <div style="direction: rtl; margin-top: 5px;">
                    ١. البضاعة المباعة هي ذهب بالعيار الموضح (١٨، ٢١، ٢٢).<br/>
                    ٢. لا يمكن استرجاع أو استبدال الذهب المقصوص أو المصنع خصيصاً.<br/>
                    ٣. الاستبدال مسموح خلال ٣ أيام بشرط أن تكون القطعة بحالتها الأصلية مع التاج.<br/>
                    ٤. الفاتورة الأصلية ضرورية لأي استبدال أو استرجاع.
                    </div>
                </div>
                <div class="signatures">
                    <div class="sig-line">Seller Signature<br/>توقيع البائع</div>
                    <div class="sig-line">Customer Signature<br/>توقيع العميل</div>
                </div>
                ${(idFrontBase64 || idBackBase64) ? `
                <div class="id-cards">
                    <div style="font-size:10px; font-weight:bold; margin-bottom:5px;">Attached Identification</div>
                    ${idFrontBase64 ? `<img src="${idFrontBase64}" />` : ''}
                    ${idBackBase64 ? `<img src="${idBackBase64}" />` : ''}
                </div>
                ` : ''}
            </div>
        </body>
        </html>`;

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 794, height: 1123 });
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const safeBranch = (branchName || 'Main').replace(/[^a-zA-Z0-9]/g, '-');
        const safeCustomer = (customer.full_name || 'Guest').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `INV-${safeBranch}-${safeCustomer}-${invoice.invoice_number}.pdf`;
        
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        
        const filePath = path.join(uploadDir, fileName);
        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true,
            margin: { top: '0', bottom: '0', left: '0', right: '0' }
        });

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
            } catch (err) {}
        }

        return { localPath: `/uploads/invoices/${fileName}`, cloudUrl };

    } catch (error) {
        return null;
    } finally {
        if (browser) await browser.close();
    }
};

export const updateSalesExcel = async (invoice, items, customer, user, branchName) => {
    try {
        const reportDir = path.join(process.cwd(), 'public', 'reports');
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

        const safeBranch = (branchName || 'Main').replace(/[^a-zA-Z0-9]/g, '-');
        const filePath = path.join(reportDir, `sales_${safeBranch}.xlsx`);

        const workbook = new ExcelJS.Workbook();
        if (fs.existsSync(filePath)) {
            await workbook.xlsx.readFile(filePath);
        }

        const invoiceDate = new Date(invoice.createdAt);
        const sheetName = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;

        let worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            worksheet = workbook.addWorksheet(sheetName);
        }

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

        const paymentMethods = invoice.payments && invoice.payments.length
            ? invoice.payments.map(p => `${p.method}:${parseFloat(p.amount).toFixed(3)}`).join(' | ')
            : 'Cash';

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

        await workbook.xlsx.writeFile(filePath);
    } catch (error) {
        console.error("Excel Error", error);
    }
};