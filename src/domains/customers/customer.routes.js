import express from 'express';
import multer from 'multer';
import * as customerController from './customer.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', protect, customerController.getCustomers);
router.get('/:id', protect, customerController.getCustomerById);
router.get('/image/:id', customerController.getCustomerImage); 

router.post('/scan', protect, upload.single('image'), customerController.scanIDCard);
router.post('/', protect, upload.single('id_card_image'), customerController.createCustomer);

router.put('/:id', protect, upload.single('id_card_image'), customerController.updateCustomer);
router.delete('/:id', protect, customerController.deleteCustomer);
router.get('/:id/history', protect, customerController.getCustomerHistory);

export default router;