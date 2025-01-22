const { getDb } = require('../../infrastructure/database');
const Share = require('../models/Share');
const { AppError } = require('../../utils/errorHandler');
const { logger } = require('../../utils/logger');

class ShareRepository {
  constructor() {
    // 移除构造函数中的数据库初始化
  }

  // 获取数据库连接的辅助方法
  _getDb() {
    return getDb();
  }

  async create(share) {
    try {
      const db = getDb();
      const result = await db.run(`
        INSERT INTO shares (
          id, type, content, filename, filesize, mimetype,
          password, max_views, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        share.id,
        share.type,
        share.content,
        share.filename,
        share.filesize,
        share.mimetype,
        share.password,
        share.maxViews,
        share.expiresAt
      ]);
      return result;
    } catch (error) {
      logger.error('创建分享失败:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const db = getDb();
      const share = await db.get('SELECT * FROM shares WHERE id = ?', [id]);
      if (share) {
        return {
          id: share.id,
          type: share.type,
          content: share.content,
          filename: share.filename,
          filesize: share.filesize,
          mimetype: share.mimetype,
          password: share.password,
          maxViews: share.max_views,
          views: share.views,
          createdAt: share.created_at,
          expiresAt: share.expires_at,
          url: share.url
        };
      }
      return null;
    } catch (error) {
      logger.error('查找分享失败:', error);
      throw error;
    }
  }

  async incrementViews(id) {
    try {
      const db = getDb();
      await db.run('UPDATE shares SET views = views + 1 WHERE id = ?', [id]);
    } catch (error) {
      logger.error('更新访问次数失败:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const db = getDb();
      await db.run('DELETE FROM shares WHERE id = ?', [id]);
    } catch (error) {
      logger.error('删除分享失败:', error);
      throw error;
    }
  }

  async deleteExpired() {
    try {
      const db = getDb();
      const result = await db.run(`
        DELETE FROM shares 
        WHERE (expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP)
        OR (max_views IS NOT NULL AND views >= max_views)
      `);
      return result.changes;
    } catch (error) {
      logger.error('删除过期分享失败:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const db = getDb();
      
      // 获取总分享数和有效分享数
      const shares = await db.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE 
            WHEN (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            AND (max_views IS NULL OR views < max_views)
            THEN 1 ELSE 0 END) as active
        FROM shares
      `);
      
      // 获取文本和文件分享数
      const typeStats = await db.get(`
        SELECT 
          SUM(CASE WHEN type = 'text' THEN 1 ELSE 0 END) as text,
          SUM(CASE WHEN type = 'file' THEN 1 ELSE 0 END) as file
        FROM shares
      `);

      // 获取存储空间使用情况
      const storage = await db.get(`
        SELECT 
          SUM(CASE WHEN type = 'file' THEN filesize ELSE 0 END) as used,
          COUNT(CASE WHEN type = 'file' THEN 1 END) as fileCount
        FROM shares
        WHERE (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        AND (max_views IS NULL OR views < max_views)
      `);

      // 计算存储空间使用百分比（假设总空间为 10GB）
      const totalSpace = 10 * 1024 * 1024 * 1024; // 10GB in bytes
      const usedSpace = storage.used || 0;
      const usagePercent = ((usedSpace / totalSpace) * 100).toFixed(2);

      return {
        total: shares.total || 0,
        active: shares.active || 0,
        text: typeStats.text || 0,
        file: typeStats.file || 0,
        storage: {
          used: usedSpace,
          total: totalSpace,
          percent: usagePercent
        }
      };
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      throw error;
    }
  }

  async update(share) {
    try {
      const db = getDb();
      await db.run(`
        UPDATE shares SET
          content = ?,
          filename = ?,
          filesize = ?,
          mimetype = ?,
          password = ?,
          max_views = ?,
          expires_at = ?
        WHERE id = ?
      `, [
        share.content,
        share.filename,
        share.filesize,
        share.mimetype,
        share.password,
        share.maxViews,
        share.expiresAt,
        share.id
      ]);
      return share;
    } catch (error) {
      logger.error('更新分享失败:', error);
      throw error;
    }
  }

  async findAll(options = {}) {
    try {
      const db = getDb();
      const shares = await db.all(`
        SELECT * FROM shares 
        ORDER BY created_at DESC
      `);
      
      return shares.map(share => ({
        id: share.id,
        type: share.type,
        content: share.content,
        filename: share.filename,
        filesize: share.filesize,
        mimetype: share.mimetype,
        password: share.password,
        maxViews: share.max_views,
        views: share.views,
        createdAt: share.created_at,
        expiresAt: share.expires_at,
        url: share.url
      }));
    } catch (error) {
      logger.error('获取分享列表失败:', error);
      throw error;
    }
  }
}

module.exports = new ShareRepository(); 