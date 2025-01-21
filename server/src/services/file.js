import { logger } from '../utils/logger.js';
import * as dbUtils from '../utils/dbUtils.js';
import * as s3Utils from '../utils/s3Utils.js';
import { generateId, addDuration, sanitizeFilename } from '../utils/helpers.js';

// 获取文件列表
async function listFiles(page = 1, limit = 10) {
  try {
    const result = await dbUtils.listFiles(page, limit);
    return result;
  } catch (error) {
    logger.error('获取文件列表失败:', error);
    throw error;
  }
}

// 上传文件
async function uploadFile(file, options = {}) {
  try {
    const { id, url } = await s3Utils.uploadFile(file);
    
    // 保存文件记录到数据库
    await dbUtils.addFile({
      id,
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      password: options.password,
      expiration: options.expiration,
      maxViews: options.maxViews
    });

    return {
      id,
      url,
      filename: file.filename,
      originalname: file.originalname
    };
  } catch (error) {
    logger.error('上传文件失败:', error);
    throw error;
  }
}

// 获取文件
async function getFile(id) {
  try {
    const file = await dbUtils.getFile(id);
    if (!file) {
      throw new Error('文件不存在');
    }

    // 更新访问次数
    await dbUtils.incrementViewCount(id);

    // 检查是否超过最大访问次数
    if (file.max_views > 0 && file.view_count >= file.max_views) {
      throw new Error('文件已达到最大访问次数');
    }

    // 检查是否过期
    if (file.expiration && new Date(file.expiration) < new Date()) {
      throw new Error('文件已过期');
    }

    // 获取文件访问URL
    const url = await s3Utils.getFileUrl(id);
    return { ...file, url };
  } catch (error) {
    logger.error('获取文件失败:', error);
    throw error;
  }
}

// 删除文件
async function deleteFile(id) {
  try {
    // 先从S3删除文件
    await s3Utils.deleteFile(id);
    
    // 再从数据库删除记录
    await dbUtils.deleteFile(id);
    
    return { success: true };
  } catch (error) {
    logger.error('删除文件失败:', error);
    throw error;
  }
}

// 清理过期文件
async function cleanupExpiredFiles() {
  try {
    const expiredFiles = await dbUtils.cleanupExpiredFiles();
    
    // 从S3删除过期文件
    for (const file of expiredFiles) {
      try {
        await s3Utils.deleteFile(file.id);
      } catch (error) {
        logger.error(`删除过期文件 ${file.id} 失败:`, error);
      }
    }

    return expiredFiles;
  } catch (error) {
    logger.error('清理过期文件失败:', error);
    throw error;
  }
}

export {
  listFiles,
  uploadFile,
  getFile,
  deleteFile,
  cleanupExpiredFiles
}; 