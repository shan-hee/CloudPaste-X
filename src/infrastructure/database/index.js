import { Sequelize } from 'sequelize';
import logger from '../../utils/logger.js';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_PATH || './data/db.sqlite',
  logging: false
});

async function initDatabase() {
  try {
    // 测试连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步数据库结构
    await sequelize.sync({ force: true });
    logger.info('数据库表初始化完成');

    // 插入默认设置
    await sequelize.models.Setting?.bulkCreate([
      { key: 'maxFileSize', value: process.env.MAX_FILE_SIZE || '5' },
      { key: 'totalStorageGB', value: process.env.TOTAL_STORAGE_GB || '10' }
    ]);
    logger.info('已插入默认设置');

    // 创建默认管理员
    await sequelize.models.User?.create({
      username: process.env.ADMIN_USER || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin',
      role: 'admin'
    });
    logger.info('已创建默认管理员用户 (admin/admin)');

    logger.info('默认数据初始化完成');
    logger.info('数据库初始化完成');
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    throw error;
  }
}

export { sequelize, initDatabase }; 