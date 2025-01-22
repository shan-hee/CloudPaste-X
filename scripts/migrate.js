import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || './data/db.sqlite';

async function migrate() {
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // 创建分享表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        content TEXT,
        type TEXT,
        password TEXT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        views INTEGER DEFAULT 0,
        max_views INTEGER
      );
    `);

    console.log('数据库迁移成功！');
    await db.close();
  } catch (error) {
    console.error('数据库迁移失败：', error);
    process.exit(1);
  }
}

migrate(); 