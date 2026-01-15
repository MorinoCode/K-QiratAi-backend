// domains/auth/auth.routes.js
import express from 'express';
import * as authController from './auth.controller.js';
import { resolveTenant } from '../../middlewares/tenant.middleware.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/login', resolveTenant, authController.login);

router.post('/logout', authController.logout);

router.get('/me', resolveTenant, protect, authController.getMe);

export default router;