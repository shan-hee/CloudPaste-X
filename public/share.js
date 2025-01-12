// 显示Toast提示
function showToast(message = '内容已复制到剪贴板', duration = 2000) {
    const toast = document.getElementById('toast');
    const messageSpan = toast.querySelector('span');
    messageSpan.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// 主题切换功能
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

function updateThemeIcon(theme) {
    themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// 初始化主题图标
updateThemeIcon(document.documentElement.getAttribute('data-theme'));

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeIcon(newTheme);
    localStorage.setItem('theme', newTheme);
});

// 检查并应用保存的主题设置
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// 获取分享ID
const shareId = window.location.pathname.split('/')[2];
const contentArea = document.getElementById('contentArea');

// 加载分享内容
async function loadShareContent() {
    try {
        // 从 URL 参数中获取分享 ID
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('id');
        
        if (!shareId) {
            showToast('无效的分享链接', 3000);
            return;
        }
        
        // 设置请求头，表明这是一个 API 请求
        const response = await fetch(`/s/${shareId}`, {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const shareContent = document.getElementById('shareContent');
            if (!shareContent) {
                console.error('找不到内容显示区域');
                return;
            }

            // 根据分享类型显示不同的内容
            switch (data.data.type) {
                case 'text':
                    // 更新文本内容
                    shareContent.value = data.data.content;
                    break;
                    
                case 'file':
                    // 创建文件下载链接
                    shareContent.value = `文件名: ${data.data.filename}\n大小: ${formatFileSize(data.data.filesize)}\n下载链接: ${data.data.url}`;
                    break;
            }
            
            // 更新信息
            document.getElementById('createTime').textContent = formatDate(data.data.created);
            document.getElementById('viewCount').textContent = data.data.views;
            document.getElementById('expireTime').textContent = data.data.expiresAt ? 
                formatDate(data.data.expiresAt) : '永久有效';

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

// 二维码按钮点击事件
document.querySelector('.qr-btn').addEventListener('click', function() {
    const url = this.dataset.url || window.location.href;
    toggleQRCode(url);
});

// 页面加载时获取内容
loadShareContent(); 