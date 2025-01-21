const express = require('express');
const multer = require('multer');
const shareService = require('../../core/services/ShareService');
const { validateTextShare, validateFileShare, validateShareAccess } = require('../middlewares/validator');
const limiter = require('../middlewares/rateLimit');
const { AppError } = require('../../utils/errorHandler');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 默认5MB
  }
});

// 创建文本分享
router.post('/text',
  limiter.create,
  validateTextShare,
  async (req, res, next) => {
    try {
      const share = await shareService.createTextShare(req.body);
      res.status(201).json({
        success: true,
        data: share
      });
    } catch (error) {
      next(error);
    }
  }
);

// 创建文件分享
router.post('/file',
  limiter.create,
  upload.single('file'),
  validateFileShare,
  async (req, res, next) => {
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
      next(error);
    }
  }
);

// 获取分享内容
router.get('/:id',
  limiter.access,
  validateShareAccess,
  async (req, res, next) => {
    try {
      const share = await shareService.getShare(
        req.params.id,
        req.headers['x-password']
      );
      res.json({
        success: true,
        data: share
      });
    } catch (error) {
      next(error);
    }
  }
);

// 更新分享
router.put('/:id',
  limiter.create,
  validateShareAccess,
  async (req, res, next) => {
    try {
      const share = await shareService.updateShare(
        req.params.id,
        req.body
      );
      res.json({
        success: true,
        data: share
      });
    } catch (error) {
      next(error);
    }
  }
);

// 删除分享
router.delete('/:id',
  limiter.create,
  validateShareAccess,
  async (req, res, next) => {
    try {
      await shareService.deleteShare(req.params.id);
      res.json({
        success: true,
        message: '分享已删除'
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取分享列表
router.get('/',
  limiter.access,
  async (req, res, next) => {
    try {
      const { type, limit, offset } = req.query;
      const shares = await shareService.listShares({
        type,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      res.json({
        success: true,
        data: shares
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 