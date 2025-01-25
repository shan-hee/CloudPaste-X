import express from 'express';
import bcrypt from 'bcrypt';
import { AppError } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import userRepository from '../../core/repositories/UserRepository.js';

const router = express.Router();

// 用户登录
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 验证用户名和密码
    if (!username || !password) {
      throw new AppError('用户名和密码不能为空', 400);
    }

    // 查找用户
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new AppError('用户名或密码错误', 401);
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('用户名或密码错误', 401);
    }

    // 创建会话
    const sessionId = await userRepository.createSession(user.id);

    // 设置 cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
    });

    res.json({
      success: true,
      data: {
        username: user.username,
        isAdmin: Boolean(user.is_admin),
        sessionId
      }
    });
  } catch (error) {
    logger.error('登录失败:', error);
    next(error);
  }
});

// 用户登出
router.post('/logout', async (req, res, next) => {
  try {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    if (sessionId) {
      await userRepository.deleteSession(sessionId);
    }
    res.clearCookie('sessionId');
    res.json({
      success: true,
      message: '已登出'
    });
  } catch (error) {
    logger.error('登出失败:', error);
    next(error);
  }
});

// 获取当前用户信息
router.get('/me', async (req, res, next) => {
  try {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    if (!sessionId) {
      throw new AppError('未登录', 401);
    }

    const session = await userRepository.validateSession(sessionId);
    if (!session) {
      throw new AppError('会话已过期', 401);
    }

    res.json({
      success: true,
      data: {
        username: session.username,
        isAdmin: Boolean(session.is_admin)
      }
    });
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    next(error);
  }
});

export default router; 