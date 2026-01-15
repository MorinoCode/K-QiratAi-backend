//domains/sales/sales.routes.js
import express from 'express';
import * as salesController from './sales.controller.js';
import { resolveTenant } from '../../middlewares/tenant.middleware.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(resolveTenant);
router.use(protect);

router.post('/create', salesController.createSale);
router.get('/', salesController.getInvoices);
router.get('/:id', salesController.getInvoiceById);

export default router;