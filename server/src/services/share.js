import { dbUtils } from '../utils/db.js';
import { s3Utils } from '../utils/s3.js';
import { generateId, addDuration } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

export const shareService = {
  async getStats() {
    const stats = await dbUtils.getShareStats();
    const maxStorage = process.env.MAX_STORAGE_SIZE || 5368709120; // 5GB
    const usagePercent = ((stats.storage / maxStorage) * 100).toFixed(1);
    
    return {
      totalShares: stats.total,
      activeShares: stats.active,
      usedStorage: stats.storage,
      totalStorage: maxStorage,
      usagePercent: parseFloat(usagePercent)
    };
  },

  async listShares(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const shares = await dbUtils.listShares(offset, limit);
    const total = await dbUtils.getTotalShares();
    
    return {
      shares,
      pagination: {
        current: page,
        size: limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  async createShare(shareData) {
    const shareId = generateId();
    const { content, filename, password, expiresIn, maxViews } = shareData;
    
    const expiresAt = expiresIn ? addDuration(expiresIn) : null;
    
    const share = {
      id: shareId,
      content,
      filename: filename || 'untitled',
      password,
      expiresAt,
      maxViews: parseInt(maxViews) || 0,
      views: 0,
      createdAt: new Date()
    };

    await dbUtils.createShare(share);
    logger.info(`创建分享成功: ${shareId}`);
    
    return {
      id: shareId,
      expiresAt: share.expiresAt,
      maxViews: share.maxViews
    };
  },

  async getShare(id) {
    const share = await dbUtils.getShare(id);
    if (!share) return null;

    // 检查是否过期
    if (share.expiresAt && new Date() > share.expiresAt) {
      await this.deleteShare(id);
      return null;
    }

    // 检查访问次数
    if (share.maxViews > 0 && share.views >= share.maxViews) {
      await this.deleteShare(id);
      return null;
    }

    // 更新访问次数
    await dbUtils.incrementViews(id);
    logger.info(`访问分享: ${id}`);
    
    return share;
  },

  async verifyPassword(id, password) {
    const share = await dbUtils.getShare(id);
    if (!share) return null;

    if (share.password !== password) {
      logger.warn(`密码验证失败: ${id}`);
      return null;
    }

    return share;
  },

  async downloadShare(id) {
    const share = await this.getShare(id);
    if (!share) return null;

    if (share.isFile) {
      logger.info(`下载文件: ${id}, ${share.fileKey}`);
      return await s3Utils.getFile(share.fileKey);
    }

    return Buffer.from(share.content);
  },

  async deleteShare(id) {
    const share = await dbUtils.getShare(id);
    if (!share) return false;

    if (share.isFile && share.fileKey) {
      try {
        await s3Utils.deleteFile(share.fileKey);
      } catch (error) {
        logger.error(`删除文件失败: ${share.fileKey}`, error);
      }
    }

    await dbUtils.deleteShare(id);
    logger.info(`删除分享成功: ${id}`);
    return true;
  }
}; 