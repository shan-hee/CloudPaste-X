import { shareService } from '../services/share.js';
import { logger } from '../utils/logger.js';

export const shareController = {
  async getStats(req, res) {
    try {
      const stats = await shareService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      res.status(500).json({ success: false, message: '获取统计信息失败' });
    }
  },

  async listShares(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const shares = await shareService.listShares(parseInt(page), parseInt(limit));
      res.json({ success: true, data: shares });
    } catch (error) {
      logger.error('获取分享列表失败:', error);
      res.status(500).json({ success: false, message: '获取分享列表失败' });
    }
  },

  async createShare(req, res) {
    try {
      const shareData = req.body;
      const share = await shareService.createShare(shareData);
      res.json({ success: true, data: share });
    } catch (error) {
      logger.error('创建分享失败:', error);
      res.status(500).json({ success: false, message: '创建分享失败' });
    }
  },

  async getShare(req, res) {
    try {
      const { id } = req.params;
      const share = await shareService.getShare(id);
      if (!share) {
        return res.status(404).json({ success: false, message: '分享不存在或已过期' });
      }
      res.json({ success: true, data: share });
    } catch (error) {
      logger.error('获取分享失败:', error);
      res.status(500).json({ success: false, message: '获取分享失败' });
    }
  },

  async verifyPassword(req, res) {
    try {
      const { id } = req.params;
      const { password } = req.body;
      const share = await shareService.verifyPassword(id, password);
      if (!share) {
        return res.status(403).json({ success: false, message: '密码错误' });
      }
      res.json({ success: true, data: share });
    } catch (error) {
      logger.error('验证密码失败:', error);
      res.status(500).json({ success: false, message: '验证密码失败' });
    }
  },

  async downloadShare(req, res) {
    try {
      const { id } = req.params;
      const fileStream = await shareService.downloadShare(id);
      if (!fileStream) {
        return res.status(404).json({ success: false, message: '文件不存在或已过期' });
      }
      fileStream.pipe(res);
    } catch (error) {
      logger.error('下载文件失败:', error);
      res.status(500).json({ success: false, message: '下载文件失败' });
    }
  },

  async deleteShare(req, res) {
    try {
      const { id } = req.params;
      const result = await shareService.deleteShare(id);
      if (!result) {
        return res.status(404).json({ success: false, message: '分享不存在或已删除' });
      }
      res.json({ success: true, message: '分享已成功删除' });
    } catch (error) {
      logger.error('删除分享失败:', error);
      res.status(500).json({ success: false, message: '删除分享失败' });
    }
  }
}; 