const express = require('express');
const multer = require('multer');
const shareService = require('../../core/services/ShareService');
const { validateTextShare, validateFileShare, validateShareAccess } = require('../middlewares/validator');
const limiter = require('../middlewares/rateLimit');
const { AppError } = require('../../utils/errorHandler');
const { logger } = require('../../utils/logger');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 默认5MB
  }
});

// 获取分享列表（需要认证）
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const shares = await shareService.getShares();
    res.json({
      success: true,
      data: shares
    });
  } catch (error) {
    logger.error('获取分享列表失败:', error);
    next(new AppError('获取分享列表失败', 500));
  }
});

// 获取分享统计（公开访问）
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await shareService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取统计信息失败:', error);
    next(new AppError('获取统计信息失败', 500));
  }
});

// 创建文本分享（公开访问）
router.post('/text', limiter.create, validateTextShare, async (req, res, next) => {
  try {
    const share = await shareService.createTextShare(req.body);
    res.status(201).json({
      success: true,
      data: share
    });
  } catch (error) {
    logger.error('创建文本分享失败:', error);
    next(new AppError('创建文本分享失败', 500));
  }
});

// 创建文件分享（公开访问）
router.post('/file', limiter.create, upload.single('file'), validateFileShare, async (req, res, next) => {
  try {
    const share = await shareService.createFileShare({
      file: req.file,
      ...req.body
    });
    res.status(201).json({
      success: true,
      data: share
    });
  } catch (error) {
    logger.error('创建文件分享失败:', error);
    next(new AppError('创建文件分享失败', 500));
  }
});

// 获取分享内容（公开访问）
router.get('/:id', limiter.access, validateShareAccess, async (req, res, next) => {
  try {
    const share = await shareService.getShare(req.params.id, req.headers['x-password']);
    res.json({
      success: true,
      data: share
    });
  } catch (error) {
    logger.error('获取分享失败:', error);
    next(new AppError('获取分享失败', 404));
  }
});

// 更新分享（需要认证）
router.put('/:id', authMiddleware, limiter.create, validateShareAccess, async (req, res, next) => {
  try {
    const share = await shareService.updateShare(req.params.id, req.body);
    res.json({
      success: true,
      data: share
    });
  } catch (error) {
    logger.error('更新分享失败:', error);
    next(new AppError('更新分享失败', 500));
  }
});

// 删除分享（需要认证）
router.delete('/:id', authMiddleware, limiter.create, validateShareAccess, async (req, res, next) => {
  try {
    await shareService.deleteShare(req.params.id);
    res.json({
      success: true,
      message: '分享已删除'
    });
  } catch (error) {
    logger.error('删除分享失败:', error);
    next(new AppError('删除分享失败', 500));
  }
});

// 获取分享列表（需要认证）
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { type, limit, offset } = req.query;
    const shares = await shareService.findAll({
      type,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    res.json({
      success: true,
      data: shares
    });
  } catch (error) {
    logger.error('获取分享列表失败:', error);
    next(new AppError('获取分享列表失败', 500));
  }
});

module.exports = router; 