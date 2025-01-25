import express from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.js';
import userRepository from '../../core/repositories/UserRepository.js';
import shareRepository from '../../core/repositories/ShareRepository.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// 管理员登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 从数据库获取用户信息
    const user = await userRepository.findByUsername(username);
    
    // 验证用户是否存在且是管理员
    if (!user || !user.is_admin) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 创建会话
    const sessionId = await userRepository.createSession(user.id);
    
    // 设置会话cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
    });
    
    res.json({
      success: true,
      data: {
        sessionId,
        username: user.username,
        isAdmin: Boolean(user.is_admin)
      }
    });
  } catch (error) {
    console.error('管理员登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败'
    });
  }
});

// 获取当前会话状态
router.get('/session', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        username: req.user.username,
        isAdmin: req.user.isAdmin
      }
    });
  } catch (error) {
    console.error('获取会话状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取会话状态失败'
    });
  }
});

// 登出
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await userRepository.deleteSession(req.sessionId);
    res.clearCookie('sessionId');
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出失败:', error);
    res.status(500).json({
      success: false,
      message: '登出失败'
    });
  }
});

// 获取上传设置 - 公开访问
router.get('/settings', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        textUploadEnabled: true,
        fileUploadEnabled: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取设置失败'
    });
  }
});

// 更新上传设置 - 需要管理员权限
router.post('/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { textUploadEnabled, fileUploadEnabled } = req.body;
    // 这里可以添加保存设置到数据库的逻辑
    res.json({
      success: true,
      data: {
        textUploadEnabled,
        fileUploadEnabled
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新设置失败'
    });
  }
});

// 获取统计信息
router.get('/stats', async (req, res) => {
  try {
    const stats = await shareRepository.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败'
    });
  }
});

export default router; 