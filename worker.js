// 配置常量
const BOOKMARK_CONSTANTS = {
    MAX_SIZE: 1024 * 1024, // 1MB
    MAX_URL_LENGTH: 2048,
    MAX_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 1000
};

const CONFIG = {
    FILE: {
        MAX_SIZE: 98 * 1024 * 1024,
        get MAX_TOTAL_STORAGE() {
            // 从环境变量获取总容量（GB），默认6GB
            const totalStorageGB = parseInt(process.env.TOTAL_STORAGE_GB) || 6;
            return totalStorageGB * 1024 * 1024 * 1024; // 转换为字节
        },
        MAX_BOOKMARK_SIZE: BOOKMARK_CONSTANTS.MAX_SIZE
    },
    DURATIONS: {
        HOUR: '1h',
        DAY: '1d',
        WEEK: '7d',
        MONTH: '30d',
        NEVER: 'never'
    }
};

// 工具类
class Utils {
  static generateId(length = 8) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({length}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }

  static async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }

  static async verifyPassword(password, hash) {
    const inputHash = await this.hashPassword(password);
    return inputHash === hash;
  }

  static calculateExpiryTime(duration) {
    if (duration === CONFIG.DURATIONS.NEVER) return null;

    const now = new Date();
    const durationMap = {
      [CONFIG.DURATIONS.HOUR]: 60 * 60 * 1000,
      [CONFIG.DURATIONS.DAY]: 24 * 60 * 60 * 1000,
      [CONFIG.DURATIONS.WEEK]: 7 * 24 * 60 * 60 * 1000,
      [CONFIG.DURATIONS.MONTH]: 30 * 24 * 60 * 60 * 1000
    };

    return new Date(now.getTime() + (durationMap[duration] || durationMap[CONFIG.DURATIONS.DAY]));
  }

  static isExpired(expiryTime) {
    return expiryTime ? new Date() > new Date(expiryTime) : false;
  }

  static async handleError(error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message || '发生未知错误'
    }), {
      status: error.status || 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 文件处理类
class FileHandler {
  static async upload(request, env) {
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const text = formData.get('text');
      const password = formData.get('password');
      const duration = formData.get('duration') || '1d';
      
      // 处理文本上传
      if (text) {
        const id = Utils.generateId();
        const data = {
          type: 'text',
          content: text,
          timestamp: new Date().toISOString(),
          expiryTime: Utils.calculateExpiryTime(duration)
        };

        // 如果有密码，加密内容
        if (password) {
          data.hasPassword = true;
          data.passwordHash = await Utils.hashPassword(password);
        }

        await env.CLOUD_PASTE.put(id, JSON.stringify(data));

        return new Response(JSON.stringify({
          success: true,
          id,
          type: 'text'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 处理文件上传
      if (file) {
        if (file.size > CONFIG.FILE.MAX_SIZE) {
          throw new Error('文件大小超过限制');
        }

        const id = Utils.generateId();
        const fileData = {
          type: 'file',
          name: file.name,
          size: file.size,
          timestamp: new Date().toISOString(),
          expiryTime: Utils.calculateExpiryTime(duration)
        };

        // 如果有密码，加密内容
        if (password) {
          fileData.hasPassword = true;
          fileData.passwordHash = await Utils.hashPassword(password);
        }

        // 存储文件元数据
        await env.CLOUD_PASTE.put(id, JSON.stringify(fileData));
        
        // 存储文件内容
        await env.FILE_STORE.put(id, file);

        return new Response(JSON.stringify({
          success: true,
          id,
          type: 'file'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      throw new Error('未找到上传内容');
    } catch (error) {
      return Utils.handleError(error);
    }
  }

  static async download(request, env) {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();
      const password = url.searchParams.get('password');

      // 获取元数据
      const metadata = await env.CLOUD_PASTE.get(id);
      if (!metadata) {
        throw new Error('文件不存在');
      }

      const data = JSON.parse(metadata);

      // 检查是否过期
      if (data.expiryTime && Utils.isExpired(data.expiryTime)) {
        // 删除过期内容
        await env.CLOUD_PASTE.delete(id);
        if (data.type === 'file') {
          await env.FILE_STORE.delete(id);
        }
        throw new Error('内容已过期');
      }

      // 验证密码
      if (data.hasPassword) {
        if (!password) {
          throw new Error('需要密码');
        }
        if (!await Utils.verifyPassword(password, data.passwordHash)) {
          throw new Error('密码错误');
        }
      }

      // 返回内容
      if (data.type === 'text') {
        return new Response(data.content, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      } else {
        const file = await env.FILE_STORE.get(id);
        if (!file) {
          throw new Error('文件不存在');
        }

        return new Response(file.body, {
          headers: {
            'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(data.name)}"`,
          }
        });
      }
    } catch (error) {
      return Utils.handleError(error);
    }
  }
}

// 清理管理器类
class CleanupManager {
  static async cleanExpiredContent(env) {
    const now = new Date();
    let cursor = undefined;
    const deletedKeys = [];
    
    do {
      const list = await env.STORAGE.list({ cursor, limit: 100 });
      cursor = list.cursor;
      
      for (const key of list.keys) {
        try {
          const item = await env.STORAGE.get(key.name);
          if (!item) continue;
          
          const data = JSON.parse(item);
          if (data.expiryTime && Utils.isExpired(data.expiryTime)) {
            await env.STORAGE.delete(key.name);
            deletedKeys.push(key.name);
          }
        } catch (error) {
          console.error(`清理时出错 ${key.name}:`, error);
        }
      }
    } while (cursor);
    
    return deletedKeys;
  }
}

// 在 fetch 函数中添加书签路由处理
async function handleRequest(request, env, ctx) {
  try {
    const url = new URL(request.url);
    
    // 在每个请求时有10%的概率触发清理
    if (Math.random() < 0.1) {
      ctx.waitUntil(CleanupManager.cleanExpiredContent(env));
    }
    
    // 处理书签相关的API请求
    if (url.pathname.startsWith('/api/bookmarks')) {
      if (request.method === 'POST') {
        if (url.pathname === '/api/bookmarks/undo') {
          return await BookmarkHandler.undo(env);
        } else if (url.pathname === '/api/bookmarks/redo') {
          return await BookmarkHandler.redo(env);
        } else if (url.pathname === '/api/bookmarks/clear-all') {
          return await BookmarkHandler.clearAll(env);
        } else {
          return await BookmarkHandler.upload(request, env);
        }
      } else if (request.method === 'GET') {
        if (url.pathname === '/api/bookmarks') {
          return await BookmarkHandler.list(env);
        } else {
          return await BookmarkHandler.get(request, env);
        }
      }
    }

    // 处理文件上传
    if (url.pathname === '/upload' && request.method === 'POST') {
      return await FileHandler.upload(request, env);
    }
    
    // 处理文件下载
    if (url.pathname.startsWith('/download/')) {
      return await FileHandler.download(request, env);
    }
    
    // 处理分享内容相关的请求
    if (url.pathname.startsWith('/s/')) {
      const id = url.pathname.split('/').pop();
      
      // 处理 PUT 请求（更新内容）
      if (request.method === 'PUT') {
        try {
          const data = await request.json();
          const { content, maxViews } = data;

          // 验证必需字段
          if (!content) {
            return new Response(JSON.stringify({
              success: false,
              message: '内容不能为空'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // 获取现有分享
          const share = await env.CLOUD_PASTE.get(id);
          if (!share) {
            return new Response(JSON.stringify({
              success: false,
              message: '分享不存在或已过期'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const shareData = JSON.parse(share);
          
          // 只更新内容和最大访问次数
          shareData.content = content;
          if (typeof maxViews === 'number' && maxViews >= 0) {
            shareData.maxViews = maxViews;
          }
          
          // 保存更新后的内容
          await env.CLOUD_PASTE.put(id, JSON.stringify(shareData));

          return new Response(JSON.stringify({
            success: true,
            message: '更新成功',
            data: {
              content: shareData.content,
              maxViews: shareData.maxViews
            }
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return Utils.handleError(error);
        }
      }
      
      // 处理 GET 请求（获取内容）
      if (request.method === 'GET') {
        try {
          const share = await env.CLOUD_PASTE.get(id);
          if (!share) {
            return new Response(JSON.stringify({
              success: false,
              message: '分享不存在或已过期'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const shareData = JSON.parse(share);
          
          // 检查是否是 API 请求
          const isApiRequest = request.headers.get('accept')?.includes('application/json') || 
                             request.headers.get('x-requested-with') === 'XMLHttpRequest';

          if (isApiRequest) {
            return new Response(JSON.stringify({
              success: true,
              data: {
                content: shareData.content,
                maxViews: shareData.maxViews
              }
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // 返回 HTML 页面
          return new Response(template, {
            headers: { 'Content-Type': 'text/html;charset=UTF-8' }
          });
        } catch (error) {
          return Utils.handleError(error);
        }
      }
    }

    // 返回 404
    return new Response('Not Found', { status: 404 });
  } catch (error) {
    return Utils.handleError(error);
  }
}

// 基础样式
const baseStyles = `
:root {
  --primary-color: #3498db;
  --primary-color-dark: #2980b9;
  --bg-color: #f5f6fa;
  --border-color: #dcdde1;
  --text-color: #2d3436;
  --card-bg: white;
  --secondary-text: #666;
  --tab-active-color: #3498db;
  --tab-border-color: #e0e0e0;
  --editor-bg: #ffffff;
}

[data-theme="dark"] {
  --primary-color: #5dade2;
  --primary-color-dark: #3498db;
  --bg-color: #1a1a1a;
  --border-color: #333;
  --text-color: #e0e0e0;
  --card-bg: #242424;
  --secondary-text: #aaa;
  --tab-active-color: #5dade2;
  --tab-border-color: #444;
  --editor-bg: #2d2d2d;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: var(--bg-color);
  color: var(--text-color);
  line-height: 1.6;
  margin: 0;
  padding: 0;
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  background: var(--card-bg);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.nav-tabs {
  display: flex;
  gap: 2rem;
  border-bottom: 1px solid var(--tab-border-color);
  margin-bottom: 2rem;
}

.nav-tab {
  padding: 0.5rem 0;
  color: var(--text-color);
  text-decoration: none;
  position: relative;
  cursor: pointer;
}

.nav-tab.active {
  color: var(--tab-active-color);
}

.nav-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--tab-active-color);
}

.upload-section {
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 2rem;
}

.text-upload-form {
  display: grid;
  gap: 1rem;
}

.form-group {
  display: grid;
  gap: 0.5rem;
}

textarea {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-color);
  color: var(--text-color);
  font-family: inherit;
  resize: vertical;
  line-height: 1.6;
}

.options-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-group label {
  color: var(--secondary-text);
  font-size: 0.9rem;
}

input[type="password"],
input[type="text"],
input[type="number"],
select {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-color);
  color: var(--text-color);
}

.markdown-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.submit-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
  margin-top: 1rem;
}

.submit-btn:hover {
  background: var(--primary-color-dark);
}

.char-count {
  text-align: right;
  color: var(--secondary-text);
  font-size: 0.9rem;
}

/* 文件上传相关样式 */
.upload-buttons {
  display: flex;
  gap: 1rem;
}

.upload-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.upload-btn:hover {
  background: var(--primary-color-dark);
}

.progress-bar {
  margin-top: 1rem;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  height: 4px;
}

.progress {
  background: var(--primary-color);
  height: 100%;
  width: 0;
  transition: width 0.3s ease;
}

/* 提示框样式 */
.alert {
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.alert.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* Markdown 编辑器样式 */
.editor-wrapper {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--card-bg);
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
}

.editor-tabs {
  display: flex;
  gap: 16px;
}

.editor-tab {
  color: #888;
  cursor: pointer;
  padding: 4px 0;
  position: relative;
}

.editor-tab.active {
  color: #fff;
}

.editor-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #888;
}

.editor-toolbar {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.toolbar-btn {
  background: none;
  border: none;
  color: var(--text-color);
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-btn:hover {
  background: var(--border-color);
}

.editor-content {
  position: relative;
  min-height: 300px;
}

.editor-textarea {
  width: 100%;
  min-height: 300px;
  padding: 16px;
  background: var(--editor-bg);
  color: var(--text-color);
  border: none;
  resize: vertical;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  tab-size: 4;
}

.editor-textarea:focus {
  outline: none;
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px;
  background: var(--bg-color);
  border-top: 1px solid var(--border-color);
  color: var(--secondary-text);
  font-size: 12px;
}

.editor-status {
  display: flex;
  gap: 16px;
}

/* 自定义滚动条 */
.editor-textarea::-webkit-scrollbar {
  width: 12px;
}

.editor-textarea::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.editor-textarea::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 6px;
  border: 3px solid #1e1e1e;
}

.editor-textarea::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 主题切换按钮 */
.theme-toggle {
  position: fixed;
  top: 20px;
  left: 20px;
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  transition: transform 0.3s ease;
  z-index: 1000;
}

.theme-toggle:hover {
  transform: scale(1.1);
}

.theme-toggle i {
  font-size: 24px;
  transition: all 0.3s ease;
}

/* 自动模式图标 */
.theme-toggle i.fa-clock {
  color: var(--primary-color);
}

/* 暗色模式图标 */
.theme-toggle i.fa-moon {
  color: #5C6BC0; /* 柔和的月亮蓝色 */
}

/* 亮色模式图标 */
.theme-toggle i.fa-sun {
  color: #FFB300; /* 温暖的太阳黄色 */
}

/* 添加图标发光效果 */
.theme-toggle i.fa-sun {
  text-shadow: 0 0 20px rgba(255, 179, 0, 0.4);
}

.theme-toggle i.fa-moon {
  text-shadow: 0 0 20px rgba(92, 107, 192, 0.4);
}

.theme-toggle i.fa-clock {
  text-shadow: 0 0 20px rgba(52, 152, 219, 0.4);
}

/* 管理面板样式 */
.admin-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 300px;
  height: 100vh;
  background: var(--card-bg);
  border-left: 1px solid var(--border-color);
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.admin-panel-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.admin-panel-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-color);
}

.admin-panel-close {
  cursor: pointer;
  color: var(--text-color);
  font-size: 1.2rem;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.admin-panel-close:hover {
  opacity: 1;
}

.admin-panel-actions {
  padding: 1rem;
  display: flex;
  gap: 0.5rem;
}

.admin-action-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  background: var(--primary-color);
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.admin-action-btn:hover {
  background: var(--primary-color-dark);
}

.admin-refresh-btn {
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  background: var(--border-color);
  color: var(--text-color);
  cursor: pointer;
  font-size: 0.9rem;
}

.admin-stats {
  padding: 1rem;
  display: flex;
  justify-content: space-around;
  border-bottom: 1px solid var(--border-color);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--primary-color);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--secondary-text);
}

.storage-info {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.storage-title {
  font-size: 0.9rem;
  color: var(--text-color);
  margin-bottom: 0.5rem;
}

.storage-progress {
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.storage-progress-bar {
  height: 100%;
  background: var(--primary-color);
  width: var(--progress-width);
  transition: width 0.3s ease;
}

.storage-details {
  font-size: 0.8rem;
  color: var(--secondary-text);
}

.share-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.share-item {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.share-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.share-id {
  font-size: 0.8rem;
  color: var(--secondary-text);
}

.share-time {
  font-size: 0.8rem;
  color: var(--secondary-text);
}

.share-content {
  margin-bottom: 0.5rem;
}

.share-filename {
  font-weight: 500;
  color: var(--text-color);
}

.share-info {
  font-size: 0.8rem;
  color: var(--secondary-text);
}

.share-actions {
  display: flex;
  gap: 0.5rem;
}

.share-btn {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s;
}

.share-btn.copy {
  background: var(--primary-color);
  color: white;
}

.share-btn.edit {
  background: var(--border-color);
  color: var(--text-color);
}

.share-btn.delete {
  background: #dc3545;
  color: white;
}

.share-btn:hover {
  opacity: 0.9;
}

/* 顶部按钮容器 */
.top-buttons {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  z-index: 1000;
}

/* 管理面板按钮 */
.admin-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* GitHub 图标按钮 */
.github-btn {
  color: var(--text-color);
  font-size: 32px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  text-decoration: none;
}

.github-btn i {
  line-height: 1;
  height: 32px;
}

/* 管理面板上传开关 */
.admin-action-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  background: var(--border-color);
  color: var(--text-color);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
  position: relative;
}

.admin-action-btn.active {
  background: var(--primary-color);
  color: white;
}

.admin-action-btn::before {
  content: '禁止';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  transition: opacity 0.3s;
  opacity: 1;
}

.admin-action-btn.active::before {
  content: '允许';
  opacity: 1;
}

/* 涟漪效果 */
.admin-btn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.5);
  opacity: 0;
  border-radius: 100%;
  transform: scale(1, 1) translate(-50%);
  transform-origin: 50% 50%;
}

.admin-btn:focus:not(:active)::after {
  animation: ripple 1s ease-out;
}

@keyframes ripple {
  0% {
    transform: scale(0, 0);
    opacity: 0.5;
  }
  20% {
    transform: scale(25, 25);
    opacity: 0.3;
  }
  100% {
    opacity: 0;
    transform: scale(40, 40);
  }
}

/* 全屏编辑器样式 */
.editor-wrapper.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: var(--card-bg);
  margin: 0;
  border-radius: 0;
}

.editor-wrapper.fullscreen .editor-content {
  height: calc(100vh - 120px);
}

.editor-wrapper.fullscreen .editor-textarea {
  height: 100%;
  max-height: none;
}

.editor-wrapper.fullscreen .split-view {
  height: calc(100vh - 120px);
  display: flex;
}

.editor-wrapper.fullscreen .split-view .editor-textarea,
.editor-wrapper.fullscreen .split-view .preview-container {
  height: 100%;
  overflow-y: auto;
  margin: 0;
  padding: 16px;
}

.editor-wrapper.fullscreen .split-view .preview-container {
  border-left: 1px solid var(--border-color);
}

.editor-controls .fullscreen-btn {
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.editor-controls .fullscreen-btn:hover {
  background: var(--border-color);
}

/* 编辑器预览和对照样式 */
.editor-content {
  position: relative;
  min-height: 300px;
}

.preview-container {
  display: none;
  padding: 16px;
  background: var(--editor-bg);
  border: none;
  min-height: 300px;
  overflow-y: auto;
  color: var(--text-color);
}

.split-view {
  display: none;
  flex-direction: row;
  gap: 16px;
  height: 100%;
  min-height: 300px;
}

.split-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.split-view .editor-textarea {
  flex: 1;
  height: 300px;
  overflow-y: auto;
  background: var(--editor-bg);
  color: var(--text-color);
  border: none;
  padding: 16px;
  resize: none;
}

.split-view .preview-container {
  flex: 1;
  display: block;
  height: 300px;
  overflow-y: auto;
  padding: 16px;
  background: var(--editor-bg);
  border-left: 1px solid var(--border-color);
}

/* Markdown 语法链接样式 */
.markdown-link {
    color: var(--secondary-text);
    text-decoration: none;
    font-size: 14px;
    transition: color 0.3s ease;
}

.markdown-link:hover {
    color: var(--primary-color);
    text-decoration: underline;
}

/* 工具栏样式 */
.toolbar {
  display: flex;
  gap: 5px;
  padding: 8px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.toolbar-button {
  padding: 5px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 3px;
  position: relative;
}

.toolbar-button:hover {
  background: #e0e0e0;
}

/* 工具提示样式 */
.toolbar-button::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 12px;
  border-radius: 4px;
  white-space: nowrap;
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.2s;
}

.toolbar-button:hover::after {
  visibility: visible;
  opacity: 1;
}

/* 图标样式 */
.icon {
  width: 18px;
  height: 18px;
  display: inline-block;
}

.icon-undo {
  background-image: url('data:image/svg+xml,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>');
}

.icon-redo {
  background-image: url('data:image/svg+xml,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>');
}

.icon-clear {
  background-image: url('data:image/svg+xml,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>');
}
`;

// 合并所有样式
const styles = baseStyles;

// HTML模板
const template = `
<!DOCTYPE html>
<html lang="zh" data-theme="auto">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CloudPaste - 文件分享</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <style>${styles}</style>
</head>
<body>
    <button class="theme-toggle" id="themeToggle" title="切换主题">
        <i class="fas fa-clock"></i>
    </button>

    <div class="top-buttons">
        <button class="admin-btn" id="adminPanelBtn">
            管理面板
        </button>
        <a href="https://github.com/yourusername/yourrepo" target="_blank" class="github-btn" aria-label="GitHub 仓库">
            <i class="fab fa-github" aria-hidden="true"></i>
        </a>
    </div>

    <div class="container">
        <nav class="nav-tabs">
            <a class="nav-tab active" data-tab="text">文本粘贴</a>
            <a class="nav-tab" data-tab="file">文件上传</a>
        </nav>
        
        <div class="upload-section" id="textUploadSection">
            <form id="textUploadForm" class="text-upload-form">
                <div class="form-group">
                    <div class="editor-wrapper">
                        <div class="editor-header">
                            <div class="editor-tabs">
                                <span class="editor-tab active" data-tab="content">内容</span>
                                <span class="editor-tab" data-tab="preview">预览</span>
                                <span class="editor-tab" data-tab="split">对照</span>
                            </div>
                            <div class="editor-controls">
                                <a href="https://markdown.com.cn/basic-syntax/" target="_blank" class="markdown-link">支持markdown语法</a>
                                <i class="fas fa-expand fullscreen-btn" id="fullscreenBtn" title="全屏编辑"></i>
                            </div>
                        </div>
                        <div class="editor-toolbar">
                            <button type="button" class="toolbar-btn" data-action="bold" title="加粗"><i class="fas fa-bold"></i></button>
                            <button type="button" class="toolbar-btn" data-action="italic" title="斜体"><i class="fas fa-italic"></i></button>
                            <button type="button" class="toolbar-btn" data-action="strikethrough" title="删除线"><i class="fas fa-strikethrough"></i></button>
                            <button type="button" class="toolbar-btn" data-action="heading" title="标题"><i class="fas fa-heading"></i></button>
                            <button type="button" class="toolbar-btn" data-action="list-ul" title="无序列表"><i class="fas fa-list-ul"></i></button>
                            <button type="button" class="toolbar-btn" data-action="list-ol" title="有序列表"><i class="fas fa-list-ol"></i></button>
                            <button type="button" class="toolbar-btn" data-action="quote" title="引用"><i class="fas fa-quote-right"></i></button>
                            <button type="button" class="toolbar-btn" data-action="link" title="插入链接"><i class="fas fa-link"></i></button>
                            <button type="button" class="toolbar-btn" data-action="image" title="插入图片"><i class="fas fa-image"></i></button>
                            <button type="button" class="toolbar-btn" data-action="code" title="插入代码"><i class="fas fa-code"></i></button>
                            <button type="button" class="toolbar-btn" data-action="table" title="插入表格"><i class="fas fa-table"></i></button>
                            <button type="button" class="toolbar-btn" data-action="undo" title="撤销"><i class="fas fa-undo"></i></button>
                            <button type="button" class="toolbar-btn" data-action="redo" title="重做"><i class="fas fa-redo"></i></button>
                            <button type="button" class="toolbar-btn" data-action="clear" title="清空"><i class="fas fa-trash"></i></button>
                        </div>
                        <div class="editor-content">
                            <textarea id="textInput" class="editor-textarea" placeholder="在此输入要分享的文本..."></textarea>
                            <div class="preview-container"></div>
                            <div class="split-view">
                                <div class="split-editor">
                                    <textarea class="editor-textarea" placeholder="在此输入要分享的文本..."></textarea>
                                </div>
                                <div class="preview-container"></div>
                            </div>
                        </div>
                        <div class="editor-footer">
                            <div class="char-count" id="charCount">0 字符</div>
                        </div>
                    </div>
                </div>
                
                <div class="options-row">
                    <div class="option-group">
                        <label>密码保护</label>
                        <input type="password" id="textPassword" placeholder="可选：设置访问密码">
                    </div>
                    
                    <div class="option-group">
                        <label>过期时间</label>
                        <select id="textDuration">
                            <option value="1h">1小时</option>
                            <option value="1d" selected>1天</option>
                            <option value="7d">7天</option>
                            <option value="30d">30天</option>
                            <option value="never">永久</option>
                        </select>
                    </div>
                    
                    <div class="option-group">
                        <label>自定义链接后缀 (可选)</label>
                        <input type="text" id="customUrl" placeholder="留空自动生成">
                    </div>
                    
                    <div class="option-group">
                        <label>可打开次数 (0表示无限制)</label>
                        <input type="number" id="maxViews" value="0" min="0">
                    </div>
                </div>
                
                <button type="submit" class="submit-btn">创建分享</button>
            </form>
        </div>
        
        <div class="upload-section" id="fileUploadSection" style="display: none;">
            <div class="upload-buttons">
                <label class="upload-btn" for="fileInput">
                    <i class="fas fa-file-upload"></i> 上传文件
                </label>
                <input type="file" id="fileInput" style="display: none;">
                
                <button class="upload-btn bookmark-btn" id="bookmarkBtn">
                    <i class="fas fa-bookmark"></i> 上传书签
                </button>
            </div>
            <div id="uploadProgress" class="progress-bar" style="display: none;">
                <div class="progress"></div>
            </div>
        </div>

        <div id="result"></div>
    </div>

    <div class="admin-panel" style="display: none;">
        <div class="admin-panel-header">
            <span class="admin-panel-title">分享管理</span>
            <span class="admin-panel-close" title="关闭">×</span>
        </div>
        
        <div class="admin-panel-actions">
            <button class="admin-action-btn" data-type="text">文本上传</button>
            <button class="admin-action-btn" data-type="file">文件上传</button>
            <button class="admin-refresh-btn" onclick="refreshList()">
                <i class="fas fa-sync-alt"></i>
            </button>
        </div>

        <div class="admin-stats">
            <div class="stat-item">
                <div class="stat-value">7</div>
                <div class="stat-label">总分享数</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">4</div>
                <div class="stat-label">有效分享</div>
            </div>
        </div>

        <div class="storage-info">
            <div class="storage-title">R2存储空间使用情况</div>
            <div class="storage-progress">
                <div class="storage-progress-bar" style="--progress-width: 1%"></div>
            </div>
            <div class="storage-details">
                已用: 62.01 MB / 总量: 6.00 GB / 使用率: 1.0%
            </div>
        </div>

        <div class="share-list">
            <div class="share-item">
                <div class="share-header">
                    <span class="share-id">ID: cursor</span>
                    <span class="share-time">创建时间: 2025/1/8 14:17:28</span>
                </div>
                <div class="share-content">
                    <div class="share-filename">文本分享</div>
                    <div class="share-info">过期时间: 永不过期</div>
                </div>
                <div class="share-actions">
                    <button class="share-btn copy">复制链接</button>
                    <button class="share-btn edit">修改密码</button>
                    <button class="share-btn delete">删除</button>
                </div>
            </div>
        </div>
    </div>
    
    <script>
    // 标签切换功能
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = tab.dataset.tab;
            
            // 更新标签状态
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 更新内容显示
            if (targetTab === 'text') {
                document.getElementById('textUploadSection').style.display = 'block';
                document.getElementById('fileUploadSection').style.display = 'none';
            } else {
                document.getElementById('textUploadSection').style.display = 'none';
                document.getElementById('fileUploadSection').style.display = 'block';
            }
        });
    });

    // Markdown 编辑器功能
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const action = btn.dataset.action;
            
            // 获取当前活动的文本区域
            const activeTab = document.querySelector('.editor-tab.active').dataset.tab;
            let textarea;
            let previewContainer;
            
            if (activeTab === 'split') {
                textarea = document.querySelector('.split-view .editor-textarea');
                previewContainer = document.querySelector('.split-view .preview-container');
            } else {
                textarea = document.getElementById('textInput');
                previewContainer = document.querySelector('.preview-container');
            }
            
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            
            let insert = '';
            switch(action) {
                case 'bold':
                    insert = \`**\${text.substring(start, end) || '粗体文本'}**\`;
                    break;
                case 'italic':
                    insert = \`*\${text.substring(start, end) || '斜体文本'}*\`;
                    break;
                case 'strikethrough':
                    insert = \`~~\${text.substring(start, end) || '删除线文本'}~~\`;
                    break;
                case 'heading':
                    insert = \`### \${text.substring(start, end) || '标题'}\`;
                    break;
                case 'list-ul':
                    insert = \`- \${text.substring(start, end) || '列表项'}\`;
                    break;
                case 'list-ol':
                    insert = \`1. \${text.substring(start, end) || '列表项'}\`;
                    break;
                case 'quote':
                    insert = \`> \${text.substring(start, end) || '引用文本'}\`;
                    break;
                case 'link':
                    insert = \`[\${text.substring(start, end) || '链接文本'}](url)\`;
                    break;
                case 'image':
                    insert = \`![\${text.substring(start, end) || '图片描述'}](url)\`;
                    break;
                case 'code':
                    insert = \`\\\`\${text.substring(start, end) || '代码'}\\\`\`;
                    break;
                case 'table':
                    insert = \`
| 表头1 | 表头2 |
| ----- | ----- |
| 内容1 | 内容2 |
\`;
                    break;
            }
            
            if (insert) {
                const newText = text.substring(0, start) + insert + text.substring(end);
                textarea.value = newText;
                textarea.focus();
                const newCursorPos = start + insert.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
                
                // 如果在分屏模式下，同步到主文本区域
                if (activeTab === 'split') {
                    const mainTextarea = document.getElementById('textInput');
                    mainTextarea.value = newText;
                }
                
                // 更新预览
                if (activeTab === 'split' || activeTab === 'preview') {
                    updatePreview(newText, previewContainer);
                }
                
                // 更新字符计数
                const charCount = newText.value.length;
                document.getElementById('charCount').textContent = \`\${charCount} 字符\`;
            }
        });
    });

    // 主题切换功能
    function setTheme(theme) {
        const html = document.documentElement;
        const themeBtn = document.getElementById('themeToggle');
        const icon = themeBtn.querySelector('i');
        
        // 移除所有可能的图标类
        icon.classList.remove('fa-clock', 'fa-moon', 'fa-sun');
        
        switch(theme) {
            case 'auto':
                icon.classList.add('fa-clock');
                themeBtn.title = '自动切换（点击切换到暗色）';
                // 根据时间设置实际主题
                const hour = new Date().getHours();
                const isDark = hour < 6 || hour >= 18;
                html.setAttribute('data-theme', isDark ? 'dark' : 'light');
                break;
            case 'dark':
                icon.classList.add('fa-moon');
                themeBtn.title = '暗色主题（点击切换到亮色）';
                html.setAttribute('data-theme', 'dark');
                break;
            case 'light':
                icon.classList.add('fa-sun');
                themeBtn.title = '亮色主题（点击切换到自动）';
                html.setAttribute('data-theme', 'light');
                break;
        }
        
        localStorage.setItem('theme', theme);
    }

    // 自动切换主题的定时器
    let autoThemeInterval;

    function startAutoTheme() {
        // 每分钟检查一次时间
        autoThemeInterval = setInterval(() => {
            if (localStorage.getItem('theme') === 'auto') {
                const hour = new Date().getHours();
                const isDark = hour < 6 || hour >= 18;
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            }
        }, 60000);
    }

    // 初始化主题
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'auto';
        setTheme(savedTheme);
        startAutoTheme();
    }

    // 添加主题切换事件监听
    document.getElementById('themeToggle').addEventListener('click', () => {
        const currentTheme = localStorage.getItem('theme') || 'auto';
        const themeMap = {
            'auto': 'dark',
            'dark': 'light',
            'light': 'auto'
        };
        setTheme(themeMap[currentTheme]);
    });
    
    // 页面加载时初始化主题
    document.addEventListener('DOMContentLoaded', initTheme);

    // 管理面板功能
    function refreshList() {
        // 实现刷新列表的逻辑
    }

    // 复制链接
    document.querySelectorAll('.share-btn.copy').forEach(btn => {
        btn.addEventListener('click', async () => {
            const shareId = btn.closest('.share-item').querySelector('.share-id').textContent.split(': ')[1];
            const shareUrl = \`\${window.location.origin}/download/\${shareId}\`;
            
            try {
                await navigator.clipboard.writeText(shareUrl);
                btn.textContent = '已复制';
                setTimeout(() => btn.textContent = '复制链接', 2000);
            } catch (err) {
                alert('复制失败，请手动复制链接');
            }
        });
    });

    // 删除分享
    document.querySelectorAll('.share-btn.delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('确定要删除这个分享吗？')) {
                const shareItem = btn.closest('.share-item');
                const shareId = shareItem.querySelector('.share-id').textContent.split(': ')[1];
                
                try {
                    const response = await fetch(\`/api/share/\${shareId}\`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        shareItem.remove();
                    } else {
                        throw new Error('删除失败');
                    }
                } catch (err) {
                    alert('删除失败：' + err.message);
                }
            }
        });
    });

    // 修改密码
    document.querySelectorAll('.share-btn.edit').forEach(btn => {
        btn.addEventListener('click', async () => {
            const shareId = btn.closest('.share-item').querySelector('.share-id').textContent.split(': ')[1];
            const newPassword = prompt('请输入新密码（留空表示取消密码）：');
            
            if (newPassword !== null) {
                try {
                    const response = await fetch(\`/api/share/\${shareId}/password\`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ password: newPassword })
                    });
                    
                    if (response.ok) {
                        alert('密码修改成功');
                    } else {
                        throw new Error('修改失败');
                    }
                } catch (err) {
                    alert('修改失败：' + err.message);
                }
            }
        });
    });

    // 关闭面板
    document.querySelector('.admin-panel-close').addEventListener('click', () => {
        document.querySelector('.admin-panel').style.display = 'none';
    });

    // 添加管理面板按钮点击事件
    document.getElementById('adminPanelBtn').addEventListener('click', () => {
        const panel = document.querySelector('.admin-panel');
        if (panel.style.display === 'none') {
            panel.style.display = 'flex';
            // 添加进入动画
            panel.style.animation = 'slideIn 0.3s ease-out forwards';
        }
    });

    // 添加管理面板按钮涟漪效果
    document.getElementById('adminPanelBtn').addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 1000);
    });

    // 全屏切换功能
    document.getElementById('fullscreenBtn').addEventListener('click', () => {
        const editorWrapper = document.querySelector('.editor-wrapper');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const activeTab = document.querySelector('.editor-tab.active').dataset.tab;
        
        editorWrapper.classList.toggle('fullscreen');
        
        if (editorWrapper.classList.contains('fullscreen')) {
            fullscreenBtn.classList.replace('fa-expand', 'fa-compress');
            fullscreenBtn.title = '退出全屏';
            document.body.style.overflow = 'hidden';
            
            // 如果是对照模式，需要特别处理
            if (activeTab === 'split') {
                const splitView = editorWrapper.querySelector('.split-view');
                const splitTextarea = splitView.querySelector('.editor-textarea');
                const splitPreview = splitView.querySelector('.preview-container');
                
                // 确保分屏视图正确显示
                splitView.style.display = 'flex';
                splitTextarea.style.height = '100%';
                splitPreview.style.height = '100%';
            }
        } else {
            fullscreenBtn.classList.replace('fa-compress', 'fa-expand');
            fullscreenBtn.title = '全屏编辑';
            document.body.style.overflow = '';
            
            // 恢复正常高度
            if (activeTab === 'split') {
                const splitView = editorWrapper.querySelector('.split-view');
                const splitTextarea = splitView.querySelector('.editor-textarea');
                const splitPreview = splitView.querySelector('.preview-container');
                
                splitTextarea.style.height = '300px';
                splitPreview.style.height = '300px';
            }
        }
    });

    // 添加 ESC 键退出全屏
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const editorWrapper = document.querySelector('.editor-wrapper');
            const fullscreenBtn = document.getElementById('fullscreenBtn');
            
            if (editorWrapper.classList.contains('fullscreen')) {
                editorWrapper.classList.remove('fullscreen');
                fullscreenBtn.classList.replace('fa-compress', 'fa-expand');
                fullscreenBtn.title = '全屏编辑';
                document.body.style.overflow = '';
            }
        }
    });

    // 编辑器标签切换
    document.querySelectorAll('.editor-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // 更新标签状态
            document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const mode = tab.dataset.tab;
            const content = document.querySelector('.editor-content');
            const mainTextarea = content.querySelector('.editor-textarea');
            const preview = content.querySelector('.preview-container');
            const splitView = content.querySelector('.split-view');
            const isFullscreen = document.querySelector('.editor-wrapper').classList.contains('fullscreen');
            
            // 切换视图
            switch(mode) {
                case 'content':
                    mainTextarea.style.display = 'block';
                    preview.style.display = 'none';
                    splitView.style.display = 'none';
                    break;
                case 'preview':
                    mainTextarea.style.display = 'none';
                    preview.style.display = 'block';
                    splitView.style.display = 'none';
                    updatePreview(mainTextarea.value, preview);
                    break;
                case 'split':
                    mainTextarea.style.display = 'none';
                    preview.style.display = 'none';
                    splitView.style.display = 'flex';
                    const splitTextarea = splitView.querySelector('.editor-textarea');
                    const splitPreview = splitView.querySelector('.preview-container');
                    
                    // 设置适当的高度
                    if (isFullscreen) {
                        splitTextarea.style.height = '100%';
                        splitPreview.style.height = '100%';
                    } else {
                        splitTextarea.style.height = '300px';
                        splitPreview.style.height = '300px';
                    }
                    
                    splitTextarea.value = mainTextarea.value;
                    updatePreview(splitTextarea.value, splitPreview);
                    break;
            }
        });
    });

    // 修改输入监听函数
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('editor-textarea')) {
            const activeTab = document.querySelector('.editor-tab.active').dataset.tab;
            const content = document.querySelector('.editor-content');
            
            // 更新字符计数
            const charCount = e.target.value.length;
            document.getElementById('charCount').textContent = \`\${charCount} 字符\`;
            
            // 如果是分屏模式，同步内容并更新预览
            if (activeTab === 'split') {
                const mainTextarea = content.querySelector('.editor-textarea');
                const splitPreview = content.querySelector('.split-view .preview-container');
                const splitTextarea = content.querySelector('.split-view .editor-textarea');
                
                // 同步内容
                if (e.target === mainTextarea) {
                    splitTextarea.value = e.target.value;
                } else {
                    mainTextarea.value = e.target.value;
                }
                
                // 更新预览
                updatePreview(e.target.value, splitPreview);
            }
            // 如果是预览模式，更新预览
            else if (activeTab === 'preview') {
                const preview = content.querySelector('.preview-container');
                updatePreview(e.target.value, preview);
            }
        }
    });

    // 在分屏模式下同步滚动
    function setupSplitViewScrollSync() {
        const splitView = document.querySelector('.split-view');
        const textarea = splitView.querySelector('.editor-textarea');
        const preview = splitView.querySelector('.preview-container');
        
        textarea.addEventListener('scroll', () => {
            const percentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
            preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
        });
    }

    // 页面加载完成后设置滚动同步
    document.addEventListener('DOMContentLoaded', setupSplitViewScrollSync);

    // 修改预览更新函数
    function updatePreview(text, container) {
        try {
            // 使用 marked 渲染 Markdown
            const rendered = marked.parse(text);
            container.innerHTML = rendered;
            
            // 添加语法高亮
            container.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
        } catch (error) {
            console.error('Markdown 渲染错误:', error);
            container.innerHTML = '<div class="error">预览渲染错误</div>';
        }
    }

    // 初始化 marked 配置
    marked.setOptions({
        renderer: new marked.Renderer(),
        gfm: true,
        breaks: true,
        sanitize: false,
        smartLists: true,
        smartypants: false,
        xhtml: false
    });

    // 初始化编辑器历史记录
    const editorHistory = {
        undoStack: [],
        redoStack: [],
        maxStackSize: 50
    };

    // 保存当前状态到撤销栈
    function saveState(content) {
        editorHistory.undoStack.push(content);
        if (editorHistory.undoStack.length > editorHistory.maxStackSize) {
            editorHistory.undoStack.shift();
        }
        editorHistory.redoStack = []; // 清空重做栈
    }

    // 处理撤销操作
    function handleUndo(textarea) {
        if (editorHistory.undoStack.length > 0) {
            const currentContent = textarea.value;
            editorHistory.redoStack.push(currentContent);
            const previousContent = editorHistory.undoStack.pop();
            textarea.value = previousContent;
            updatePreview(previousContent, getPreviewContainer());
            updateCharCount(previousContent.length);
        }
    }

    // 处理重做操作
    function handleRedo(textarea) {
        if (editorHistory.redoStack.length > 0) {
            const currentContent = textarea.value;
            editorHistory.undoStack.push(currentContent);
            const nextContent = editorHistory.redoStack.pop();
            textarea.value = nextContent;
            updatePreview(nextContent, getPreviewContainer());
            updateCharCount(nextContent.length);
        }
    }

    // 处理清空操作
    function handleClear(textarea) {
        if (textarea.value.trim() !== '') {
            if (confirm('确定要清空所有内容吗？')) {
                const currentContent = textarea.value;
                editorHistory.undoStack.push(currentContent);
                editorHistory.redoStack = [];
                textarea.value = '';
                updatePreview('', getPreviewContainer());
                updateCharCount(0);
            }
        }
    }

    // 获取当前活动的文本区域
    function getActiveTextarea() {
        const activeTab = document.querySelector('.editor-tab.active').dataset.tab;
        if (activeTab === 'split') {
            return document.querySelector('.split-view .editor-textarea');
        }
        return document.getElementById('textInput');
    }

    // 获取当前预览容器
    function getPreviewContainer() {
        const activeTab = document.querySelector('.editor-tab.active').dataset.tab;
        if (activeTab === 'split') {
            return document.querySelector('.split-view .preview-container');
        }
        return document.querySelector('.preview-container');
    }

    // 更新字符计数
    function updateCharCount(count) {
        document.getElementById('charCount').textContent = \`\${count} 字符\`;
    }

    // 添加编辑器按钮事件监听
    document.addEventListener('DOMContentLoaded', () => {
        // 监听文本输入，保存状态
        document.querySelectorAll('.editor-textarea').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                saveState(e.target.value);
            });
        });

        // 添加工具栏按钮事件
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                const textarea = getActiveTextarea();

                switch(action) {
                    case 'undo':
                        handleUndo(textarea);
                        break;
                    case 'redo':
                        handleRedo(textarea);
                        break;
                    case 'clear':
                        handleClear(textarea);
                        break;
                    // ... 其他按钮的处理 ...
                }
            });
        });
    });
    </script>
    <script>${baseScript}</script>
</body>
</html>
`;

// 基础脚本
const baseScript = `
// 文本上传处理
document.getElementById('textInput').addEventListener('input', function() {
  const charCount = this.value.length;
  document.getElementById('charCount').textContent = \`\${charCount} 字符\`;
});

document.getElementById('textUploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const text = document.getElementById('textInput').value;
  if (!text.trim()) {
    alert('请输入要上传的文本');
    return;
  }

  const formData = new FormData();
  formData.append('text', text);
  
  const password = document.getElementById('textPassword').value;
  if (password) {
    formData.append('password', password);
  }
  
  const duration = document.getElementById('textDuration').value;
  formData.append('duration', duration);

  const customUrl = document.getElementById('customUrl').value;
  if (customUrl) {
    formData.append('customUrl', customUrl);
  }

  const maxViews = document.getElementById('maxViews').value;
  formData.append('maxViews', maxViews);

  const markdownEnabled = document.getElementById('markdownEnabled').checked;
  formData.append('markdown', markdownEnabled);

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (result.success) {
      const resultDiv = document.getElementById('result');
      const hasPassword = document.getElementById('textPassword').value;
      resultDiv.innerHTML = \`
        <div class="alert success">
          文本上传成功！<br>
          \${hasPassword ? '请记住您的密码！<br>' : ''}
          下载链接：<a href="/download/\${result.id}\${hasPassword ? '?password=' + encodeURIComponent(hasPassword) : ''}" target="_blank">/download/\${result.id}</a>
        </div>
      \`;
      // 清空表单
      document.getElementById('textInput').value = '';
      document.getElementById('textPassword').value = '';
      document.getElementById('customUrl').value = '';
      document.getElementById('maxViews').value = '0';
      document.getElementById('markdownEnabled').checked = false;
      document.getElementById('charCount').textContent = '0 字符';
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = \`
      <div class="alert error">
        上传失败：\${error.message}
      </div>
    \`;
  }
});

// 文件上传处理
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  const progressBar = document.getElementById('uploadProgress');
  const progress = progressBar.querySelector('.progress');
  progressBar.style.display = 'block';

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (result.success) {
      const resultDiv = document.getElementById('result');
      resultDiv.innerHTML = \`
        <div class="alert success">
          文件上传成功！<br>
          下载链接：<a href="/download/\${result.id}" target="_blank">/download/\${result.id}</a>
        </div>
      \`;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = \`
      <div class="alert error">
        上传失败：\${error.message}
      </div>
    \`;
  } finally {
    progressBar.style.display = 'none';
    progress.style.width = '0';
  }
});
`;

// 导出处理函数
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
  
  // 添加定时触发器
  async scheduled(event, env, ctx) {
    // 每天执行一次完整清理
    console.log('开始定期清理过期内容...');
    const deletedKeys = await CleanupManager.cleanExpiredContent(env);
    console.log(`清理完成，共删除 ${deletedKeys.length} 个过期项目`);
  }
}

// ... rest of the existing code ...
