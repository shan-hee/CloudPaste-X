require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// 导入路由
console.log('开始导入路由模块...');
const textRoutes = require('./routes/text');
const fileRoutes = require('./routes/file');
const shareRoutes = require('./routes/share');
console.log('路由模块导入完成');

const app = express();

// 中间件
console.log('配置中间件...');
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 添加请求日志中间件
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] 收到请求: ${req.method} ${req.url}`);
    console.log('请求头:', req.headers);
    next();
});

// 路由
console.log('开始注册路由...');
app.use('/api/text', textRoutes);
app.use('/api/file', fileRoutes);
app.use('/api/share', shareRoutes);
console.log('路由注册完成');

// 打印已注册的路由
console.log('\n=== 已注册的路由 ===');
function printRoutes(stack, basePath = '') {
    stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(',');
            console.log(`${methods.toUpperCase()} ${basePath}${layer.route.path}`);
        } else if (layer.name === 'router') {
            console.log(`\n=== 子路由 ${layer.regexp} ===`);
            printRoutes(layer.handle.stack, basePath + layer.regexp.toString().replace('/^', '').replace('/(?=\\/|$)/i', ''));
        }
    });
}
printRoutes(app._router.stack);
console.log('\n=== 路由打印完成 ===\n');

// 静态文件服务
app.use(express.static(path.join(__dirname, '../../public')));

// 处理分享链接路由
app.get('/s/:id', async (req, res) => {
    try {
        const share = await require('./models/Share').findOne({
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

        // 检查请求类型
        const isApiRequest = req.xhr || 
                           req.headers.accept.includes('application/json') ||
                           req.headers['content-type']?.includes('application/json');

        if (isApiRequest) {
            // API请求返回JSON数据
            return res.json({
                success: true,
                data: {
                    type: share.type,
                    content: share.content,
                    created: share.created,
                    views: share.views,
                    expiresAt: share.expiresAt
                }
            });
        }

        // 页面请求返回HTML
        res.sendFile(path.join(__dirname, '../../public/share.html'));
    } catch (err) {
        console.error('获取分享内容时出错:', err);
        res.status(500).json({
            success: false,
            message: err.message || '服务器内部错误'
        });
    }
});

// 更新分享内容
app.put('/s/:id', async (req, res) => {
    try {
        const { content, maxViews } = req.body;
        
        // 验证必需字段
        if (!content) {
            return res.status(400).json({
                success: false,
                message: '内容不能为空'
            });
        }

        const share = await require('./models/Share').findOne({
            $or: [
                { id: req.params.id },
                // { customUrl: req.params.id }
            ]
        });

        if (!share) {
            return res.status(404).json({
                success: false,
                message: '分享不存在或已过期'
            });
        }

        // 更新内容和访问次数
        share.content = content;
        if (typeof maxViews === 'number') {
            share.maxViews = maxViews;
        }
        
        await share.save();

        res.json({
            success: true,
            message: '更新成功',
            data: {
                content: share.content,
                views: share.views,
                maxViews: share.maxViews
            }
        });
    } catch (err) {
        console.error('更新分享内容失败:', err);
        res.status(500).json({
            success: false,
            message: err.message || '更新分享内容失败'
        });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('错误:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || '服务器内部错误'
    });
});

// 404 处理
app.use((req, res) => {
    console.log('404 请求:', req.method, req.url);
    res.status(404).json({
        success: false,
        message: '请求的资源不存在'
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('\n=== 服务器启动完成 ===\n');
});

module.exports = app; 