import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// 启用CORS
app.use('*', cors())

// 静态文件服务
app.use('/', serveStatic({ root: './' }))
app.use('/*', serveStatic({ root: './' }))

// 获取存储列表
app.get('/api/share/storage', async (c) => {
  try {
    const env = c.env
    const kvList = await env.CLOUDPASTE_KV.list()
    const r2List = await env.CLOUDPASTE_BUCKET.list()

    // 转换数据格式以匹配前端期望
    const formattedKvList = kvList.keys.map(key => ({
      name: key.name,
      expiration: key.expiration || Math.floor(Date.now() / 1000) + 86400 // 如果没有过期时间，默认24小时
    }))

    const formattedR2List = (r2List.objects || []).map(obj => ({
      filename: obj.key,
      filesize: obj.size,
      mimetype: obj.httpMetadata?.contentType || 'application/octet-stream',
      uploaded: obj.uploaded
    }))

    return c.json({
      success: true,
      data: {
        kv: formattedKvList,
        r2: formattedR2List
      }
    })
  } catch (error) {
    console.error('获取存储列表失败:', error)
    return c.json({
      success: false,
      message: error.message || '获取存储列表失败'
    }, 500)
  }
})

// 获取统计信息
app.get('/api/share/stats', async (c) => {
  try {
    const env = c.env
    const kvList = await env.CLOUDPASTE_KV.list()
    const r2List = await env.CLOUDPASTE_BUCKET.list()

    const totalSize = (r2List.objects || []).reduce((acc, obj) => acc + (obj.size || 0), 0)
    const totalShares = kvList.keys.length
    const activeShares = kvList.keys.filter(key => !key.metadata?.expiresAt || key.metadata.expiresAt > Date.now()).length

    return c.json({
      success: true,
      data: {
        totalShares,
        activeShares,
        usedStorage: totalSize,
        totalStorage: 6 * 1024 * 1024 * 1024, // 6GB限制
        usagePercent: ((totalSize / (6 * 1024 * 1024 * 1024)) * 100).toFixed(2)
      }
    })
  } catch (error) {
    console.error('获取统计信息失败:', error)
    return c.json({
      success: false,
      message: error.message || '获取统计信息失败'
    }, 500)
  }
})

// 文本上传处理
app.post('/api/text', async (c) => {
  try {
    const data = await c.req.json()
    const { content, customUrl, password, duration, maxViews } = data

    console.log('收到文本上传请求:', {
      contentLength: content?.length,
      customUrl,
      password: password ? '已设置' : '未设置',
      duration,
      maxViews
    })

    // 生成唯一ID
    const id = customUrl || crypto.randomUUID()
    
    // 计算过期时间
    let expiresAt = null
    switch (duration) {
      case '1h':
        expiresAt = Date.now() + 60 * 60 * 1000
        break
      case '1d':
        expiresAt = Date.now() + 24 * 60 * 60 * 1000
        break
      case '7d':
        expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
        break
      case '30d':
        expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000
        break
      // never 的情况下 expiresAt 保持为 null
    }

    // 准备存储的数据
    const shareData = {
      id,
      type: 'text',
      content,
      password,
      maxViews: maxViews || 0,
      views: 0,
      created: Date.now(),
      expiresAt
    }

    // 存储到 KV
    await c.env.CLOUDPASTE_KV.put(id, JSON.stringify(shareData), {
      expirationTtl: expiresAt ? Math.ceil((expiresAt - Date.now()) / 1000) : undefined
    })

    console.log('文本分享创建成功:', id)
    
    return c.json({
      success: true,
      data: {
        id,
        url: `/s/${id}`,
        expiresAt
      }
    })
  } catch (error) {
    console.error('创建文本分享失败:', error)
    return c.json({
      success: false,
      message: error.message || '创建文本分享失败'
    }, 500)
  }
})

// 文件上传处理
app.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    const customUrl = formData.get('customUrl')
    const password = formData.get('password')
    const duration = formData.get('duration')
    const maxViews = formData.get('maxViews')

    // TODO: 处理文件上传逻辑
    // 1. 验证文件
    // 2. 上传到R2存储
    // 3. 保存元数据到KV
    
    return c.json({
      success: true,
      url: `https://example.com/${customUrl || 'generated-url'}`
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// 书签上传处理
app.post('/bookmark', async (c) => {
  try {
    const data = await c.req.json()
    const { url, title, description, customUrl, password, duration, maxViews } = data

    // TODO: 处理书签上传逻辑
    // 1. 验证URL
    // 2. 保存元数据到KV
    
    return c.json({
      success: true,
      url: `https://example.com/${customUrl || 'generated-url'}`
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// 下载处理
app.get('/download/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // TODO: 处理下载逻辑
    // 1. 从KV获取元数据
    // 2. 验证密码和访问次数
    // 3. 从R2获取文件或重定向到书签URL
    
    return c.json({
      success: true,
      message: '下载成功'
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

// 删除分享
app.delete('/api/share/:id', async (c) => {
  try {
    const id = c.req.param('id')
    console.log('处理删除请求:', id)

    // 从 KV 中获取分享信息
    const shareData = await c.env.CLOUDPASTE_KV.get(id, 'json')
    if (!shareData) {
      return c.json({
        success: false,
        message: '分享不存在'
      }, 404)
    }

    console.log('找到分享:', shareData)

    // 如果是文件类型，从 R2 中删除文件
    if (shareData.type === 'file' && shareData.filename) {
      console.log('删除 R2 文件:', shareData.filename)
      try {
        await c.env.CLOUDPASTE_BUCKET.delete(shareData.filename)
        console.log('R2 文件删除成功')
      } catch (err) {
        console.error('删除 R2 文件失败:', err)
        // 即使删除 R2 文件失败，也继续删除 KV 记录
      }
    }

    // 从 KV 中删除分享记录
    console.log('删除 KV 记录')
    await c.env.CLOUDPASTE_KV.delete(id)
    console.log('KV 记录删除成功')

    return c.json({
      success: true,
      message: '分享已删除'
    })
  } catch (error) {
    console.error('删除分享失败:', error)
    return c.json({
      success: false,
      message: error.message || '删除分享失败'
    }, 500)
  }
})

// 获取分享内容
app.get('/s/:id', async (c) => {
  try {
    const id = c.req.param('id')
    console.log('获取分享内容:', id)

    // 检查请求类型
    const acceptHeader = c.req.header('Accept') || '';
    const isApiRequest = acceptHeader === 'application/json' || // 精确匹配 application/json
                        c.req.header('X-Requested-With') === 'XMLHttpRequest'; // 检查是否为 XHR 请求

    console.log('请求类型:', isApiRequest ? 'API请求' : '页面请求');

    // 如果不是 API 请求，返回 HTML 页面
    if (!isApiRequest) {
      return c.redirect(`/share.html?id=${id}`);
    }

    // 从 KV 中获取分享数据
    console.log('从 KV 获取数据:', id);
    const shareData = await c.env.CLOUDPASTE_KV.get(id, 'json')
    if (!shareData) {
      console.log('分享不存在:', id);
      return c.json({
        success: false,
        message: '分享不存在或已过期'
      }, 404)
    }

    console.log('获取到分享数据:', shareData);

    // 检查是否过期
    if (shareData.expiresAt && shareData.expiresAt < Date.now()) {
      console.log('分享已过期:', id);
      return c.json({
        success: false,
        message: '分享已过期'
      }, 404)
    }

    // 检查访问次数
    if (shareData.maxViews > 0 && shareData.views >= shareData.maxViews) {
      console.log('分享已达到最大访问次数:', id);
      return c.json({
        success: false,
        message: '分享已达到最大访问次数'
      }, 404)
    }

    // 增加访问次数
    shareData.views += 1
    console.log('更新访问次数:', shareData.views);
    await c.env.CLOUDPASTE_KV.put(id, JSON.stringify(shareData), {
      expirationTtl: shareData.expiresAt ? Math.ceil((shareData.expiresAt - Date.now()) / 1000) : undefined
    })

    // 根据分享类型返回不同的响应
    switch (shareData.type) {
      case 'text':
        return c.json({
          success: true,
          data: {
            type: 'text',
            content: shareData.content,
            created: shareData.created,
            views: shareData.views,
            expiresAt: shareData.expiresAt,
            hasPassword: !!shareData.password
          }
        })

      case 'file':
        // 获取文件的签名 URL
        const url = await c.env.CLOUDPASTE_BUCKET.createSignedUrl(shareData.filename, {
          expirationTtl: 3600 // URL 有效期 1 小时
        })
        return c.json({
          success: true,
          data: {
            type: 'file',
            filename: shareData.filename,
            filesize: shareData.filesize,
            mimetype: shareData.mimetype,
            url: url,
            created: shareData.created,
            views: shareData.views,
            expiresAt: shareData.expiresAt,
            hasPassword: !!shareData.password
          }
        })

      default:
        console.log('不支持的分享类型:', shareData.type);
        return c.json({
          success: false,
          message: '不支持的分享类型'
        }, 400)
    }
  } catch (error) {
    console.error('获取分享内容失败:', error);
    console.error('错误堆栈:', error.stack);
    return c.json({
      success: false,
      message: error.message || '获取分享内容失败'
    }, 500)
  }
})

// 验证分享密码
app.post('/s/:id/verify', async (c) => {
  try {
    const id = c.req.param('id')
    const { password } = await c.req.json()

    // 从 KV 中获取分享数据
    const shareData = await c.env.CLOUDPASTE_KV.get(id, 'json')
    if (!shareData) {
      return c.json({
        success: false,
        message: '分享不存在或已过期'
      }, 404)
    }

    // 验证密码
    if (shareData.password !== password) {
      return c.json({
        success: false,
        message: '密码错误'
      }, 403)
    }

    return c.json({
      success: true,
      message: '密码验证成功'
    })
  } catch (error) {
    console.error('验证密码失败:', error)
    return c.json({
      success: false,
      message: error.message || '验证密码失败'
    }, 500)
  }
})

export default app 