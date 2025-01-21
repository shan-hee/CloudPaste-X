import { logger } from '../utils/logger.js';

// 管理员登录
async function login(req, res) {
  try {
    const { username, password } = req.body;
    
    logger.info('尝试登录:', { 
      username,
      receivedPassword: password ? '***' : 'undefined',
      body: req.body
    });

    logger.debug('环境变量:', {
      ADMIN_USER: process.env.ADMIN_USER,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? '***' : 'undefined',
      NODE_ENV: process.env.NODE_ENV
    });

    // 检查是否提供了用户名和密码
    if (!username || !password) {
      logger.warn('登录失败: 未提供用户名或密码');
      return res.status(400).json({
        success: false,
        message: '请提供用户名和密码'
      });
    }

    // 验证用户名和密码
    const isValidUsername = username === process.env.ADMIN_USER;
    const isValidPassword = password === process.env.ADMIN_PASSWORD;

    logger.debug('验证结果:', {
      isValidUsername,
      isValidPassword,
      providedUsername: username,
      expectedUsername: process.env.ADMIN_USER
    });

    if (!isValidUsername || !isValidPassword) {
      logger.warn('登录失败: 用户名或密码错误', {
        username,
        isValidUsername,
        isValidPassword
      });
      
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成会话ID
    const sessionId = process.env.ADMIN_TOKEN;

    // 设置会话
    req.session.isAdmin = true;
    req.session.username = username;

    logger.info('登录成功:', { 
      username,
      sessionId: sessionId ? '***' : 'undefined'
    });

    res.json({
      success: true,
      data: {
        sessionId,
        username
      }
    });
  } catch (error) {
    logger.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败'
    });
  }
}

// 检查会话状态
async function checkSession(req, res) {
  try {
    const sessionId = req.headers['x-session-id'];
    logger.debug('检查会话:', { 
      sessionId: sessionId ? '***' : 'undefined',
      expectedSessionId: process.env.ADMIN_TOKEN ? '***' : 'undefined'
    });

    if (!sessionId || sessionId !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({
        success: false,
        message: '会话无效或已过期'
      });
    }

    res.json({
      success: true,
      message: '会话有效'
    });
  } catch (error) {
    logger.error('检查会话状态失败:', error);
    res.status(500).json({
      success: false,
      message: '检查会话状态失败'
    });
  }
}

// 退出登录
async function logout(req, res) {
  try {
    const username = req.session.username;
    logger.info('用户退出登录:', { username });

    // 清除会话
    req.session.destroy();

    res.json({
      success: true,
      message: '已退出登录'
    });
  } catch (error) {
    logger.error('退出登录失败:', error);
    res.status(500).json({
      success: false,
      message: '退出登录失败'
    });
  }
}

// 获取系统设置
async function getSettings(req, res) {
  try {
    res.json({
      success: true,
      data: {
        textUploadEnabled: true,
        fileUploadEnabled: true
      }
    });
  } catch (error) {
    logger.error('获取设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取设置失败'
    });
  }
}

// 更新系统设置
async function updateSettings(req, res) {
  try {
    const { textUploadEnabled, fileUploadEnabled } = req.body;
    
    // 这里可以添加保存设置到数据库的逻辑
    logger.info('更新系统设置:', { textUploadEnabled, fileUploadEnabled });

    res.json({
      success: true,
      message: '设置已更新'
    });
  } catch (error) {
    logger.error('更新设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新设置失败'
    });
  }
}

export {
  login,
  checkSession,
  logout,
  getSettings,
  updateSettings
}; 