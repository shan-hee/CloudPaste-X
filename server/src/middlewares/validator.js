import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

export const validateShare = [
  body('content')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('内容不能为空'),
  
  body('filename')
    .optional()
    .isString()
    .trim()
    .matches(/^[a-zA-Z0-9-_\.]+$/)
    .withMessage('文件名只能包含字母、数字、下划线和连字符'),
  
  body('password')
    .optional()
    .isString()
    .isLength({ min: 4 })
    .withMessage('密码至少需要4个字符'),
  
  body('expiresIn')
    .optional()
    .matches(/^\d+[mhdw]$/)
    .withMessage('过期时间格式无效，例：30m, 12h, 7d, 1w'),
  
  body('maxViews')
    .optional()
    .isInt({ min: 1 })
    .withMessage('最大访问次数必须大于0'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('验证失败:', errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

export const validateFile = [
  body('file')
    .custom((value, { req }) => {
      if (!req.file) {
        throw new Error('请选择要上传的文件');
      }
      return true;
    }),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('文件验证失败:', errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
]; 