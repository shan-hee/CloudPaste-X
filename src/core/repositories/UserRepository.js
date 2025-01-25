import { getDb } from '../../infrastructure/database/index.js';
import { logger } from '../../utils/logger.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

class UserRepository {
  async findByUsername(username) {
    try {
      const db = getDb();
      const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
      return user;
    } catch (error) {
      logger.error('查找用户失败:', error);
      throw error;
    }
  }

  async createUser(username, password, isAdmin = false) {
    try {
      const db = getDb();
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await db.run(`
        INSERT INTO users (
          username,
          password,
          is_admin,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [username, hashedPassword, isAdmin ? 1 : 0]);
      return result;
    } catch (error) {
      logger.error('创建用户失败:', error);
      throw error;
    }
  }

  async createSession(userId) {
    try {
      const db = getDb();
      const sessionId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

      await db.run(`
        INSERT INTO sessions (
          id,
          user_id,
          expires_at
        ) VALUES (?, ?, ?)
      `, [sessionId, userId, expiresAt.toISOString()]);

      return sessionId;
    } catch (error) {
      logger.error('创建会话失败:', error);
      throw error;
    }
  }

  async validateSession(sessionId) {
    try {
      const db = getDb();
      const session = await db.get(`
        SELECT s.*, u.username, u.is_admin
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP
      `, [sessionId]);
      return session;
    } catch (error) {
      logger.error('验证会话失败:', error);
      throw error;
    }
  }

  async deleteSession(sessionId) {
    try {
      const db = getDb();
      await db.run('DELETE FROM sessions WHERE id = ?', [sessionId]);
    } catch (error) {
      logger.error('删除会话失败:', error);
      throw error;
    }
  }

  async deleteExpiredSessions() {
    try {
      const db = getDb();
      await db.run('DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP');
    } catch (error) {
      logger.error('清理过期会话失败:', error);
      throw error;
    }
  }
}

export default new UserRepository(); 