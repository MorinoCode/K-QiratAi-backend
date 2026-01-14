import express from 'express';
import * as authController from './auth.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/signup', authController.register);
router.post('/login', authController.login);
router.post('/add-staff', protect, authController.addStaff);
router.get('/staff-list', protect, authController.listStaff);

export default router;