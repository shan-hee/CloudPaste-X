const express = require('express');
const router = express.Router();
const multer = require('multer');
const shareService = require('../../core/services/ShareService');
const { AppError } = require('../../utils/errorHandler');
const { logger } = require('../../utils/logger');
const { authMiddleware } = require('../middlewares/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 默认5MB
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

module.exports = router; 