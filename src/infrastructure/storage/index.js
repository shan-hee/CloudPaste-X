import AWS from 'aws-sdk';
import { logger } from '../../utils/logger.js';

let s3Client;
let isStorageAvailable = false;

const setupStorage = () => {
  const s3Config = {
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION || 'us-east-1',
    s3ForcePathStyle: true, // 使用路径样式访问
    sslEnabled: false // 本地开发环境禁用SSL
  };

  logger.info('初始化存储服务配置:', {
    endpoint: s3Config.endpoint,
    region: s3Config.region,
    bucket: process.env.S3_BUCKET
  });

  s3Client = new AWS.S3(s3Config);

  // 异步检查存储服务
  ensureBucket().catch(error => {
    logger.error('存储服务初始化失败，文件上传功能将不可用:', {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId
    });
    isStorageAvailable = false;
  });
};

const ensureBucket = async () => {
  const bucketName = process.env.S3_BUCKET;
  
  try {
    logger.info('检查存储桶是否存在:', { bucket: bucketName });
    await s3Client.headBucket({ Bucket: bucketName }).promise();
    logger.info('存储桶已存在');
    isStorageAvailable = true;
  } catch (error) {
    if (error.code === 'NotFound') {
      try {
        logger.info('创建新的存储桶:', { bucket: bucketName });
        await s3Client.createBucket({ 
          Bucket: bucketName,
          CreateBucketConfiguration: {
            LocationConstraint: process.env.S3_REGION || 'us-east-1'
          }
        }).promise();
        logger.info('存储桶创建成功');
        isStorageAvailable = true;
      } catch (createError) {
        logger.error('创建存储桶失败:', {
          error: createError.message,
          code: createError.code,
          statusCode: createError.statusCode
        });
        isStorageAvailable = false;
      }
    } else {
      logger.error('检查存储桶失败:', {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode
      });
      isStorageAvailable = false;
    }
  }
};

const uploadFile = async (key, data, options = {}) => {
  if (!isStorageAvailable) {
    throw new Error('存储服务不可用');
  }

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: data,
    ContentType: options.contentType || 'application/octet-stream'
  };

  try {
    const result = await s3Client.upload(params).promise();
    return result.Location;
  } catch (error) {
    logger.error('文件上传失败:', error);
    throw error;
  }
};

const downloadFile = async (key) => {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key
  };

  try {
    const data = await s3Client.getObject(params).promise();
    return data.Body;
  } catch (error) {
    logger.error('文件下载失败:', error);
    throw error;
  }
};

const deleteFile = async (key) => {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key
  };

  try {
    await s3Client.deleteObject(params).promise();
  } catch (error) {
    logger.error('文件删除失败:', error);
    throw error;
  }
};

// 生成预签名下载URL
const getSignedDownloadUrl = async (key, filename, expiresIn = 3600) => {
  if (!isStorageAvailable) {
    throw new Error('存储服务不可用');
  }

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Expires: expiresIn,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"` 
  };

  try {
    const url = await s3Client.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    logger.error('生成预签名URL失败:', error);
    throw error;
  }
};

export {
  setupStorage,
  uploadFile,
  downloadFile,
  deleteFile,
  getSignedDownloadUrl
}; 