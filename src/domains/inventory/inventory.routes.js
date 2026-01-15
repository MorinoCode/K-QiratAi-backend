import express from 'express';
import * as inventoryController from './inventory.controller.js';
import { resolveTenant } from '../../middlewares/tenant.middleware.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';
import { restrictTo } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.use(resolveTenant);
router.use(protect);

router.post('/add', 
  restrictTo('store_owner', 'branch_manager', 'sales_man'), 
  upload.array('images', 5), 
  inventoryController.addItem
);

router.get('/', inventoryController.getInventory);

router.get('/barcode/:barcode', inventoryController.getItemByBarcode);

router.get('/:id', inventoryController.getItemById);

router.put('/:id', 
  restrictTo('store_owner', 'branch_manager', 'sales_man'), 
  upload.array('images', 5), 
  inventoryController.updateItem
);

router.post('/:id/delete-image', 
  restrictTo('store_owner', 'branch_manager', 'sales_man'), 
  inventoryController.deleteItemImage
);

router.delete('/:id', 
  restrictTo('store_owner', 'branch_manager', 'sales_man'), 
  inventoryController.deleteItem
);

export default router;