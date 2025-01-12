const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const Share = require('../models/Share');
const { r2 } = require('../utils/cloudflare');

// 配置内存存储，用于临时存储文件
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100000000 // 默认100MB
    }
});

// 上传文件
router.post('/', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const { password, duration, customUrl, maxViews } = req.body;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: '未找到上传的文件'
            });
        }

        // 计算过期时间
        let expiresAt = new Date();
        switch (duration) {
            case '1h':
                expiresAt.setHours(expiresAt.getHours() + 1);
                break;
            case '1d':
                expiresAt.setDate(expiresAt.getDate() + 1);
                break;
            case '7d':
                expiresAt.setDate(expiresAt.getDate() + 7);
                break;
            case '30d':
                expiresAt.setDate(expiresAt.getDate() + 30);
                break;
            case 'never':
                expiresAt = null;
                break;
            default:
                expiresAt.setDate(expiresAt.getDate() + 1); // 默认1天
        }

        // 处理密码
        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // 生成唯一文件名
        const fileId = uuidv4();
        const fileKey = `${fileId}${file.originalname.substring(file.originalname.lastIndexOf('.'))}`;

        // 上传到 R2
        await r2.upload(fileKey, file);

        // 创建分享
        const share = new Share({
            id: fileId,
            type: 'file',
            filename: fileKey,
            originalname: file.originalname,
            filesize: file.size,
            mimetype: file.mimetype,
            password: hashedPassword,
            expiresAt,
            maxViews: maxViews || 0,
            customUrl: customUrl || null
        });

        await share.save();

        res.json({
            success: true,
            data: {
                id: share.id,
                url: customUrl ? `/s/${customUrl}` : `/s/${share.id}`
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// 下载文件
router.get('/:id', async (req, res) => {
    try {
        const share = await Share.findOne({
            $or: [
                { id: req.params.id },
                { customUrl: req.params.id }
            ]
        });

        if (!share) {
            return res.status(404).json({
                success: false,
                message: '分享不存在或已过期'
            });
        }

        // 检查是否需要密码
        if (share.password && !req.headers['x-access-token']) {
            return res.status(403).json({
                success: false,
                message: '需要密码访问',
                requirePassword: true
            });
        }

        // 验证密码
        if (share.password) {
            const isValid = await bcrypt.compare(req.headers['x-access-token'], share.password);
            if (!isValid) {
                return res.status(403).json({
                    success: false,
                    message: '密码错误'
                });
            }
        }

        // 检查访问次数
        if (share.maxViews > 0 && share.views >= share.maxViews) {
            return res.status(403).json({
                success: false,
                message: '已达到最大访问次数'
            });
        }

        // 更新访问信息
        share.views += 1;
        share.lastAccessed = new Date();
        await share.save();

        // 从 R2 获取文件
        const fileStream = await r2.download(share.filename);
        res.setHeader('Content-Type', share.mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(share.originalname)}"`);
        fileStream.pipe(res);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

module.exports = router; 