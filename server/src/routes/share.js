const express = require('express');
const router = express.Router();
const Share = require('../models/Share');
const { v4: uuidv4 } = require('uuid');
const { kv, r2 } = require('../utils/cloudflare');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');

console.log('\n=== share路由模块加载开始 ===');

// 获取 KV 和 R2 存储列表
router.get('/storage', async (req, res) => {
    console.log('[存储列表] 开始处理请求');
    try {
        console.log('[存储列表] 获取 KV 列表...');
        // 获取 KV 列表
        const kvList = await kv.list();
        console.log('[存储列表] KV 列表获取成功:', kvList);

        console.log('[存储列表] 获取 R2 列表...');
        // 获取 R2 列表
        const r2List = await r2.r2Client.send(new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME
        }));
        console.log('[存储列表] R2 列表获取成功:', r2List);

        console.log('[存储列表] 准备发送响应');
        res.json({
            success: true,
            data: {
                kv: kvList,
                r2: r2List.Contents || []
            }
        });
        console.log('[存储列表] 响应发送完成');
    } catch (err) {
        console.error('[存储列表] 发生错误:', err);
        res.status(500).json({
            success: false,
            message: err.message || '获取存储列表失败'
        });
    }
});

// 获取分享列表
router.get('/list', async (req, res) => {
    console.log('处理 /list 请求');
    try {
        const shares = await Share.find()
            .select('-content')
            .sort({ created: -1 });
        res.json({
            success: true,
            data: shares
        });
    } catch (err) {
        console.error('获取分享列表失败:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// 获取存储使用统计
router.get('/stats', async (req, res) => {
    try {
        const stats = await Share.getStats();
        
        res.json({
            success: true,
            data: {
                totalShares: stats.totalShares,
                activeShares: stats.activeShares,
                usedStorage: stats.totalSize,
                totalStorage: 6 * 1024 * 1024 * 1024, // 6GB限制
                usagePercent: ((stats.totalSize / (6 * 1024 * 1024 * 1024)) * 100).toFixed(2)
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// 删除分享
router.delete('/:id', async (req, res) => {
    console.log('[删除分享] 开始处理删除请求:', req.params.id);
    try {
        const share = await Share.findOne({ id: req.params.id });
        if (!share) {
            console.log('[删除分享] 分享不存在:', req.params.id);
            return res.status(404).json({
                success: false,
                message: '分享不存在'
            });
        }

        console.log('[删除分享] 找到分享:', share);

        // 如果是文件类型，删除 R2 中的文件
        if (share.type === 'file' && share.filename) {
            console.log('[删除分享] 删除 R2 文件:', share.filename);
            try {
                await r2.delete(share.filename);
                console.log('[删除分享] R2 文件删除成功');
            } catch (err) {
                console.error('[删除分享] 删除 R2 文件失败:', err);
                // 即使删除 R2 文件失败，也继续删除 KV 记录
            }
        }

        // 删除 KV 记录
        console.log('[删除分享] 删除 KV 记录');
        await Share.findOneAndDelete({ id: req.params.id });
        console.log('[删除分享] KV 记录删除成功');

        res.json({
            success: true,
            message: '分享已删除'
        });
    } catch (err) {
        console.error('[删除分享] 删除失败:', err);
        res.status(500).json({
            success: false,
            message: err.message || '删除分享失败'
        });
    }
});

// 打印路由信息
console.log('\n=== share路由已注册的路径 ===');
router.stack.forEach(layer => {
    if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(',');
        console.log(`${methods.toUpperCase()} ${layer.route.path}`);
    }
});
console.log('=== share路由模块加载完成 ===\n');

module.exports = router; 