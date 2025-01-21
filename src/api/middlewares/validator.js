const { AppError } = require('../../utils/errorHandler');

const validateTextShare = (req, res, next) => {
  const { content, filename, password, duration, maxViews } = req.body;

  if (!content) {
    return next(new AppError('内容不能为空', 400));
  }

  if (content.length > 1024 * 1024) { // 1MB
    return next(new AppError('内容长度超过限制', 400));
  }

  if (duration && !['1h', '1d', '7d', '30d', 'never'].includes(duration)) {
    return next(new AppError('无效的过期时间', 400));
  }

  if (maxViews && (isNaN(maxViews) || maxViews < 0)) {
    return next(new AppError('无效的访问次数限制', 400));
  }

  next();
};

const validateFileShare = (req, res, next) => {
  const { filename, password, duration, maxViews } = req.body;
  const file = req.file;

  if (!file) {
    return next(new AppError('未找到上传的文件', 400));
  }

  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [];
  if (allowedTypes.length > 0 && !allowedTypes.some(type => {
    const pattern = new RegExp(type.replace('*', '.*'));
    return pattern.test(file.mimetype);
  })) {
    return next(new AppError('不支持的文件类型', 400));
  }

  if (duration && !['1h', '1d', '7d', '30d', 'never'].includes(duration)) {
    return next(new AppError('无效的过期时间', 400));
  }

  if (maxViews && (isNaN(maxViews) || maxViews < 0)) {
    return next(new AppError('无效的访问次数限制', 400));
  }

  next();
};

const validateShareAccess = (req, res, next) => {
  const { password } = req.body;
  const { id } = req.params;

  if (!id) {
    return next(new AppError('分享ID不能为空', 400));
  }

  next();
};

module.exports = {
  validateTextShare,
  validateFileShare,
  validateShareAccess
}; 