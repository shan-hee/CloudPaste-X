import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { logger } from './logger.js';

let db;

async function initializeDB() {
  if (!db) {
    db = await open({
      filename: process.env.DATABASE_PATH || ':memory:',
      driver: sqlite3.Database
    });

    await createTables();
  }
  return db;
}

async function createTables() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      content TEXT,
      filename TEXT,
      password TEXT,
      expires_at DATETIME,
      max_views INTEGER,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_file BOOLEAN DEFAULT 0,
      file_key TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_shares_expires_at ON shares(expires_at);
    CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares(created_at);
  `);
}

export const dbUtils = {
  async getShare(id) {
    const db = await initializeDB();
    return await db.get('SELECT * FROM shares WHERE id = ?', id);
  },

  async listShares(offset = 0, limit = 10) {
    const db = await initializeDB();
    return await db.all(`
      SELECT id, filename, created_at, expires_at, max_views, views, is_file
      FROM shares
      WHERE (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
  },

  async getTotalShares() {
    const db = await initializeDB();
    const result = await db.get('SELECT COUNT(*) as count FROM shares');
    return result.count;
  },

  async createShare(share) {
    const db = await initializeDB();
    const { id, content, filename, password, expiresAt, maxViews, isFile, fileKey } = share;
    
    await db.run(
      `INSERT INTO shares (id, content, filename, password, expires_at, max_views, is_file, file_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, content, filename, password, expiresAt, maxViews, isFile ? 1 : 0, fileKey]
    );
  },

  async deleteShare(id) {
    const db = await initializeDB();
    await db.run('DELETE FROM shares WHERE id = ?', id);
  },

  async incrementViews(id) {
    const db = await initializeDB();
    await db.run('UPDATE shares SET views = views + 1 WHERE id = ?', id);
  },

  async getShareStats() {
    const db = await initializeDB();
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP OR expires_at IS NULL THEN 1 END) as active,
        SUM(LENGTH(content)) as storage
      FROM shares
    `);
    return stats;
  },

  async cleanup() {
    const db = await initializeDB();
    const result = await db.run(`
      DELETE FROM shares 
      WHERE (expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP)
         OR (max_views > 0 AND views >= max_views)
    `);
    logger.info(`清理过期分享: ${result.changes} 条记录被删除`);
  }
}; 