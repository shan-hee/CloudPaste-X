// 显示Toast提示
function showToast(duration = 2000) {
    const toast = document.getElementById('toast');
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
const shareContent = document.getElementById('shareContent');

// 加载分享内容
async function loadShareContent() {
    try {
        const response = await fetch(`/s/${shareId}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        
        if (data.success) {
            // 更新文本框内容
            shareContent.value = data.data.content;
            
            // 更新信息
            document.getElementById('createTime').textContent = formatDate(data.data.created);
            document.getElementById('viewCount').textContent = data.data.views;
            document.getElementById('expireTime').textContent = data.data.expiresAt ? 
                formatDate(data.data.expiresAt) : '永久有效';
        } else {
            alert('加载分享内容失败：' + data.message);
        }
    } catch (error) {
        console.error('加载分享内容出错：', error);
        alert('加载分享内容出错');
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

// 复制内容功能
document.getElementById('copyBtn').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(shareContent.value);
        showToast(); // 使用Toast提示替代alert
    } catch (err) {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    }
});

// 获取KV文件列表
async function loadKVFiles() {
    try {
        const response = await fetch('/api/kv/list');
        const data = await response.json();
        
        if (data.success) {
            renderFileList('kvList', data.files);
        } else {
            console.error('加载KV文件列表失败：', data.message);
        }
    } catch (error) {
        console.error('加载KV文件列表出错：', error);
    }
}

// 获取R2文件列表
async function loadR2Files() {
    try {
        const response = await fetch('/api/r2/list');
        const data = await response.json();
        
        if (data.success) {
            renderFileList('r2List', data.files);
        } else {
            console.error('加载R2文件列表失败：', data.message);
        }
    } catch (error) {
        console.error('加载R2文件列表出错：', error);
    }
}

// 渲染文件列表
function renderFileList(containerId, files) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    files.forEach(file => {
        const fileCard = document.createElement('div');
        fileCard.className = 'file-card';
        fileCard.innerHTML = `
            <div class="file-header">
                <h4>文件分享</h4>
                <div class="file-actions">
                    <button class="icon-btn" onclick="window.open('/s/${file.id}')">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
            </div>
            <div class="file-info">
                <p>ID: ${file.id}</p>
                <p>创建时间: ${formatDate(file.created)}</p>
                <p>过期时间: ${file.expiresAt ? formatDate(file.expiresAt) : '永不过期'}</p>
                <p>文件名: ${file.filename || '未命名'}</p>
            </div>
            <div class="file-actions">
                <button class="action-btn" onclick="copyShareLink('${file.id}')">
                    复制链接
                </button>
                <button class="action-btn" onclick="deleteFile('${file.id}')">
                    删除
                </button>
            </div>
        `;
        container.appendChild(fileCard);
    });
}

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

// 页面加载时获取内容
loadShareContent();
loadKVFiles();
loadR2Files(); 