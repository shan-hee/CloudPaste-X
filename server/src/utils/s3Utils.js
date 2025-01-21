import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from './logger.js';

// 创建 S3 客户端
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin'
  },
  forcePathStyle: true
});

const BUCKET_NAME = process.env.S3_BUCKET || 'cloudpaste';

// 上传文件
async function uploadFile(file) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: file.filename,
      Body: file.buffer,
      ContentType: file.mimetype
    });

    await s3Client.send(command);
    logger.info(`文件上传成功: ${file.filename}`);

    return {
      id: file.filename,
      url: await getFileUrl(file.filename)
    };
  } catch (error) {
    logger.error('上传文件到S3失败:', error);
    throw error;
  }
}

// 获取文件URL
async function getFileUrl(key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error('获取文件URL失败:', error);
    throw error;
  }
}

// 删除文件
async function deleteFile(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    logger.info(`文件删除成功: ${key}`);
    return true;
  } catch (error) {
    logger.error('从S3删除文件失败:', error);
    throw error;
  }
}

export {
  uploadFile,
  getFileUrl,
  deleteFile
}; 