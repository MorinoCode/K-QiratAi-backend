import express from 'express';
import * as invoiceController from './invoice.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/create', protect, invoiceController.createInvoice);
router.get('/list', protect, invoiceController.getAllInvoices);
router.get('/:id', protect, invoiceController.getInvoiceById); // این خط اضافه شد
router.get('/export/excel', protect, invoiceController.downloadInvoicesExcel);
router.get('/export/pdf/:id', protect, invoiceController.downloadInvoicePDF);

export default router;