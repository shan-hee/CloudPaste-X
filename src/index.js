import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// 启用CORS
app.use('*', cors())

// 静态文件服务
app.use('/', serveStatic({ root: './' }))
app.use('/*', serveStatic({ root: './' }))

// 文本上传处理
app.post('/text', async (c) => {
  try {
    const data = await c.req.json()
    const { text, customUrl, password, duration, maxViews } = data

    // TODO: 处理文本上传逻辑
    // 1. 验证文本
    // 2. 保存到KV存储
    
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

export default app 