import express from 'express';
import * as customerController from './customer.controller.js';
import { resolveTenant } from '../../middlewares/tenant.middleware.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';
import { restrictTo } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.use(resolveTenant);
router.use(protect);

router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.get('/:id/history', customerController.getCustomerHistory);

router.post('/add', 
  restrictTo('store_owner', 'branch_manager', 'sales_man'),
  upload.fields([{ name: 'front_image', maxCount: 1 }, { name: 'back_image', maxCount: 1 }]), 
  customerController.createCustomer
);

router.put('/:id', 
  restrictTo('store_owner', 'branch_manager', 'sales_man'),
  upload.fields([{ name: 'front_image', maxCount: 1 }, { name: 'back_image', maxCount: 1 }]), 
  customerController.updateCustomer
);

router.delete('/:id', 
  restrictTo('store_owner', 'branch_manager', 'sales_man'),
  customerController.deleteCustomer
);

router.post('/scan', upload.single('image'), customerController.scanIDCard);

export default router;