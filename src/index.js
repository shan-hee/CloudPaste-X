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
app.get('/api/file', async (c) => {
    try {
        // 获取所有KV存储的键
        const kvList = await c.env.CLOUDPASTE_KV.list();
        const r2List = await c.env.CLOUDPASTE_BUCKET.list();

        console.log('KV列表:', kvList.keys);

        // 获取所有KV值
        const kvValues = await Promise.all(
            kvList.keys.map(async key => {
                const value = await c.env.CLOUDPASTE_KV.get(key.name, 'json');
                console.log('KV值:', key.name, value);
                return { ...value, name: key.name };
            })
        );

        // 过滤和处理KV数据（文本分享）
        const kvData = kvValues
            .filter(item => {
                console.log('过滤项:', item);
                return item && 
                       item.type === 'text' && 
                       !item.name?.startsWith('temp_') &&
                       (!item.expiresAt || item.expiresAt > Date.now());
            })
            .map(item => ({
                id: item.id || item.name,
                type: 'text',
                content: item.content,
                filename: item.filename || 'CloudPaste-Text',
                expiration: item.expiresAt,
                createdAt: item.createdAt || item.created || Date.now()
            }));

        console.log('处理后的文本分享:', kvData);

        // 处理R2数据（文件分享）
        const r2Data = (r2List.objects || []).map(obj => {
            // 尝试从KV数据中找到对应的元数据
            const metadata = kvValues.find(kv => kv.id === obj.key);
            return {
                id: obj.key,
                filename: obj.key,
                filesize: obj.size,
                originalname: metadata?.originalname || obj.key,
                type: 'file',
                expiration: metadata?.expiresAt,
                createdAt: metadata?.createdAt || metadata?.created || Date.now()
            };
        }).filter(item => !item.expiration || item.expiration > Date.now());

        console.log('处理后的文件分享:', r2Data);

        return c.json({
            success: true,
            data: {
                kv: kvData,
                r2: r2Data
            }
        });
    } catch (error) {
        console.error('获取分享列表失败:', error);
        return c.json({
            success: false,
            message: error.message || '获取分享列表失败'
        }, 500);
    }
});

// 获取统计信息
app.get('/api/share/stats', async (c) => {
  try {
    const env = c.env
    const kvList = await env.CLOUDPASTE_KV.list()
    const r2List = await env.CLOUDPASTE_BUCKET.list()

    console.log('原始KV列表:', kvList.keys)
    console.log('原始R2列表:', r2List.objects)

    // 获取所有KV值
    const kvValues = await Promise.all(
      kvList.keys.map(async key => {
        const value = await env.CLOUDPASTE_KV.get(key.name, 'json')
        console.log('KV值:', key.name, value)
        return { ...value, name: key.name }
      })
    )

    console.log('所有KV值:', kvValues)

    // 过滤有效的文本分享
    const validTextShares = kvValues.filter(item => {
      const isValid = item && 
        item.type === 'text' && 
        !item.name?.startsWith('temp_') &&
        (!item.expiresAt || item.expiresAt > Date.now())
      console.log('文本分享过滤:', item?.name, isValid)
      return isValid
    })

    console.log('有效文本分享:', validTextShares)

    // 过滤有效的文件分享
    const validFileShares = kvValues.filter(item => {
      const isValid = item && 
        item.type === 'file' && 
        !item.name?.startsWith('temp_') &&
        (!item.expiresAt || item.expiresAt > Date.now())
      console.log('文件分享过滤:', item?.name, isValid)
      return isValid
    })

    console.log('有效文件分享:', validFileShares)

    // 计算总分享数和活跃分享数
    const totalShares = validTextShares.length + validFileShares.length
    const activeShares = totalShares // 因为上面已经过滤了过期的，所以这里相同

    // 计算已用存储空间
    const textSize = validTextShares.reduce((acc, item) => {
      const size = item.content ? new TextEncoder().encode(item.content).length : 0
      console.log('文本大小:', item.name, size)
      return acc + size
    }, 0)

    const fileSize = validFileShares.reduce((acc, item) => {
      const size = item.filesize || 0
      console.log('文件大小:', item.name, size)
      return acc + size
    }, 0)

    const totalSize = textSize + fileSize
    
    // 从环境变量获取总容量（GB），默认6GB
    const totalStorageGB = parseInt(env.TOTAL_STORAGE_GB) || 6
    const totalStorage = totalStorageGB * 1024 * 1024 * 1024 // 转换为字节
    const usagePercent = (totalSize / totalStorage) * 100
    
    // 计算存储空间状态
    let storageStatus = 'normal'
    if (usagePercent >= 90) {
      storageStatus = 'danger'
    } else if (usagePercent >= 70) {
      storageStatus = 'warning'
    }

    console.log('最终统计信息:', {
      totalShares,
      activeShares,
      textShares: validTextShares.length,
      fileShares: validFileShares.length,
      textSize,
      fileSize,
      totalSize,
      usagePercent,
      storageStatus
    })

    return c.json({
      success: true,
      data: {
        totalShares,
        activeShares,
        usedStorage: totalSize,
        totalStorage,
        usagePercent: usagePercent.toFixed(2),
        storageStatus
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
    const { content, filename, password, duration, maxViews } = data

    console.log('收到文本上传请求:', {
      contentLength: content?.length,
      filename,
      password: password ? '已设置' : '未设置',
      duration,
      maxViews
    })

    // 验证上传权限
    const permissionCheck = await checkUploadPermission(c, 'text');
    if (permissionCheck !== true) {
      return permissionCheck;
    }

    // 生成唯一ID
    const id = crypto.randomUUID()
    
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
      filename: data.filename,
      password,
      maxViews: maxViews || 0,
      views: 0,
      created: Date.now(),
      createdAt: Date.now(),  // 添加 createdAt 字段
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
        expiresAt,
        createdAt: shareData.createdAt  // 返回创建时间
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
app.post('/api/file', async (c) => {
    try {
        const formData = await c.req.formData();
        const file = formData.get('file');
        const customUrl = formData.get('customUrl');
        const password = formData.get('password');
        const duration = formData.get('duration');
        const maxViews = formData.get('maxViews');
        const originalname = formData.get('originalname');  // 获取原始文件名

        if (!file) {
            return c.json({
                success: false,
                message: '未找到上传的文件'
            }, 400);
        }

        // 检查文件大小
        const maxFileSize = parseInt(c.env.MAX_FILE_SIZE || '100') * 1024 * 1024; // 转换为字节
        if (file.size > maxFileSize) {
            return c.json({
                success: false,
                message: `文件大小超过限制（${parseInt(c.env.MAX_FILE_SIZE || '100')}MB）`
            }, 400);
        }

        // 验证上传权限
        const permissionCheck = await checkUploadPermission(c, 'file');
        if (permissionCheck !== true) {
            return permissionCheck;
        }

        // 生成唯一ID
        const id = customUrl || crypto.randomUUID();
        
        // 计算过期时间
        let expiresAt = null;
        switch (duration) {
            case '1h':
                expiresAt = Date.now() + 60 * 60 * 1000;
                break;
            case '1d':
                expiresAt = Date.now() + 24 * 60 * 60 * 1000;
                break;
            case '7d':
                expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
                break;
            case '30d':
                expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
                break;
            // never 的情况下 expiresAt 保持为 null
        }

        // 上传文件到 R2
        const arrayBuffer = await file.arrayBuffer();
        await c.env.CLOUDPASTE_BUCKET.put(id, arrayBuffer, {
            httpMetadata: {
                contentType: file.type
            }
        });

        // 准备存储的元数据
        const shareData = {
            id,
            type: 'file',
            filename: file.name,
            originalname: originalname || file.name,  // 使用传入的原始文件名或默认为文件名
            filesize: file.size,
            mimetype: file.type,
            password,
            maxViews: maxViews ? parseInt(maxViews) : 0,
            views: 0,
            created: Date.now(),
            createdAt: Date.now(),  // 添加 createdAt 字段
            expiresAt,
            isManualUpload: true  // 添加手动上传标记
        };

        // 存储元数据到 KV
        await c.env.CLOUDPASTE_KV.put(id, JSON.stringify(shareData), {
            expirationTtl: expiresAt ? Math.ceil((expiresAt - Date.now()) / 1000) : undefined
        });

        console.log('文件分享创建成功:', id);
        
        return c.json({
            success: true,
            data: {
                id,
                url: `/s/${id}`,
                filename: file.name,
                expiresAt,
                createdAt: shareData.createdAt  // 返回创建时间
            }
        });
    } catch (error) {
        console.error('创建文件分享失败:', error);
        return c.json({
            success: false,
            message: error.message || '创建文件分享失败'
        }, 500);
    }
});

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

// 更新文本内容
app.put('/api/text/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    const { content, password, duration, maxViews } = data

    // 从 KV 中获取原始分享数据
    const shareData = await c.env.CLOUDPASTE_KV.get(id, 'json')
    if (!shareData) {
      return c.json({
        success: false,
        message: '分享不存在'
      }, 404)
    }

    // 验证分享类型
    if (shareData.type !== 'text') {
      return c.json({
        success: false,
        message: '只能更新文本类型的分享'
      }, 400)
    }

    // 计算新的过期时间
    let expiresAt = null
    if (duration) {
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
      }
    }

    // 更新分享数据
    const updatedShareData = {
      ...shareData,
      content: content || shareData.content,
      password: password || shareData.password,
      maxViews: maxViews || shareData.maxViews,
      expiresAt: expiresAt || shareData.expiresAt,
      updated: Date.now()
    }

    // 存储更新后的数据到 KV
    await c.env.CLOUDPASTE_KV.put(id, JSON.stringify(updatedShareData), {
      expirationTtl: updatedShareData.expiresAt ? Math.ceil((updatedShareData.expiresAt - Date.now()) / 1000) : undefined
    })

    console.log('文本分享更新成功:', id)
    
    return c.json({
      success: true,
      data: {
        id,
        url: `/s/${id}`,
        expiresAt: updatedShareData.expiresAt
      }
    })
  } catch (error) {
    console.error('更新文本分享失败:', error)
    return c.json({
      success: false,
      message: error.message || '更新文本分享失败'
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
    if (shareData.type === 'file') {
      console.log('删除 R2 文件:', id)
      try {
        await c.env.CLOUDPASTE_BUCKET.delete(id)
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
        const id = c.req.param('id');
        const isApi = c.req.header('X-Requested-With') === 'XMLHttpRequest';
        
        // 如果不是API请求，重定向到share.html页面
        if (!isApi) {
            return c.redirect(`/share.html?id=${id}`);
        }
        
        // 从 KV 中获取分享数据
        const shareData = await c.env.CLOUDPASTE_KV.get(id, 'json');
        if (!shareData) {
            return c.json({
                success: false,
                message: '分享不存在或已过期'
            }, 404);
        }

        // 检查是否过期
        if (shareData.expiresAt && Date.now() > shareData.expiresAt) {
            return c.json({
                success: false,
                message: '分享已过期'
            }, 410);
        }

        // 检查是否需要密码
        if (shareData.password) {
            const accessToken = c.req.header('X-Access-Token');
            if (!accessToken) {
                return c.json({
                    success: false,
                    message: '需要密码访问',
                    requirePassword: true
                }, 403);
            }

            // 验证密码
            if (shareData.password !== accessToken) {
                return c.json({
                    success: false,
                    message: '密码错误'
                }, 403);
            }
        }

        // 检查访问次数
        if (shareData.maxViews > 0 && shareData.views >= shareData.maxViews) {
            return c.json({
                success: false,
                message: '分享已达到最大访问次数'
            }, 410);
        }

        // 更新访问次数
        shareData.views = (shareData.views || 0) + 1;
        await c.env.CLOUDPASTE_KV.put(id, JSON.stringify(shareData), {
            expirationTtl: shareData.expiresAt ? Math.ceil((shareData.expiresAt - Date.now()) / 1000) : undefined
        });

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
                        maxViews: shareData.maxViews,
                        expiresAt: shareData.expiresAt,
                        hasPassword: !!shareData.password
                    }
                });

            case 'file':
                return c.json({
                    success: true,
                    data: {
                        type: 'file',
                        filename: shareData.filename,
                        originalname: shareData.originalname,
                        size: shareData.filesize,
                        mimeType: shareData.mimetype,
                        created: shareData.created,
                        views: shareData.views,
                        maxViews: shareData.maxViews,
                        expiresAt: shareData.expiresAt,
                        hasPassword: !!shareData.password
                    }
                });

            default:
                return c.json({
                    success: false,
                    message: '不支持的分享类型'
                }, 400);
        }
    } catch (error) {
        console.error('获取分享内容失败:', error);
        return c.json({
            success: false,
            message: error.message || '获取分享内容失败'
        }, 500);
    }
});

// 文件下载处理
app.get('/s/:id/download', async (c) => {
    try {
        const id = c.req.param('id');
        
        // 从 KV 中获取分享数据
        const shareData = await c.env.CLOUDPASTE_KV.get(id, 'json');
        if (!shareData || shareData.type !== 'file') {
            return c.json({
                success: false,
                message: '文件不存在或已过期'
            }, 404);
        }

        // 检查是否过期
        if (shareData.expiresAt && Date.now() > shareData.expiresAt) {
            return c.json({
                success: false,
                message: '文件已过期'
            }, 410);
        }

        // 从 R2 获取文件
        const file = await c.env.CLOUDPASTE_BUCKET.get(id);
        if (!file) {
            return c.json({
                success: false,
                message: '文件不存在'
            }, 404);
        }

        // 设置响应头
        const headers = new Headers();
        headers.set('Content-Type', shareData.mimetype || 'application/octet-stream');
        headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(shareData.originalname || shareData.filename)}"`);

        // 返回文件内容
        return new Response(file.body, { headers });
    } catch (error) {
        console.error('下载文件失败:', error);
        return c.json({
            success: false,
            message: error.message || '下载文件失败'
        }, 500);
    }
});

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

// 管理员登录验证
app.post('/api/admin/login', async (c) => {
  try {
    const { username, password } = await c.req.json()

    // 从环境变量获取管理员凭证，如果未配置则使用默认值
    const adminUsername = c.env.ADMIN_USERNAME || 'admin'
    const adminPassword = c.env.ADMIN_PASSWORD || 'admin'

    // 验证用户名和密码
    if (username === adminUsername && password === adminPassword) {
      // 生成会话ID
      const sessionId = crypto.randomUUID()
      
      // 计算过期时间
      let expiresAt = null
      switch (c.env.SESSION_DURATION || '7d') {
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
        default:
          expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 默认7天
      }

      // 保存会话信息到KV
      const sessionData = {
        username: adminUsername,
        createdAt: Date.now(),
        expiresAt
      }
      await c.env.CLOUDPASTE_KV.put(`session_${sessionId}`, JSON.stringify(sessionData), {
        expirationTtl: Math.ceil((expiresAt - Date.now()) / 1000)
      })

      return c.json({
        success: true,
        message: '登录成功',
        data: {
          sessionId,
          expiresAt
        }
      })
    } else {
      return c.json({
        success: false,
        message: '用户名或密码错误'
      }, 401)
    }
  } catch (error) {
    console.error('登录验证失败:', error)
    return c.json({
      success: false,
      message: error.message || '登录验证失败'
    }, 500)
  }
})

// 验证会话状态
app.get('/api/admin/session', async (c) => {
  try {
    const sessionId = c.req.header('X-Session-Id')
    if (!sessionId) {
      return c.json({
        success: false,
        message: '未提供会话ID'
      }, 401)
    }

    // 从KV获取会话信息
    const sessionData = await c.env.CLOUDPASTE_KV.get(`session_${sessionId}`, 'json')
    if (!sessionData) {
      return c.json({
        success: false,
        message: '会话已过期或不存在'
      }, 401)
    }

    // 检查是否过期
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      // 删除过期会话
      await c.env.CLOUDPASTE_KV.delete(`session_${sessionId}`)
      return c.json({
        success: false,
        message: '会话已过期'
      }, 401)
    }

    return c.json({
      success: true,
      data: {
        username: sessionData.username,
        expiresAt: sessionData.expiresAt
      }
    })
  } catch (error) {
    console.error('验证会话失败:', error)
    return c.json({
      success: false,
      message: error.message || '验证会话失败'
    }, 500)
  }
})

// 退出登录
app.post('/api/admin/logout', async (c) => {
  try {
    const sessionId = c.req.header('X-Session-Id')
    if (sessionId) {
      // 从KV中删除会话
      await c.env.CLOUDPASTE_KV.delete(`session_${sessionId}`)
    }
    return c.json({
      success: true,
      message: '已退出登录'
    })
  } catch (error) {
    console.error('退出登录失败:', error)
    return c.json({
      success: false,
      message: error.message || '退出登录失败'
    }, 500)
  }
})

// 获取设置
app.get('/api/admin/settings', async (c) => {
  try {
    // 从KV中获取设置，如果不存在则使用环境变量的默认值
    const settings = await c.env.CLOUDPASTE_KV.get('upload_settings', 'json') || {
      textUploadEnabled: c.env.TEXT_UPLOAD_ENABLED === 'true',
      fileUploadEnabled: c.env.FILE_UPLOAD_ENABLED === 'true'
    };
    
    return c.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    return c.json({
      success: false,
      message: '获取设置失败'
    }, 500);
  }
});

// 更新设置
app.post('/api/admin/settings', async (c) => {
  try {
    const { textUploadEnabled, fileUploadEnabled } = await c.req.json();
    
    // 保存设置到KV
    await c.env.CLOUDPASTE_KV.put('upload_settings', JSON.stringify({
      textUploadEnabled,
      fileUploadEnabled
    }));
    
    return c.json({
      success: true,
      message: '设置已保存'
    });
  } catch (error) {
    console.error('保存设置失败:', error);
    return c.json({
      success: false,
      message: '保存设置失败'
    }, 500);
  }
});

// 验证上传权限
async function checkUploadPermission(c, type) {
  try {
    // 从KV中获取设置，如果不存在则使用环境变量的默认值
    const settings = await c.env.CLOUDPASTE_KV.get('upload_settings', 'json') || {
      textUploadEnabled: c.env.TEXT_UPLOAD_ENABLED === 'true',
      fileUploadEnabled: c.env.FILE_UPLOAD_ENABLED === 'true'
    };
    
    if (type === 'text' && !settings.textUploadEnabled) {
      return c.json({
        success: false,
        message: '文本上传功能已关闭'
      }, 403);
    }
    
    if (type === 'file' && !settings.fileUploadEnabled) {
      return c.json({
        success: false,
        message: '文件上传功能已关闭'
      }, 403);
    }
    
    return true;
  } catch (error) {
    console.error('验证上传权限失败:', error);
    return c.json({
      success: false,
      message: '验证上传权限失败'
    }, 500);
  }
}

export default app 