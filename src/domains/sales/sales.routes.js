import express from 'express';
import * as salesController from './sales.controller.js';
import { resolveTenant } from '../../middlewares/tenant.middleware.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(resolveTenant);
router.use(protect);

router.post('/create', salesController.createSale);

// ✅ Moved above /:id to prevent routing conflict
router.get('/invoices', salesController.getInvoices);

router.get('/:id', salesController.getInvoiceById);

export default router;