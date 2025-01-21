import express from 'express';
import { shareController } from '../controllers/share.js';
import { validateShare } from '../middlewares/validator.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// 获取分享列表
router.get('/list', shareController.listShares);

// 获取存储使用统计
router.get('/stats', shareController.getStats);

// 删除分享
router.delete('/:id', authMiddleware, shareController.deleteShare);

// 打印路由信息
router.stack.forEach(layer => {
    if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(',');
    }
});

router.post('/', validateShare, shareController.createShare);
router.get('/:id', shareController.getShare);
router.post('/:id/verify', shareController.verifyPassword);
router.get('/:id/download', authMiddleware, shareController.downloadShare);

export default router; 