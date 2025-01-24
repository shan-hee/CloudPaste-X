import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || './data/db.sqlite';

// 数据库版本
const DB_VERSION = 1;

async function createMigrationTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL,
      name TEXT NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getCurrentVersion(db) {
  const result = await db.get('SELECT MAX(version) as version FROM migrations');
  return result?.version || 0;
}

async function recordMigration(db, version, name) {
  await db.run(
    'INSERT INTO migrations (version, name) VALUES (?, ?)',
    [version, name]
  );
}

async function createTables(db) {
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

  // 创建设置表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text_upload_enabled INTEGER NOT NULL CHECK(text_upload_enabled IN (0, 1)) DEFAULT 1,
      file_upload_enabled INTEGER NOT NULL CHECK(file_upload_enabled IN (0, 1)) DEFAULT 1,
      max_file_size INTEGER DEFAULT 5368709120,
      storage_quota INTEGER DEFAULT 10737418240,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function migrateSharesTable(db) {
  // 1. 创建临时表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shares_new (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('text', 'file')),
      content TEXT,
      s3_key TEXT,
      filename TEXT,
      originalname TEXT,
      filesize INTEGER,
      mimetype TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      password TEXT,
      views INTEGER DEFAULT 0,
      max_views INTEGER,
      user_id INTEGER,
      status TEXT CHECK(status IN ('active', 'expired', 'deleted')) DEFAULT 'active',
      last_accessed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // 2. 检查原表是否存在
  const tableExists = await db.get(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='shares'
  `);

  if (tableExists) {
    // 3. 获取原表的列信息
    const columns = await db.all(`PRAGMA table_info(shares)`);
    const columnNames = columns.map(col => col.name);

    // 4. 构建迁移SQL
    const commonColumns = [
      'id',
      'type',
      'content',
      'filename',
      'originalname',
      'created_at',
      'expires_at',
      'password',
      'views',
      'max_views',
      'user_id'
    ].filter(col => columnNames.includes(col));

    // 5. 迁移数据
    await db.exec(`
      INSERT INTO shares_new (${commonColumns.join(', ')})
      SELECT ${commonColumns.join(', ')}
      FROM shares
    `);

    // 6. 更新文件类型记录
    await db.exec(`
      UPDATE shares_new
      SET 
        type = CASE 
          WHEN type IS NULL THEN 
            CASE 
              WHEN content LIKE 'data:%' OR content LIKE '%base64%' THEN 'file'
              ELSE 'text'
            END
          ELSE type
        END,
        mimetype = CASE 
          WHEN type = 'file' THEN 'application/octet-stream'
          WHEN type = 'text' THEN 'text/plain'
          ELSE NULL
        END,
        filesize = CASE 
          WHEN type = 'text' THEN length(content)
          ELSE NULL
        END,
        originalname = CASE
          WHEN type = 'file' AND originalname IS NULL THEN filename
          ELSE originalname
        END,
        status = CASE
          WHEN expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP THEN 'expired'
          WHEN max_views IS NOT NULL AND views >= max_views THEN 'expired'
          ELSE 'active'
        END,
        last_accessed_at = CASE
          WHEN views > 0 THEN CURRENT_TIMESTAMP
          ELSE NULL
        END
    `);

    // 7. 删除原表并重命名新表
    await db.exec('DROP TABLE shares');
    await db.exec('ALTER TABLE shares_new RENAME TO shares');

    console.log('数据迁移完成');
  } else {
    // 如果原表不存在，直接重命名新表
    await db.exec('ALTER TABLE shares_new RENAME TO shares');
    console.log('创建新表完成');
  }

  // 8. 创建索引
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_shares_type ON shares(type);
    CREATE INDEX IF NOT EXISTS idx_shares_status ON shares(status);
    CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares(created_at);
    CREATE INDEX IF NOT EXISTS idx_shares_expires_at ON shares(expires_at);
    CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);
    CREATE INDEX IF NOT EXISTS idx_shares_last_accessed ON shares(last_accessed_at);
  `);
}

async function migrate() {
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // 开始事务
    await db.run('BEGIN TRANSACTION');

    try {
      // 创建迁移表
      await createMigrationTable(db);
      
      // 获取当前版本
      const currentVersion = await getCurrentVersion(db);
      
      if (currentVersion < DB_VERSION) {
        console.log(`开始迁移数据库从版本 ${currentVersion} 到 ${DB_VERSION}`);
        
        // 创建基础表
        await createTables(db);
        
        // 迁移shares表
        await migrateSharesTable(db);
        
        // 记录迁移
        await recordMigration(db, DB_VERSION, 'Initial migration');
        
        console.log('数据库迁移成功！');
      } else {
        console.log('数据库已是最新版本');
      }

      // 提交事务
      await db.run('COMMIT');

    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      throw error;
    }

    await db.close();
  } catch (error) {
    console.error('数据库迁移失败：', error);
    process.exit(1);
  }
}

migrate(); 