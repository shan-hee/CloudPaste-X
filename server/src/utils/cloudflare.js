const { S3Client } = require('@aws-sdk/client-s3');
const Cloudflare = require('cloudflare');
const fetch = require('node-fetch');

// 初始化 R2 客户端
const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
});

// 初始化 Cloudflare API 客户端
const cf = new Cloudflare({
    token: process.env.CF_API_TOKEN
});

// KV API 基础 URL
const KV_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CF_KV_NAMESPACE_ID}`;

// KV 操作封装
const kv = {
    async get(key) {
        console.log('[KV.get] 获取键值:', key);
        try {
            const response = await fetch(`${KV_API_BASE}/values/${encodeURIComponent(key)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('[KV.get] 键不存在:', key);
                    return null;
                }
                const error = await response.json();
                console.error('[KV.get] 响应错误:', error);
                throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(error)}`);
            }

            const text = await response.text();
            try {
                const data = JSON.parse(text);
                console.log('[KV.get] 获取成功:', key);
                return data;
            } catch (parseError) {
                console.error('[KV.get] JSON解析错误:', parseError);
                return text;
            }
        } catch (err) {
            console.error('[KV.get] 错误:', err);
            throw err;
        }
    },

    async put(key, value) {
        console.log('[KV.put] 保存键值:', key);
        try {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            const response = await fetch(`${KV_API_BASE}/values/${encodeURIComponent(key)}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
                    'Content-Type': 'text/plain'
                },
                body: stringValue
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('[KV.put] 响应错误:', error);
                throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(error)}`);
            }
            console.log('[KV.put] 保存成功:', key);
        } catch (err) {
            console.error('[KV.put] 错误:', err);
            throw err;
        }
    },

    async delete(key) {
        console.log('[KV.delete] 删除键:', key);
        try {
            // 先检查键是否存在
            const existingValue = await this.get(key);
            if (existingValue === null) {
                console.log('[KV.delete] 键不存在，无需删除:', key);
                return;
            }

            // 尝试删除
            const maxRetries = 3;
            let retryCount = 0;
            let deleted = false;

            while (!deleted && retryCount < maxRetries) {
                try {
                    console.log(`[KV.delete] 尝试删除 (第${retryCount + 1}次):`, key);
                    const response = await fetch(`${KV_API_BASE}/values/${encodeURIComponent(key)}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        console.error('[KV.delete] 响应错误:', error);
                        throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(error)}`);
                    }

                    // 等待一小段时间让删除操作生效
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // 验证删除是否成功
                    const checkResponse = await this.get(key);
                    if (checkResponse === null) {
                        console.log('[KV.delete] 删除成功:', key);
                        deleted = true;
                        break;
                    } else {
                        console.warn('[KV.delete] 删除后键仍然存在，将重试:', key);
                        retryCount++;
                        if (retryCount < maxRetries) {
                            // 在重试之前等待更长时间
                            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
                        }
                    }
                } catch (err) {
                    console.error(`[KV.delete] 第${retryCount + 1}次删除尝试失败:`, err);
                    retryCount++;
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
                    } else {
                        throw err;
                    }
                }
            }

            if (!deleted) {
                throw new Error(`删除失败：在${maxRetries}次尝试后键仍然存在`);
            }
        } catch (err) {
            console.error('[KV.delete] 错误:', err);
            throw err;
        }
    },

    async list(prefix = '') {
        console.log('[KV.list] 列出键值, 前缀:', prefix);
        try {
            const url = new URL(`${KV_API_BASE}/keys`);
            if (prefix) {
                url.searchParams.append('prefix', prefix);
            }
            // 添加缓存控制参数
            url.searchParams.append('limit', '1000');
            url.searchParams.append('cursor', '');

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('[KV.list] 响应错误:', error);
                throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(error)}`);
            }

            const data = await response.json();
            if (!data.success) {
                console.error('[KV.list] API 返回失败:', data);
                throw new Error('API 返回失败: ' + JSON.stringify(data));
            }

            console.log('[KV.list] 原始响应:', data);
            console.log('[KV.list] 列出成功, 数量:', data.result.length);
            
            // 验证每个键是否真实存在
            const validKeys = [];
            for (const key of data.result) {
                const exists = await this.get(key.name);
                if (exists) {
                    validKeys.push(key);
                } else {
                    console.log('[KV.list] 忽略不存在的键:', key.name);
                }
            }
            
            console.log('[KV.list] 有效键数量:', validKeys.length);
            return validKeys;
        } catch (err) {
            console.error('[KV.list] 错误:', err);
            throw err;
        }
    }
};

// R2 操作封装
const r2 = {
    r2Client,
    async upload(key, file) {
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        await r2Client.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        }));
        return `${process.env.R2_PUBLIC_URL}/${key}`;
    },

    async download(key) {
        const { GetObjectCommand } = require('@aws-sdk/client-s3');
        const response = await r2Client.send(new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key
        }));
        return response.Body;
    },

    async delete(key) {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        await r2Client.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key
        }));
    }
};

module.exports = {
    kv,
    r2
}; 