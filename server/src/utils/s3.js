import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from './logger.js';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  }
});

export const s3Utils = {
  async uploadFile(key, body, contentType) {
    try {
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType
      });

      await s3Client.send(command);
      logger.info(`文件上传成功: ${key}`);
      return true;
    } catch (error) {
      logger.error(`文件上传失败: ${key}`, error);
      throw error;
    }
  },

  async getFile(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key
      });

      const response = await s3Client.send(command);
      return response.Body;
    } catch (error) {
      logger.error(`获取文件失败: ${key}`, error);
      throw error;
    }
  },

  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key
      });

      await s3Client.send(command);
      logger.info(`文件删除成功: ${key}`);
      return true;
    } catch (error) {
      logger.error(`文件删除失败: ${key}`, error);
      throw error;
    }
  }
}; 