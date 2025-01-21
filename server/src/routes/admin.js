import express from 'express';
import * as adminController from '../controllers/admin.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// 登录
router.post('/login', adminController.login);

// 检查会话状态
router.get('/session', adminController.checkSession);

// 退出登录
router.post('/logout', authMiddleware, adminController.logout);

// 获取系统设置
router.get('/settings', adminController.getSettings);

// 更新系统设置
router.post('/settings', authMiddleware, adminController.updateSettings);

export default router; 