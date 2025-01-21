const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { logger } = require('../../utils/logger');

let db;

const setupDatabase = () => {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'db.sqlite');
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      logger.error('数据库连接失败:', err);
      process.exit(1);
    }
    logger.info('数据库连接成功');
    initializeTables();
  });
};

const initializeTables = () => {
  db.serialize(() => {
    // 创建分享表
    db.run(`
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT,
        filename TEXT,
        password TEXT,
        max_views INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        file_size INTEGER,
        mime_type TEXT
      )
    `);

    // 创建设置表
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  });
};

const getDb = () => db;

module.exports = {
  setupDatabase,
  getDb
}; 