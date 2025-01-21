import { logger } from '../utils/logger.js';
import * as fileService from '../services/file.js';

// 获取文件列表
async function listFiles(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await fileService.listFiles(page, limit);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取文件列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取文件列表失败'
    });
  }
}

// 上传文件
async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    const options = {
      password: req.body.password,
      expiration: req.body.expiration,
      maxViews: parseInt(req.body.maxViews) || 0
    };

    const result = await fileService.uploadFile(req.file, options);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('上传文件失败:', error);
    res.status(500).json({
      success: false,
      message: '上传文件失败'
    });
  }
}

// 获取文件
async function getFile(req, res) {
  try {
    const { id } = req.params;
    const file = await fileService.getFile(id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    logger.error('获取文件失败:', error);
    res.status(500).json({
      success: false,
      message: '获取文件失败'
    });
  }
}

// 删除文件
async function deleteFile(req, res) {
  try {
    const { id } = req.params;
    await fileService.deleteFile(id);
    
    res.json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    logger.error('删除文件失败:', error);
    res.status(500).json({
      success: false,
      message: '删除文件失败'
    });
  }
}

export {
  listFiles,
  uploadFile,
  getFile,
  deleteFile
}; 