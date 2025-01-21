import express from 'express';
import multer from 'multer';
import * as fileController from '../controllers/file.js';
import { validateFile } from '../middlewares/validator.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// 配置 multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 默认5MB
  }
});

// 获取文件列表
router.get('/', authMiddleware, fileController.listFiles);

// 上传文件
router.post('/', 
  authMiddleware,
  upload.single('file'),
  validateFile,
  fileController.uploadFile
);

// 获取文件
router.get('/:id', fileController.getFile);

// 删除文件
router.delete('/:id', authMiddleware, fileController.deleteFile);

export default router; 