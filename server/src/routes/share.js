const express = require('express');
const router = express.Router();
const Share = require('../models/Share');
const { v4: uuidv4 } = require('uuid');
const { kv, r2 } = require('../utils/cloudflare');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');

// 获取分享列表
router.get('/list', async (req, res) => {
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
    try {
        const share = await Share.findOne({ id: req.params.id });
        if (!share) {
            return res.status(404).json({
                success: false,
                message: '分享不存在'
            });
        }


        // 如果是文件类型，删除 R2 中的文件
        if (share.type === 'file' && share.filename) {
            try {
                await r2.delete(share.filename);
            } catch (err) {
                console.error('[删除分享] 删除 R2 文件失败:', err);
                // 即使删除 R2 文件失败，也继续删除 KV 记录
            }
        }

        // 删除 KV 记录
        await Share.findOneAndDelete({ id: req.params.id });

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
router.stack.forEach(layer => {
    if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(',');
    }
});

module.exports = router; 