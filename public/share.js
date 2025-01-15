// 显示Toast提示
function showToast(message = '内容已复制到剪贴板', duration = 2000) {
    const toast = document.getElementById('toast');
    const messageSpan = toast.querySelector('span');
    messageSpan.textContent = message;
    
    // 清除之前的定时器
    if (toast.hideTimeout) {
        clearTimeout(toast.hideTimeout);
    }
    
    // 显示 toast
    toast.classList.add('show');
    
    // 设置定时器隐藏 toast
    toast.hideTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// 主题切换功能
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

function updateThemeIcon(theme) {
    themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// 检测系统主题
function detectSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// 应用主题
function applyTheme(theme) {
    if (theme === 'auto') {
        theme = detectSystemTheme();
    }
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

// 监听系统主题变化
const systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
systemThemeMediaQuery.addListener(() => {
    const currentTheme = localStorage.getItem('theme') || 'auto';
    if (currentTheme === 'auto') {
        applyTheme('auto');
    }
});

// 初始化主题
const savedTheme = localStorage.getItem('theme') || 'auto';
applyTheme(savedTheme);

// 点击按钮切换主题
themeToggle.addEventListener('click', () => {
    const currentTheme = localStorage.getItem('theme') || 'auto';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
});

// 获取分享ID
const shareId = window.location.pathname.split('/')[2];
const contentArea = document.getElementById('contentArea');

// 获取DOM元素
const editBtn = document.getElementById('editBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const editMode = document.querySelector('.edit-mode');
const shareContentdiv = document.getElementById('shareContentdiv');
const shareContent = document.getElementById('shareContent');
const editContent = document.getElementById('editContent');
const previewContent = document.getElementById('previewContent');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const previewModeBtn = document.getElementById('previewModeBtn');

// 预览模式状态
let isPreviewMode = true;

// 编辑历史记录
let undoStack = [];
let redoStack = [];

// 初始化预览模式
function initPreviewMode() {
    if (isPreviewMode) {
        previewModeBtn.classList.add('active');
    }
}

// 切换预览模式
function togglePreviewMode() {
    if (!isPreviewMode) {
        isPreviewMode = true;
        previewModeBtn.classList.add('active');
        shareContent.value=editContent.value  ;
        shareContentdiv.style.display = 'block';    
        shareContent.style.display = 'block';
        
        // 关闭编辑模式
        shareContent.style.display = 'block';
        editMode.style.display = 'none';
        // 移除编辑状态样式
        editBtn.classList.remove('editing');
        if (editMode.classList.contains('fullscreen')) {
            toggleFullscreen();
        }
    }
}



// 退出预览模式
function exitPreviewMode() {
    if (!isPreviewMode) {
        return;
    }
    
    isPreviewMode = false;
    previewModeBtn.classList.remove('active');
}

// 更新Markdown预览内容
function updateMarkdownPreview(markdown) {
    try {
        const html = marked.parse(markdown);
        previewContent.innerHTML = html;
        // 对新内容应用代码高亮
        previewContent.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    } catch (error) {
        console.error('Markdown渲染错误:', error);
        previewContent.innerHTML = '<div class="error">Markdown渲染错误</div>';
    }
}

// 预览模式按钮点击事件
previewModeBtn.addEventListener('click', togglePreviewMode);

// 文件类型图标映射
const fileIconMap = {
    'image': 'fa-file-image',
    'video': 'fa-file-video',
    'audio': 'fa-file-audio',
    'pdf': 'fa-file-pdf',
    'word': 'fa-file-word',
    'excel': 'fa-file-excel',
    'powerpoint': 'fa-file-powerpoint',
    'archive': 'fa-file-archive',
    'code': 'fa-file-code',
    'text': 'fa-file-alt',
    'default': 'fa-file'
};

// 获取文件类型图标
function getFileIcon(mimeType) {
    if (!mimeType) return fileIconMap.default;
    
    if (mimeType.startsWith('image/')) return fileIconMap.image;
    if (mimeType.startsWith('video/')) return fileIconMap.video;
    if (mimeType.startsWith('audio/')) return fileIconMap.audio;
    if (mimeType === 'application/pdf') return fileIconMap.pdf;
    if (mimeType.includes('word')) return fileIconMap.word;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return fileIconMap.excel;
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return fileIconMap.powerpoint;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return fileIconMap.archive;
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) return fileIconMap.code;
    if (mimeType.startsWith('text/')) return fileIconMap.text;
    
    return fileIconMap.default;
}

// 加载分享内容
async function loadShareContent() {
    try {
        
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('id');
        
        if (!shareId) {
            showToast('无效的分享链接', 3000);
            return;
        }
        
        const response = await fetch(`/s/${shareId}`, {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 判断是否为文件
            if (data.data.type === 'file') {
                // 显示文件界面
                document.getElementById('fileDisplay').style.display = 'flex';
                document.getElementById('shareContentdiv').style.display = 'none';
                document.getElementById('editBtn').style.display = 'none';
                document.getElementById('previewModeBtn').style.display = 'none';
                document.getElementById('formatSelect').style.display = 'none';
                document.getElementById('downloadBtn').style.display = 'none';
                document.getElementById('copyBtn').style.display = 'none';
                // 隐藏二维码按钮
                const qrButton = document.querySelector('.qr-btn');
                if (qrButton) {
                    qrButton.style.display = 'none';
                }               
                // 更新文件信息
                const fileName = document.getElementById('fileName');
                fileName.textContent = data.data.originalname || data.data.filename; // 优先显示原始文件名
                fileName.title = data.data.originalname || data.data.filename; // 添加悬停提示
                document.getElementById('fileSize').textContent = formatFileSize(data.data.size);
                
                // 更新文件图标
                const fileIcon = document.querySelector('.file-icon-container i');
                fileIcon.className = `fas ${getFileIcon(data.data.mimeType)} fa-4x`;
                
                // 设置下载按钮事件
                const downloadBtn = document.getElementById('downloadFileBtn');
                downloadBtn.onclick = () => window.location.href = `/s/${shareId}/download`;
            } else {
                // 文本内容显示
                document.getElementById('fileDisplay').style.display = 'none';
                document.getElementById('shareContentdiv').style.display = 'block';
                document.getElementById('editBtn').style.display = 'inline-flex';
                document.getElementById('previewModeBtn').style.display = 'inline-flex';
                document.getElementById('formatSelect').style.display = 'inline-block';
                document.getElementById('downloadBtn').style.display = 'inline-flex';
                shareContent.value = data.data.content;
                
                // 初始化预览模式
                initPreviewMode();
            }
            
            // 更新信息
            document.getElementById('createTime').textContent = formatDate(data.data.created);
            document.getElementById('viewCount').value = data.data.maxViews || 0;
            
            const expireTimeInput = document.getElementById('expireTime');
            if (data.data.expiresAt) {
                const expireDate = new Date(data.data.expiresAt);
                expireTimeInput.value = expireDate.toISOString().slice(0, 16);
            } else {
                expireTimeInput.value = '';
            }

            // 更新二维码按钮的URL
            const qrButton = document.querySelector('.qr-btn');
            if (qrButton) {
                qrButton.dataset.url = window.location.href;
            }
        } else {
            showToast(data.message || '加载分享内容失败', 3000);
        }
    } catch (error) {
        console.error('加载分享内容出错：', error);
        showToast('加载分享内容出错', 3000);
    }
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '永久有效';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 复制内容功能
document.getElementById('copyBtn').addEventListener('click', async () => {
    try {
        const shareContent = document.getElementById('shareContent');
        await navigator.clipboard.writeText(shareContent.value);
        showToast('内容已复制到剪贴板');
    } catch (err) {
        console.error('复制失败:', err);
        showToast('复制失败，请手动复制', 3000);
    }
});

// 复制分享链接
async function copyShareLink(id) {
    const shareLink = `${window.location.origin}/s/${id}`;
    try {
        await navigator.clipboard.writeText(shareLink);
        showToast();
    } catch (err) {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    }
}

// 删除文件
async function deleteFile(id) {
    if (!confirm('确定要删除这个文件吗？')) {
        return;
    }

    try {
        const response = await fetch(`/api/file/${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            // 重新加载文件列表
            loadKVFiles();
            loadR2Files();
        } else {
            alert('删除失败：' + data.message);
        }
    } catch (error) {
        console.error('删除文件出错：', error);
        alert('删除文件出错');
    }
}

// 添加显示二维码函数
function toggleQRCode(url) {
    const qrCodeContainer = document.createElement('div');
    qrCodeContainer.className = 'qr-code-container';
    qrCodeContainer.style.cssText = 'display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); justify-content: center; align-items: center; z-index: 1000;';
    
    qrCodeContainer.innerHTML = `
        <div class="qr-code-modal" style="background: var(--container-bg); padding: 24px; border-radius: 8px; text-align: center; max-width: 90%; width: 320px; position: relative; transform: translateY(-20px); opacity: 0; transition: all 0.3s ease;">
            <h3 style="margin: 0 0 16px 0; font-size: 18px; color: var(--text-color);">扫描二维码访问</h3>
            <div class="qr-code" id="tempQrCode" style="margin-bottom: 16px; background: white; padding: 10px; border-radius: 4px;"></div>
            <div class="qr-code-actions" style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                <button class="qr-download-btn" id="tempDownloadQRCode" style="padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 4px; cursor: pointer; min-width: 125px; background: var(--container-bg); color: var(--text-color); display: inline-flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.2s ease;"><i class="fas fa-download"></i>下载二维码</button>
                <button class="qr-close-btn" style="padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 4px; cursor: pointer; min-width: 60px; background: var(--container-bg); color: var(--text-color); transition: all 0.2s ease;">关闭</button>
            </div>
        </div>
    `;
    
    // 添加悬浮效果
    const downloadBtn = qrCodeContainer.querySelector('.qr-download-btn');
    downloadBtn.addEventListener('mouseover', () => {
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDarkTheme) {
            downloadBtn.style.background = 'white';
            downloadBtn.style.borderColor = '#4A90E2';
            downloadBtn.style.color = '#4A90E2';
        } else {
            downloadBtn.style.borderColor = '#4A90E2';
            downloadBtn.style.color = '#4A90E2';
        }
    });
    downloadBtn.addEventListener('mouseout', () => {
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDarkTheme) {
            downloadBtn.style.background = 'var(--container-bg)';
            downloadBtn.style.borderColor = '#e5e7eb';
            downloadBtn.style.color = '#e5e7eb';
        } else {
            downloadBtn.style.borderColor = '#e5e7eb';
            downloadBtn.style.color = '#333';
        }
    });

    const modalCloseBtn = qrCodeContainer.querySelector('.qr-close-btn');
    modalCloseBtn.addEventListener('mouseover', () => {
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDarkTheme) {
            modalCloseBtn.style.background = 'white';
            modalCloseBtn.style.borderColor = '#ff4d4f';
            modalCloseBtn.style.color = '#ff8f1f';
        } else {
            modalCloseBtn.style.borderColor = '#ff4d4f';
            modalCloseBtn.style.color = '#ff8f1f';
        }
    });
    modalCloseBtn.addEventListener('mouseout', () => {
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDarkTheme) {
            modalCloseBtn.style.background = 'var(--container-bg)';
            modalCloseBtn.style.borderColor = '#e5e7eb';
            modalCloseBtn.style.color = '#e5e7eb';
        } else {
            modalCloseBtn.style.borderColor = '#e5e7eb';
            modalCloseBtn.style.color = '#333';
        }
    });

    // 设置初始暗色主题样式
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
        downloadBtn.style.color = '#e5e7eb';
        modalCloseBtn.style.color = '#e5e7eb';
    }
    
    document.body.appendChild(qrCodeContainer);
    
    // 生成二维码
    const qrCodeDiv = document.getElementById('tempQrCode');
    qrCodeDiv.innerHTML = '';
    
    // 生成新的二维码
    const qrcode = new QRCode(qrCodeDiv, {
        text: url,
        width: 250,
        height: 250,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // 下载按钮事件
    document.getElementById('tempDownloadQRCode').addEventListener('click', () => {
        const canvas = qrCodeDiv.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = '分享链接二维码.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });
    
    // 显示容器并添加动画
    qrCodeContainer.style.display = 'flex';
    setTimeout(() => {
        const modal = qrCodeContainer.querySelector('.qr-code-modal');
        modal.style.transform = 'translateY(0)';
        modal.style.opacity = '1';
    }, 10);
    
    // 关闭按钮事件
    modalCloseBtn.addEventListener('click', closeQRCode);
    
    // 点击遮罩层关闭
    qrCodeContainer.addEventListener('click', (e) => {
        if (e.target === qrCodeContainer) {
            closeQRCode();
        }
    });
    
    // 关闭函数
    function closeQRCode() {
        const modal = qrCodeContainer.querySelector('.qr-code-modal');
        modal.style.transform = 'translateY(-20px)';
        modal.style.opacity = '0';
        setTimeout(() => {
            qrCodeContainer.remove();
        }, 300);
    }
    
    // ESC键关闭
    document.addEventListener('keydown', function escListener(e) {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', escListener);
            closeQRCode();
        }
    });
} 

// 确保二维码按钮点击事件正确绑定
document.addEventListener('DOMContentLoaded', function() {
    const qrButton = document.querySelector('.qr-btn');
    if (qrButton) {
        qrButton.addEventListener('click', function() {
    const url = this.dataset.url || window.location.href;
    toggleQRCode(url);
        });
    }
});

// 页面加载时获取内容
loadShareContent();

// 编辑模式相关功能

// 切换到编辑模式
editBtn.addEventListener('click', () => {
    // 关闭预览模式
    isPreviewMode = false;
    previewModeBtn.classList.remove('active');
    
    editContent.value = shareContent.value;
    shareContentdiv.style.display = 'none';    
    shareContent.style.display = 'none';
    editMode.style.display = 'block';
    // 添加编辑状态样式
    editBtn.classList.add('editing');
    // 清空历史记录
    undoStack = [];
    redoStack = [];
    
    // 允许编辑可访问次数和过期时间
    const viewCountInput = document.getElementById('viewCount');
    const expireTimeInput = document.getElementById('expireTime');
    viewCountInput.removeAttribute('readonly');
    expireTimeInput.removeAttribute('readonly');
});

// 取消编辑
cancelBtn.addEventListener('click', () => {
    if (confirm('确定要取消编辑吗？未保存的更改将会丢失。')) {
        shareContentdiv.style.display = 'block';
        shareContent.style.display = 'block';
        editMode.style.display = 'none';
        // 移除编辑状态样式
        editBtn.classList.remove('editing');
        if (editMode.classList.contains('fullscreen')) {
            toggleFullscreen();
        }
        
        // 禁用可访问次数和过期时间编辑
        const viewCountInput = document.getElementById('viewCount');
        const expireTimeInput = document.getElementById('expireTime');
        viewCountInput.setAttribute('readonly', 'readonly');
        expireTimeInput.setAttribute('readonly', 'readonly');
        
        // 恢复预览模式
        isPreviewMode = true;
        previewModeBtn.classList.add('active');
    }
});

// 保存编辑
saveBtn.addEventListener('click', async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('id');
        const viewCount = parseInt(document.getElementById('viewCount').value) || 0;
        const expireTime = document.getElementById('expireTime').value;
        const currentContent = editContent.value;
        
        const requestData = {
            content: currentContent,
            maxViews: viewCount,
            expiresAt: expireTime || null
        };
        
        const response = await fetch(`/api/text/${shareId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            shareContent.value = currentContent;
            shareContentdiv.style.display = 'block';
            shareContent.style.display = 'block';
            editMode.style.display = 'none';
            editBtn.classList.remove('editing');
            if (editMode.classList.contains('fullscreen')) {
                toggleFullscreen();
            }
            
            // 禁用编辑
            const viewCountInput = document.getElementById('viewCount');
            const expireTimeInput = document.getElementById('expireTime');
            viewCountInput.setAttribute('readonly', 'readonly');
            expireTimeInput.setAttribute('readonly', 'readonly');
            
            isPreviewMode = true;
            previewModeBtn.classList.add('active');
            
            showToast('保存成功');
        } else {
            showToast(data.message || '保存失败', 3000);
        }
    } catch (error) {
        console.error('保存失败:', error);
        showToast('保存失败，请稍后重试', 3000);
    }
});

// 配置marked选项
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true,
    headerIds: true,
    mangle: false
});

// 实时预览
function updatePreview() {
    try {
        const markdown = editContent.value;
        const html = marked.parse(markdown);
        
        // 根据不同模式更新不同的预览区域
        if (editMode.style.display === 'block') {
            // 编辑模式下，更新编辑器内的预览区域
            const editPreview = editMode.querySelector('.preview-content');
            if (editPreview) {
                editPreview.innerHTML = html;
                // 对新内容应用代码高亮
                editPreview.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightBlock(block);
                });
            }
        } else {
            // 预览模式下，更新主预览区域
            const previewContent = document.getElementById('previewContent');
            if (previewContent) {
                previewContent.innerHTML = html;
                // 对新内容应用代码高亮
                previewContent.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightBlock(block);
                });
            }
        }
    } catch (error) {
        console.error('Markdown渲染错误:', error);
        const errorMessage = '<div class="error">Markdown渲染错误</div>';
        
        if (editMode.style.display === 'block') {
            const editPreview = editMode.querySelector('.preview-content');
            if (editPreview) {
                editPreview.innerHTML = errorMessage;
            }
        } else {
            const previewContent = document.getElementById('previewContent');
            if (previewContent) {
                previewContent.innerHTML = errorMessage;
            }
        }
    }
}

// 保存编辑历史
function saveHistory() {
    undoStack.push(editContent.value);
    redoStack = [];
    updateUndoRedoButtons();
}

// 更新撤销重做按钮状态
function updateUndoRedoButtons() {
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
}

// 监听编辑内容变化
editContent.addEventListener('input', () => {
    updatePreview();
    saveHistory();
});

// 工具栏功能
document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const command = btn.getAttribute('title');
        const textarea = editContent;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        let newText = '';
        switch (command) {
            case '加粗':
                newText = `**${selectedText}**`;
                break;
            case '斜体':
                newText = `*${selectedText}*`;
                break;
            case '删除线':
                newText = `~~${selectedText}~~`;
                break;
            case '标题':
                newText = `# ${selectedText}`;
                break;
            case '无序列表':
                newText = `- ${selectedText}`;
                break;
            case '有序列表':
                newText = `1. ${selectedText}`;
                break;
            case '引用':
                newText = `> ${selectedText}`;
                break;
            case '插入链接':
                const url = prompt('请输入链接地址：');
                if (url) {
                    newText = `[${selectedText || '链接文字'}](${url})`;
                }
                break;
            case '插入图片':
                const imgUrl = prompt('请输入图片地址：');
                if (imgUrl) {
                    newText = `![${selectedText || '图片描述'}](${imgUrl})`;
                }
                break;
            case '插入代码':
                if (selectedText.includes('\n')) {
                    newText = `\`\`\`\n${selectedText}\n\`\`\``;
                } else {
                    newText = `\`${selectedText}\``;
                }
                break;
            case '插入表格':
                newText = `| 表头1 | 表头2 |\n| --- | --- |\n| 内容1 | 内容2 |`;
                break;
            case '清空':
                if (confirm('确定要清空所有内容吗？')) {
                    textarea.value = '';
                    updatePreview();
                }
                return;
            case '全屏编辑':
                toggleFullscreen();
                return;
        }
        
        if (newText) {
            textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
            updatePreview();
            saveHistory();
            textarea.focus();
            textarea.selectionStart = start;
            textarea.selectionEnd = start + newText.length;
        }
    });
});

// 撤销功能
undoBtn.addEventListener('click', () => {
    if (undoStack.length > 0) {
        redoStack.push(editContent.value);
        editContent.value = undoStack.pop();
        updatePreview();
        updateUndoRedoButtons();
    }
});

// 重做功能
redoBtn.addEventListener('click', () => {
    if (redoStack.length > 0) {
        undoStack.push(editContent.value);
        editContent.value = redoStack.pop();
        updatePreview();
        updateUndoRedoButtons();
    }
});

// 全屏编辑
function toggleFullscreen() {
    editMode.classList.toggle('fullscreen');
    const icon = fullscreenBtn.querySelector('i');
    if (editMode.classList.contains('fullscreen')) {
        icon.classList.remove('fa-expand');
        icon.classList.add('fa-compress');
    } else {
        icon.classList.remove('fa-compress');
        icon.classList.add('fa-expand');
    }
}

// 监听ESC键退出全屏
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editMode.classList.contains('fullscreen')) {
        toggleFullscreen();
    }
});

// 导出功能
document.getElementById('downloadBtn').addEventListener('click', async () => {
    const format = document.getElementById('formatSelect').value;
    const content = document.getElementById('shareContent').value;
    const filename = `cloudpaste_${new Date().toISOString().slice(0,10)}`;

    if (format === 'pdf') {
        try {
            // 创建PDF文档
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // 设置中文字体
            doc.setFont('chinese', 'normal');
            
            // 分割内容为多行
            const lines = doc.splitTextToSize(content, 180);
            
            // 设置初始y位置
            let y = 20;
            const lineHeight = 7;
            
            // 添加内容到PDF
            doc.setFontSize(12);
            
            // 分页处理
            for (let i = 0; i < lines.length; i++) {
                if (y > 280) {  // 如果即将超出页面
                    doc.addPage();  // 添加新页面
                    y = 20;  // 重置y坐标
                }
                doc.text(15, y, lines[i]);
                y += lineHeight;
            }
            
            // 下载PDF
            doc.save(`${filename}.pdf`);
            showToast('PDF导出成功');
        } catch (error) {
            console.error('导出PDF失败:', error);
            showToast('导出PDF失败，请稍后重试', 3000);
        }
    } else if (format === 'png') {
        try {
            // 创建临时容器
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.width = '800px';
            container.style.background = 'white';
            container.style.padding = '20px';
            container.style.whiteSpace = 'pre-wrap';
            container.innerHTML = marked.parse(content);
            document.body.appendChild(container);

            // 使用html2canvas转换为图片
            const canvas = await html2canvas(container, {
                scale: 2,
                backgroundColor: 'white'
            });
            
            // 移除临时容器
            document.body.removeChild(container);

            // 创建下载链接
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('导出PNG失败:', error);
            showToast('导出PNG失败，请稍后重试', 3000);
        }
    }
});

// 获取分享统计数据
async function fetchShareStats() {
    try {
        console.log('开始获取统计数据');
        // 获取存储列表数据
        const storageResponse = await fetch('/api/share/storage');
        if (!storageResponse.ok) {
            throw new Error('获取存储列表失败');
        }
        const storageData = await storageResponse.json();
        
        if (storageData.success) {
            const stats = {
                totalShares: 0,
                activeShares: 0,
                usedStorage: 0
            };
            
            // 设置默认总容量为6GB
            const totalStorage = 6 * 1024 * 1024 * 1024; // 6GB in bytes
            
            // 计算总分享数和已用存储空间
            if (storageData.data) {
                // 计算KV存储的文本分享
                if (storageData.data.kv && Array.isArray(storageData.data.kv)) {
                    // 过滤掉系统生成的临时文件
                    const validKvShares = storageData.data.kv.filter(item => {
                        return item.type === 'text' && !item.name.startsWith('temp_');
                    });
                    stats.totalShares += validKvShares.length;
                    stats.activeShares += validKvShares.length;
                    // 估算文本存储大小
                    validKvShares.forEach(item => {
                        if (item.content) {
                            stats.usedStorage += item.content.length;
                        }
                    });
                }
                
                // 计算R2存储的文件分享
                if (storageData.data.r2 && Array.isArray(storageData.data.r2)) {
                    // 过滤掉没有原始文件名的文件和系统生成的临时文件
                    const validR2Shares = storageData.data.r2.filter(item => {
                        return item.originalname && !item.filename.startsWith('temp_');
                    });
                    stats.totalShares += validR2Shares.length;
                    stats.activeShares += validR2Shares.length;
                    // 累加文件大小
                    validR2Shares.forEach(item => {
                        if (item.filesize) {
                            stats.usedStorage += item.filesize;
                        }
                    });
                }
            }
            
            // 更新统计数据显示
            document.getElementById('totalShares').textContent = stats.totalShares;
            document.getElementById('activeShares').textContent = stats.activeShares;
            document.getElementById('usedStorage').textContent = formatFileSize(stats.usedStorage);
            document.getElementById('totalStorage').textContent = formatFileSize(totalStorage);
            
            // 计算并更新使用百分比
            const usagePercent = (stats.usedStorage / totalStorage * 100).toFixed(1);
            document.getElementById('usagePercent').textContent = `${usagePercent}%`;
            
            // 更新进度条
            const progressBar = document.querySelector('.usage-progress');
            if (progressBar) {
                progressBar.style.width = `${usagePercent}%`;
                
                // 根据使用比例设置状态样式
                progressBar.className = 'usage-progress';
                if (usagePercent >= 90) {
                    progressBar.classList.add('danger');
                } else if (usagePercent >= 70) {
                    progressBar.classList.add('warning');
                }
            }
            
            // 更新存储状态标签
            const storageUsage = document.querySelector('.storage-usage');
            if (storageUsage) {
                storageUsage.className = 'storage-usage';
                if (usagePercent >= 90) {
                    storageUsage.classList.add('danger');
                } else if (usagePercent >= 70) {
                    storageUsage.classList.add('warning');
                }
            }
            
            console.log('统计数据更新完成:', stats);
        }
    } catch (error) {
        console.error('获取统计数据失败:', error);
        showToast('获取统计数据失败', 'error');
    }
}

// 显示存储列表
function displayStorageList(data, newItem = null) {
    const shareItems = document.getElementById('shareItems');
    
    // 如果是新项插入，直接添加到列表中
    if (newItem) {
        const newItemHtml = createShareItem({
            id: newItem.filename || newItem.id,
            type: newItem.type,
            expiration: newItem.expiresAt,
            size: newItem.filesize || newItem.size || 0,
            filename: newItem.filename,
            originalname: newItem.originalname
        });
        shareItems.insertAdjacentHTML('afterbegin', newItemHtml);
        return;
    }

    // 显示完整列表
    const storageResults = document.createElement('div');
    storageResults.className = 'storage-results';

    // 合并KV和R2的数据为统一的分享列表
    const allShares = [
        ...(data.kv || []).filter(item => item.type === 'text' && !item.name.startsWith('temp_')).map(item => ({
            id: item.name,
            type: 'text',
            expiration: item.expiration * 1000,
            size: item.content ? item.content.length : 0,
            createdAt: item.createdAt
        })),
        ...(data.r2 || []).filter(item => item.originalname && !item.filename.startsWith('temp_')).map(item => ({
            id: item.filename,
            type: 'file',
            size: item.filesize,
            expiration: null,
            filename: item.filename,
            originalname: item.originalname,
            createdAt: item.createdAt
        }))
    ];

    // 按创建时间排序，最新的在前面
    allShares.sort((a, b) => {
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        return timeB - timeA;
    });

    const sharesList = document.createElement('div');
    sharesList.className = 'shares-list';
    sharesList.innerHTML = allShares.map(item => createShareItem(item)).join('');

    storageResults.appendChild(sharesList);
    shareItems.innerHTML = ''; // 清空现有内容
    shareItems.appendChild(storageResults);

    // 添加事件监听器
    addStorageItemEventListeners();
}


