const crypto = require('crypto');
const Share = require('../models/Share');
const shareRepository = require('../repositories/ShareRepository');
const { uploadFile, downloadFile, deleteFile } = require('../../infrastructure/storage');
const { AppError } = require('../../utils/errorHandler');
const { logger } = require('../../utils/logger');

class ShareService {
  async createTextShare({ content, filename, password, duration, maxViews }) {
    const id = crypto.randomUUID();
    let expiresAt = null;

    // 计算过期时间
    if (duration) {
      const durations = {
        '1h': 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      
      if (durations[duration]) {
        expiresAt = Date.now() + durations[duration];
      }
    }

    const share = new Share({
      id,
      type: 'text',
      content,
      filename: filename || 'untitled.txt',
      password,
      maxViews: parseInt(maxViews) || 0,
      expiresAt
    });

    await shareRepository.create(share);
    logger.info('文本分享创建成功:', { id });

    return share;
  }

  async createFileShare({ file, filename, password, duration, maxViews }) {
    const id = crypto.randomUUID();
    let expiresAt = null;

    // 验证文件大小
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 默认5MB
    if (file.size > maxSize) {
      throw new AppError(`文件大小超过限制 (${maxSize / 1024 / 1024}MB)`, 400);
    }

    // 计算过期时间
    if (duration) {
      const durations = {
        '1h': 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      
      if (durations[duration]) {
        expiresAt = Date.now() + durations[duration];
      }
    }

    // 上传文件到存储服务
    await uploadFile(id, file.buffer, {
      contentType: file.mimetype
    });

    const share = new Share({
      id,
      type: 'file',
      filename: filename || file.originalname,
      password,
      maxViews: parseInt(maxViews) || 0,
      expiresAt,
      fileSize: file.size,
      mimeType: file.mimetype
    });

    await shareRepository.create(share);
    logger.info('文件分享创建成功:', { id });

    return share;
  }

  async getShare(id, password) {
    const share = await shareRepository.findById(id);
    
    if (!share) {
      throw new AppError('分享不存在', 404);
    }

    // 检查过期
    if (share.isExpired()) {
      await this.deleteShare(id);
      throw new AppError('分享已过期', 410);
    }

    // 检查访问次数
    if (share.hasReachedMaxViews()) {
      await this.deleteShare(id);
      throw new AppError('分享已达到最大访问次数', 410);
    }

    // 验证密码
    if (share.isPasswordProtected() && !share.validatePassword(password)) {
      throw new AppError('密码错误', 403);
    }

    // 如果是文件类型，获取文件内容
    if (share.type === 'file') {
      try {
        const fileData = await downloadFile(id);
        share.content = fileData;
      } catch (error) {
        logger.error('获取文件内容失败:', error);
        throw new AppError('获取文件内容失败', 500);
      }
    }

    // 更新访问次数
    share.incrementViews();
    await shareRepository.update(share);

    return share;
  }

  async updateShare(id, { content, filename, password, duration, maxViews }) {
    const share = await shareRepository.findById(id);
    
    if (!share) {
      throw new AppError('分享不存在', 404);
    }

    // 更新字段
    if (content !== undefined) share.content = content;
    if (filename !== undefined) share.filename = filename;
    if (password !== undefined) share.password = password;
    if (maxViews !== undefined) share.maxViews = parseInt(maxViews);

    // 更新过期时间
    if (duration) {
      const durations = {
        '1h': 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      
      if (durations[duration]) {
        share.expiresAt = Date.now() + durations[duration];
      }
    }

    await shareRepository.update(share);
    logger.info('分享更新成功:', { id });

    return share;
  }

  async deleteShare(id) {
    const share = await shareRepository.findById(id);
    
    if (!share) {
      throw new AppError('分享不存在', 404);
    }

    // 如果是文件类型，删除存储的文件
    if (share.type === 'file') {
      try {
        await deleteFile(id);
      } catch (error) {
        logger.error('删除文件失败:', error);
        // 继续删除数据库记录
      }
    }

    await shareRepository.delete(id);
    logger.info('分享删除成功:', { id });

    return true;
  }

  async listShares(options = {}) {
    return shareRepository.findAll(options);
  }
}

module.exports = new ShareService(); 