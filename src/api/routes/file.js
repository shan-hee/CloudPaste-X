import express from 'express';
import multer from 'multer';
import shareService from '../../core/services/ShareService.js';
import { AppError } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE) || 5) * 1024 * 1024 * 1024 // 默认5GB
  }
});

// 获取文件列表（公开访问）
router.get('/', async (req, res, next) => {
  try {
    const files = await shareService.findAll({ type: 'file' });
    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    logger.error('获取文件列表失败:', error);
    next(new AppError('获取文件列表失败', 500));
  }
});

export default router; 