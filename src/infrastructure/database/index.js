import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { logger } from '../../utils/logger.js';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;

const setupDatabase = async () => {
  try {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'db.sqlite');
    const dbDir = path.dirname(dbPath);

    // 确保数据库目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`创建数据库目录: ${dbDir}`);
    }

    // 打开数据库连接
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    logger.info('数据库连接成功');

    // 初始化表（如果不存在）
    await initializeTables();
    logger.info('数据库表初始化完成');

    // 初始化默认设置和管理员账号（如果不存在）
    await initializeDefaultData();
    logger.info('默认数据初始化完成');

    return db;
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    throw error;
  }
};

const initializeTables = async () => {
  try {
    // 创建用户表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        is_admin INTEGER NOT NULL CHECK(is_admin IN (0, 1)) DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建会话表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // 创建分享表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('text', 'file')),
        content TEXT,
        s3_key TEXT,
        filename TEXT,
        filesize INTEGER,
        mimetype TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        password TEXT,
        views INTEGER DEFAULT 0,
        max_views INTEGER,
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // 创建设置表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text_upload_enabled INTEGER NOT NULL CHECK(text_upload_enabled IN (0, 1)) DEFAULT 1,
        file_upload_enabled INTEGER NOT NULL CHECK(file_upload_enabled IN (0, 1)) DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    logger.error('创建数据库表失败:', error);
    throw error;
  }
};

const initializeDefaultData = async () => {
  try {
    // 检查是否已存在设置
    const settings = await db.get('SELECT * FROM settings LIMIT 1');
    if (!settings) {
      // 插入默认设置
      await db.run(`
        INSERT INTO settings (
          text_upload_enabled,
          file_upload_enabled,
          updated_at
        ) VALUES (
          ?,
          ?,
          CURRENT_TIMESTAMP
        )
      `, [true, true]);
      logger.info('已插入默认设置');
    }

    // 检查是否已存在管理员用户
    const adminUser = await db.get('SELECT * FROM users WHERE is_admin = 1 LIMIT 1');
    if (!adminUser) {
      // 对默认密码进行加密
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      // 插入默认管理员用户
      await db.run(`
        INSERT INTO users (
          username,
          password,
          is_admin,
          created_at,
          updated_at
        ) VALUES (
          ?,
          ?,
          1,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `, ['admin', hashedPassword]);
      logger.info('已创建默认管理员用户 (admin/admin)');
    }
  } catch (error) {
    logger.error('初始化默认数据失败:', error);
    throw error;
  }
};

const getDb = () => {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  return db;
};

export { getDb, setupDatabase }; 