const { v4: uuidv4 } = require('uuid');
const shareRepository = require('../repositories/ShareRepository');
const { AppError } = require('../../utils/errorHandler');
const { logger } = require('../../utils/logger');

class ShareService {
  async createTextShare(data) {
    try {
      // 处理过期时间
      let expiresAt = null;
      if (data.duration) {
        const duration = {
          '1h': 60 * 60 * 1000,
          '1d': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000
        };
        if (data.duration !== 'never' && duration[data.duration]) {
          expiresAt = new Date(Date.now() + duration[data.duration]).toISOString();
        }
      }

      // 处理最大访问次数
      const maxViews = parseInt(data.maxViews) || null;

      const shareId = uuidv4();
      const share = {
        id: shareId,
        type: 'text',
        content: data.content,
        filename: data.filename || null,
        filesize: null,
        mimetype: 'text/plain',
        password: data.password || null,
        maxViews: maxViews,
        expiresAt: expiresAt
      };

      await shareRepository.create(share);
      return { ...share, url: `/s/${shareId}` };
    } catch (error) {
      logger.error('创建文本分享失败:', error);
      throw new AppError('创建文本分享失败', 500);
    }
  }

  async createFileShare(data) {
    try {
      // 处理过期时间
      let expiresAt = null;
      if (data.duration) {
        const duration = {
          '1h': 60 * 60 * 1000,
          '1d': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000
        };
        if (data.duration !== 'never' && duration[data.duration]) {
          expiresAt = new Date(Date.now() + duration[data.duration]).toISOString();
        }
      }

      // 处理最大访问次数
      const maxViews = parseInt(data.maxViews) || null;

      const shareId = uuidv4();
      const share = {
        id: shareId,
        type: 'file',
        content: data.file.buffer.toString('base64'),
        filename: data.file.originalname || null,
        filesize: data.file.size || null,
        mimetype: data.file.mimetype || 'application/octet-stream',
        password: data.password || null,
        maxViews: maxViews,
        expiresAt: expiresAt
      };

      await shareRepository.create(share);
      return { ...share, url: `/s/${shareId}` };
    } catch (error) {
      logger.error('创建文件分享失败:', error);
      throw new AppError('创建文件分享失败', 500);
    }
  }

  async getShare(id, password) {
    try {
      const share = await shareRepository.findById(id);
      
      if (!share) {
        throw new AppError('分享不存在', 404);
      }

      // 检查密码
      if (share.password && share.password !== password) {
        throw new AppError('密码错误', 401);
      }

      // 检查访问次数
      if (share.maxViews && share.views >= share.maxViews) {
        throw new AppError('分享已达到最大访问次数', 403);
      }

      // 检查过期时间
      if (share.expiresAt && new Date(share.expiresAt) <= new Date()) {
        throw new AppError('分享已过期', 403);
      }

      // 增加访问次数
      await shareRepository.incrementViews(id);

      return { ...share, url: `/s/${id}` };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('获取分享失败:', error);
      throw new AppError('获取分享失败', 500);
    }
  }

  async updateShare(id, data) {
    try {
      const share = await shareRepository.findById(id);
      
      if (!share) {
        throw new AppError('分享不存在', 404);
      }

      const updatedShare = {
        ...share,
        ...data,
        id
      };

      await shareRepository.update(updatedShare);
      return updatedShare;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('更新分享失败:', error);
      throw new AppError('更新分享失败', 500);
    }
  }

  async deleteShare(id) {
    try {
      const share = await shareRepository.findById(id);
      
      if (!share) {
        throw new AppError('分享不存在', 404);
      }

      await shareRepository.delete(id);
    } catch (error) {
      logger.error('删除分享失败:', error);
      throw new AppError('删除分享失败', 500);
    }
  }

  async getShares() {
    try {
      const shares = await shareRepository.findAll();
      return shares;
    } catch (error) {
      logger.error('获取分享列表失败:', error);
      throw new AppError('获取分享列表失败', 500);
    }
  }

  async findAll(options = {}) {
    try {
      const shares = await shareRepository.findAll(options);
      return shares.map(share => ({
        ...share,
        url: `/s/${share.id}`
      }));
    } catch (error) {
      logger.error('查询分享列表失败:', error);
      throw new AppError('查询分享列表失败', 500);
    }
  }

  async getStats() {
    try {
      const stats = await shareRepository.getStats();
      return stats;
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      throw new AppError('获取统计信息失败', 500);
    }
  }

  async deleteExpired() {
    try {
      const count = await shareRepository.deleteExpired();
      return count;
    } catch (error) {
      logger.error('删除过期分享失败:', error);
      throw new AppError('删除过期分享失败', 500);
    }
  }
}

module.exports = new ShareService(); 