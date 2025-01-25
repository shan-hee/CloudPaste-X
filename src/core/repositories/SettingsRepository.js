import { getDb } from '../../infrastructure/database/index.js';
import { logger } from '../../utils/logger.js';

class SettingsRepository {
  async getSettings() {
    try {
      const db = getDb();
      const settings = await db.get('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
      return {
        textUploadEnabled: Boolean(settings.text_upload_enabled),
        fileUploadEnabled: Boolean(settings.file_upload_enabled)
      };
    } catch (error) {
      logger.error('获取设置失败:', error);
      throw error;
    }
  }

  async updateSettings(settings) {
    try {
      const db = getDb();
      const result = await db.run(`
        INSERT INTO settings (text_upload_enabled, file_upload_enabled)
        VALUES (?, ?)
      `, [
        settings.textUploadEnabled ? 1 : 0,
        settings.fileUploadEnabled ? 1 : 0
      ]);
      return result;
    } catch (error) {
      logger.error('更新设置失败:', error);
      throw error;
    }
  }
}

export default new SettingsRepository(); 