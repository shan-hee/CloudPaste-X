const { getDb } = require('../../infrastructure/database');
const Share = require('../models/Share');
const { AppError } = require('../../utils/errorHandler');
const { logger } = require('../../utils/logger');

class ShareRepository {
  constructor() {
    this.db = getDb();
  }

  async create(share) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO shares (
          id, type, content, filename, password,
          max_views, views, created_at, expires_at,
          file_size, mime_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        share.id,
        share.type,
        share.content,
        share.filename,
        share.password,
        share.maxViews,
        share.views,
        share.createdAt,
        share.expiresAt,
        share.fileSize,
        share.mimeType,
        (err) => {
          if (err) {
            logger.error('创建分享失败:', err);
            reject(new AppError('创建分享失败', 500));
          } else {
            resolve(share);
          }
        }
      );
    });
  }

  async findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM shares WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) {
            logger.error('查询分享失败:', err);
            reject(new AppError('查询分享失败', 500));
          } else if (!row) {
            resolve(null);
          } else {
            resolve(new Share({
              id: row.id,
              type: row.type,
              content: row.content,
              filename: row.filename,
              password: row.password,
              maxViews: row.max_views,
              views: row.views,
              createdAt: row.created_at,
              expiresAt: row.expires_at,
              fileSize: row.file_size,
              mimeType: row.mime_type
            }));
          }
        }
      );
    });
  }

  async update(share) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE shares SET
          content = ?,
          filename = ?,
          password = ?,
          max_views = ?,
          views = ?,
          expires_at = ?,
          file_size = ?,
          mime_type = ?
        WHERE id = ?
      `);

      stmt.run(
        share.content,
        share.filename,
        share.password,
        share.maxViews,
        share.views,
        share.expiresAt,
        share.fileSize,
        share.mimeType,
        share.id,
        (err) => {
          if (err) {
            logger.error('更新分享失败:', err);
            reject(new AppError('更新分享失败', 500));
          } else {
            resolve(share);
          }
        }
      );
    });
  }

  async delete(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM shares WHERE id = ?`,
        [id],
        (err) => {
          if (err) {
            logger.error('删除分享失败:', err);
            reject(new AppError('删除分享失败', 500));
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  async findAll(options = {}) {
    const { type, limit = 100, offset = 0 } = options;
    
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM shares`;
      const params = [];

      if (type) {
        query += ` WHERE type = ?`;
        params.push(type);
      }

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      this.db.all(query, params, (err, rows) => {
        if (err) {
          logger.error('查询分享列表失败:', err);
          reject(new AppError('查询分享列表失败', 500));
        } else {
          const shares = rows.map(row => new Share({
            id: row.id,
            type: row.type,
            content: row.content,
            filename: row.filename,
            password: row.password,
            maxViews: row.max_views,
            views: row.views,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            fileSize: row.file_size,
            mimeType: row.mime_type
          }));
          resolve(shares);
        }
      });
    });
  }
}

module.exports = new ShareRepository(); 