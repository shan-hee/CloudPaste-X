import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { logger } from './logger.js';

// 数据库连接
let db = null;

// 初始化数据库
async function initDB() {
  if (!db) {
    try {
      db = await open({
        filename: process.env.DATABASE_PATH || './data/db.sqlite',
        driver: sqlite3.Database
      });

      // 创建文件表
      await db.exec(`
        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          originalname TEXT,
          mimetype TEXT,
          size INTEGER,
          password TEXT,
          expiration DATETIME,
          max_views INTEGER DEFAULT 0,
          view_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      logger.info('数据库初始化成功');
    } catch (error) {
      logger.error('数据库初始化失败:', error);
      throw error;
    }
  }
  return db;
}

// 获取文件列表
async function listFiles(page = 1, limit = 10) {
  try {
    const db = await initDB();
    const offset = (page - 1) * limit;

    // 获取总数
    const countResult = await db.get('SELECT COUNT(*) as total FROM files');
    const total = countResult.total;

    // 获取文件列表
    const files = await db.all(`
      SELECT * FROM files 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    return {
      files,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('获取文件列表失败:', error);
    throw error;
  }
}

// 添加文件记录
async function addFile(fileData) {
  try {
    const db = await initDB();
    const { id, filename, originalname, mimetype, size, password, expiration, maxViews } = fileData;

    await db.run(`
      INSERT INTO files (
        id, filename, originalname, mimetype, size, 
        password, expiration, max_views
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, filename, originalname, mimetype, size, password, expiration, maxViews]);

    return { success: true };
  } catch (error) {
    logger.error('添加文件记录失败:', error);
    throw error;
  }
}

// 获取文件信息
async function getFile(id) {
  try {
    const db = await initDB();
    const file = await db.get('SELECT * FROM files WHERE id = ?', [id]);
    return file;
  } catch (error) {
    logger.error('获取文件信息失败:', error);
    throw error;
  }
}

// 更新文件访问次数
async function incrementViewCount(id) {
  try {
    const db = await initDB();
    await db.run('UPDATE files SET view_count = view_count + 1 WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    logger.error('更新文件访问次数失败:', error);
    throw error;
  }
}

// 删除文件记录
async function deleteFile(id) {
  try {
    const db = await initDB();
    await db.run('DELETE FROM files WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    logger.error('删除文件记录失败:', error);
    throw error;
  }
}

// 清理过期文件
async function cleanupExpiredFiles() {
  try {
    const db = await initDB();
    const now = new Date().toISOString();
    
    // 获取过期的文件列表
    const expiredFiles = await db.all(`
      SELECT id FROM files 
      WHERE (expiration IS NOT NULL AND expiration < ?) 
      OR (max_views > 0 AND view_count >= max_views)
    `, [now]);

    // 删除过期的文件记录
    if (expiredFiles.length > 0) {
      await db.run(`
        DELETE FROM files 
        WHERE (expiration IS NOT NULL AND expiration < ?) 
        OR (max_views > 0 AND view_count >= max_views)
      `, [now]);
      
      logger.info(`已清理 ${expiredFiles.length} 个过期文件`);
    }

    return expiredFiles;
  } catch (error) {
    logger.error('清理过期文件失败:', error);
    throw error;
  }
}

export {
  initDB,
  listFiles,
  addFile,
  getFile,
  incrementViewCount,
  deleteFile,
  cleanupExpiredFiles
}; 