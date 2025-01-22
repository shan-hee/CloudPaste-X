import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/cloudpaste.db');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
        process.exit(1);
    }
    console.log('已连接到 SQLite 数据库');
});

// 创建必要的表
db.serialize(() => {
    // 创建 pastes 表
    db.run(`CREATE TABLE IF NOT EXISTS pastes (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        title TEXT,
        language TEXT,
        password TEXT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        views INTEGER DEFAULT 0,
        max_views INTEGER,
        is_file BOOLEAN DEFAULT 0,
        file_path TEXT,
        file_type TEXT,
        file_size INTEGER
    )`, (err) => {
        if (err) {
            console.error('创建 pastes 表失败:', err.message);
        } else {
            console.log('pastes 表创建成功或已存在');
        }
    });

    // 创建 settings 表
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('创建 settings 表失败:', err.message);
        } else {
            console.log('settings 表创建成功或已存在');
        }
    });

    // 完成后关闭数据库连接
    db.close((err) => {
        if (err) {
            console.error('关闭数据库连接失败:', err.message);
        } else {
            console.log('数据库迁移完成');
        }
    });
}); 