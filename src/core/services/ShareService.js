const { v4: uuidv4 } = require('uuid');
const shareRepository = require('../repositories/ShareRepository');
const { AppError } = require('../../utils/errorHandler');
const { logger } = require('../../utils/logger');
const { uploadFile, downloadFile, deleteFile } = require('../../infrastructure/storage');

class ShareService {
  async createTextShare(data) {
    try {
      // 处理过期时间
      let expiresAt = null;
      if (data.duration) {
        const duration = {
          '1h': 60 * 60 * 1000,
          '1d': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000
        };
        if (data.duration !== 'never' && duration[data.duration]) {
          expiresAt = new Date(Date.now() + duration[data.duration]).toISOString();
        }
      }

      // 处理最大访问次数
      const maxViews = parseInt(data.maxViews) || null;

      const shareId = uuidv4();
      const share = {
        id: shareId,
        type: 'text',
        content: data.content,
        s3_key: null,
        filename: data.filename || null,
        filesize: data.content ? Buffer.from(data.content).length : 0,
        mimetype: 'text/plain',
        password: data.password || null,
        maxViews: maxViews,
        expiresAt: expiresAt
      };

      await shareRepository.create(share);
      return { ...share, url: `/s/${shareId}` };
    } catch (error) {
      logger.error('创建文本分享失败:', error);
      throw new AppError('创建文本分享失败', 500);
    }
  }

  async createFileShare(data) {
    try {
      // 处理过期时间
      let expiresAt = null;
      if (data.duration) {
        const duration = {
          '1h': 60 * 60 * 1000,
          '1d': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000
        };
        if (data.duration !== 'never' && duration[data.duration]) {
          expiresAt = new Date(Date.now() + duration[data.duration]).toISOString();
        }
      }

      // 处理最大访问次数
      const maxViews = parseInt(data.maxViews) || null;

      // 生成唯一ID
      const shareId = uuidv4();

      // 上传文件到S3
      const s3Key = `files/${shareId}/${data.file.originalname}`;
      try {
        await uploadFile(s3Key, data.file.buffer, {
          contentType: data.file.mimetype || 'application/octet-stream'
        });
      } catch (error) {
        logger.error('上传文件到S3失败:', error);
        throw new AppError('文件上传失败', 500);
      }

      // 创建分享记录
      const share = {
        id: shareId,
        type: 'file',
        content: null,  // 文件内容存储在S3，这里不存储
        s3_key: s3Key,
        filename: data.file.originalname,
        filesize: data.file.size,
        mimetype: data.file.mimetype || 'application/octet-stream',
        password: data.password || null,
        maxViews: maxViews,
        expiresAt: expiresAt
      };

      try {
        await shareRepository.create(share);
      } catch (error) {
        // 如果数据库创建失败，删除已上传的S3文件
        try {
          await deleteFile(s3Key);
        } catch (deleteError) {
          logger.error('回滚S3文件失败:', deleteError);
        }
        throw error;
      }

      return { ...share, url: `/s/${shareId}` };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('创建文件分享失败:', error);
      throw new AppError('创建文件分享失败', 500);
    }
  }

  async getShare(id, password) {
    try {
      const share = await shareRepository.findById(id);
      
      if (!share) {
        throw new AppError('分享不存在', 404);
      }

      // 检查密码
      if (share.password && share.password !== password) {
        throw new AppError('密码错误', 401);
      }

      // 检查访问次数
      if (share.maxViews && share.views >= share.maxViews) {
        throw new AppError('分享已达到最大访问次数', 403);
      }

      // 检查过期时间
      if (share.expiresAt && new Date(share.expiresAt) <= new Date()) {
        throw new AppError('分享已过期', 403);
      }

      // 如果是文件类型，从S3获取文件内容
      if (share.type === 'file' && share.s3_key) {
        try {
          const fileData = await downloadFile(share.s3_key);
          share.content = fileData;
        } catch (error) {
          logger.error('从S3获取文件失败:', error);
          throw new AppError('获取文件失败', 500);
        }
      }

      // 增加访问次数
      await shareRepository.incrementViews(id);

      return { ...share, url: `/s/${id}` };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('获取分享失败:', error);
      throw new AppError('获取分享失败', 500);
    }
  }

  async updateShare(id, data) {
    try {
      const share = await shareRepository.findById(id);
      
      if (!share) {
        throw new AppError('分享不存在', 404);
      }

      // 如果是文件类型且有新文件上传
      if (share.type === 'file' && data.file) {
        // 1. 删除旧的S3文件
        if (share.s3_key) {
          try {
            await deleteFile(share.s3_key);
          } catch (error) {
            logger.error('删除旧S3文件失败:', error);
            // 继续执行，不影响新文件上传
          }
        }

        // 2. 上传新文件到S3
        const s3Key = `files/${share.id}/${data.file.originalname}`;
        await uploadFile(s3Key, data.file.buffer, {
          contentType: data.file.mimetype
        });

        // 3. 更新分享信息
        const updatedShare = {
          ...share,
          ...data,
          s3_key: s3Key,
          content: null,
          filename: data.file.originalname,
          filesize: data.file.size,
          mimetype: data.file.mimetype,
          id
        };

        await shareRepository.update(updatedShare);
        return updatedShare;
      } 
      // 如果是文本类型且内容有更新
      else if (share.type === 'text' && data.content) {
        const updatedShare = {
          ...share,
          ...data,
          s3_key: null,
          filesize: data.content ? Buffer.from(data.content).length : 0,
          id
        };

        await shareRepository.update(updatedShare);
        return updatedShare;
      }
      // 如果只是更新其他元数据（如密码、过期时间等）
      else {
        const updatedShare = {
          ...share,
          ...data,
          id
        };

        await shareRepository.update(updatedShare);
        return updatedShare;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('更新分享失败:', error);
      throw new AppError('更新分享失败', 500);
    }
  }

  async deleteShare(id) {
    try {
      const share = await shareRepository.findById(id);
      
      if (!share) {
        throw new AppError('分享不存在', 404);
      }

      // 如果是文件类型，先删除S3中的文件
      if (share.type === 'file' && share.s3_key) {
        try {
          await deleteFile(share.s3_key);
        } catch (error) {
          logger.error('删除S3文件失败:', error);
          throw new AppError('删除文件失败', 500);
        }
      }

      await shareRepository.delete(id);
    } catch (error) {
      logger.error('删除分享失败:', error);
      throw new AppError('删除分享失败', 500);
    }
  }

  async getShares() {
    try {
      const shares = await shareRepository.findAll();
      return shares;
    } catch (error) {
      logger.error('获取分享列表失败:', error);
      throw new AppError('获取分享列表失败', 500);
    }
  }

  async findAll(options = {}) {
    try {
      const shares = await shareRepository.findAll(options);
      return shares.map(share => ({
        ...share,
        url: `/s/${share.id}`
      }));
    } catch (error) {
      logger.error('查询分享列表失败:', error);
      throw new AppError('查询分享列表失败', 500);
    }
  }

  async getStats() {
    try {
      const stats = await shareRepository.getStats();
      return stats;
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      throw new AppError('获取统计信息失败', 500);
    }
  }

  async deleteExpired() {
    try {
      // 获取所有过期的分享
      const expiredShares = await shareRepository.findExpired();
      
      // 删除过期分享中的S3文件
      for (const share of expiredShares) {
        if (share.type === 'file' && share.s3_key) {
          try {
            await deleteFile(share.s3_key);
          } catch (error) {
            logger.error(`删除过期文件失败 (${share.s3_key}):`, error);
          }
        }
      }

      // 从数据库中删除过期分享
      const count = await shareRepository.deleteExpired();
      return count;
    } catch (error) {
      logger.error('删除过期分享失败:', error);
      throw new AppError('删除过期分享失败', 500);
    }
  }
}

module.exports = new ShareService(); 