const { kv } = require('../utils/cloudflare');

// 缓存配置
const CACHE_TTL = 60 * 1000; // 缓存1分钟
let statsCache = {
    data: null,
    timestamp: 0
};

class Share {
    constructor(data) {
        this.id = data.id;
        this.type = data.type;
        this.content = data.content;
        this.filename = data.filename;
        this.originalname = data.originalname;
        this.filesize = data.filesize;
        this.mimetype = data.mimetype;
        this.password = data.password;
        this.expiresAt = data.expiresAt;
        this.maxViews = data.maxViews || 0;
        this.views = data.views || 0;
        this.customUrl = data.customUrl;
        this.created = data.created || new Date();
        this.lastAccessed = data.lastAccessed || new Date();
    }

    // 保存分享
    async save() {
        const key = this.customUrl || this.id;
        const data = {
            id: this.id,
            type: this.type,
            content: this.content,
            filename: this.filename,
            originalname: this.originalname,
            filesize: this.filesize,
            mimetype: this.mimetype,
            password: this.password,
            expiresAt: this.expiresAt,
            maxViews: this.maxViews,
            views: this.views,
            customUrl: this.customUrl,
            created: this.created,
            lastAccessed: this.lastAccessed
        };
        await kv.put(key, data);
        if (this.customUrl) {
            await kv.put(this.id, data);
        }
        // 清除缓存
        statsCache.data = null;
        return this;
    }

    // 查找单个分享
    static async findOne(query) {
        let share = null;
        if (query.id) {
            share = await kv.get(query.id);
        } else if (query.customUrl) {
            share = await kv.get(query.customUrl);
        } else if (query.$or) {
            for (const condition of query.$or) {
                if (condition.id) {
                    share = await kv.get(condition.id);
                } else if (condition.customUrl) {
                    share = await kv.get(condition.customUrl);
                }
                if (share) break;
            }
        }

        if (!share) return null;

        // 检查是否过期
        if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
            await kv.delete(share.id);
            if (share.customUrl) {
                await kv.delete(share.customUrl);
            }
            // 清除缓存
            statsCache.data = null;
            return null;
        }

        return new Share(share);
    }

    // 查找所有分享
    static async find(query = {}) {
        try {
            const shares = new Map(); // 使用 Map 来去重
            const keys = await kv.list();
            const now = new Date();
            
            // 批量获取所有值
            const values = await Promise.all(
                keys.map(key => kv.get(key.name))
            );
            
            for (const share of values) {
                if (!share || !share.id) continue;
                
                // 检查是否过期
                if (share.expiresAt && new Date(share.expiresAt) < now) {
                    // 将过期的 key 添加到删除队列
                    await kv.delete(share.id);
                    if (share.customUrl) {
                        await kv.delete(share.customUrl);
                    }
                    continue;
                }

                // 应用查询条件
                if (query.type && share.type !== query.type) continue;
                if (query.expiresAt && query.expiresAt.$gt) {
                    if (new Date(share.expiresAt) <= new Date(query.expiresAt.$gt)) continue;
                }

                // 使用 id 作为 key 来去重
                if (!shares.has(share.id)) {
                    shares.set(share.id, new Share(share));
                }
            }

            // 转换 Map 为数组并按创建时间排序
            return Array.from(shares.values())
                .sort((a, b) => new Date(b.created) - new Date(a.created));
        } catch (err) {
            console.error('查找分享列表时出错:', err);
            throw new Error('查找分享列表失败');
        }
    }

    // 获取统计数据（带缓存）
    static async getStats() {
        const now = Date.now();
        
        // 如果缓存有效，直接返回缓存数据
        if (statsCache.data && (now - statsCache.timestamp) < CACHE_TTL) {
            return statsCache.data;
        }

        try {
            const shares = new Map(); // 使用 Map 来去重
            const keys = await kv.list();
            console.log('获取到的KV列表:', keys);

            const values = await Promise.all(
                keys.map(key => kv.get(key.name))
            );

            let totalSize = 0;
            const currentTime = new Date();

            for (const share of values) {
                if (!share || !share.id) continue;

                // 检查是否过期
                if (share.expiresAt && new Date(share.expiresAt) < currentTime) {
                    // 将过期的 key 添加到删除队列
                    await kv.delete(share.id);
                    if (share.customUrl) {
                        await kv.delete(share.customUrl);
                    }
                    continue;
                }

                // 检查是否是手动上传的文件
                if (!share.isManualUpload) continue;

                // 使用 id 作为 key 来去重
                if (!shares.has(share.id)) {
                    shares.set(share.id, share);
                    if (share.type === 'file' && share.filesize) {
                        totalSize += share.filesize;
                    }
                }
            }

            const totalShares = shares.size;
            const activeShares = Array.from(shares.values())
                .filter(share => !share.expiresAt || new Date(share.expiresAt) > currentTime)
                .length;

            // 更新缓存
            statsCache = {
                data: { totalShares, activeShares, totalSize },
                timestamp: now
            };

            return statsCache.data;
        } catch (err) {
            console.error('获取统计数据时出错:', err);
            throw new Error('获取统计数据失败');
        }
    }

    // 统计文档数量
    static async countDocuments(query = {}) {
        try {
            // 如果是统计总数或活跃分享数，使用缓存的统计数据
            if (!query || Object.keys(query).length === 0 || 
                (query.expiresAt && query.expiresAt.$gt)) {
                const stats = await this.getStats();
                if (!query || Object.keys(query).length === 0) {
                    return stats.totalShares;
                }
                return stats.activeShares;
            }

            // 其他查询条件走正常流程
            const keys = await kv.list();
            let count = 0;
            const values = await Promise.all(
                keys.map(key => kv.get(key.name))
            );
            
            for (const share of values) {
                if (!share) continue;
                if (query.type && share.type !== query.type) continue;
                count++;
            }
            
            return count;
        } catch (err) {
            console.error('统计文档数量时出错:', err);
            throw new Error('统计文档数量失败');
        }
    }

    // 删除分享
    static async findOneAndDelete(query) {
        console.log('[Share.findOneAndDelete] 开始删除分享:', query);
        try {
            const share = await this.findOne(query);
            if (share) {
                console.log('[Share.findOneAndDelete] 找到分享，准备删除:', share);
                
                // 获取所有可能的键
                const keysToDelete = [share.id];
                if (share.customUrl) {
                    keysToDelete.push(share.customUrl);
                }

                // 删除所有相关记录
                console.log('[Share.findOneAndDelete] 删除以下键:', keysToDelete);
                await Promise.all(keysToDelete.map(key => kv.delete(key)));

                // 清除缓存
                statsCache.data = null;
                console.log('[Share.findOneAndDelete] 缓存已清除');
            } else {
                console.log('[Share.findOneAndDelete] 未找到分享:', query);
            }
            return share;
        } catch (err) {
            console.error('[Share.findOneAndDelete] 删除分享时出错:', err);
            throw err;
        }
    }
}

module.exports = Share; 