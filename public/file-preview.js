// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '未知时间';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 显示Toast提示
function showToast(message = '内容已复制到剪贴板', duration = 2000, type = 'info') {
    const toast = document.getElementById('toast');
    const messageSpan = toast.querySelector('span');
    
    // 设置最高层级
    toast.style.zIndex = '999999';
    
    // 清空现有内容
    messageSpan.textContent = '';
    
    // 根据类型设置不同的样式和图标
    toast.className = 'toast';
    if (type === 'error') {
        toast.classList.add('error');
        messageSpan.innerHTML = `<i class="fas fa-times" style="margin-right: 8px; color: #ff4d4f;"></i>${message}`;
    } else if (type === 'warning') {
        toast.classList.add('warning');
        messageSpan.innerHTML = `<i class="fas fa-exclamation-circle" style="margin-right: 8px; color: #faad14;"></i>${message}`;
    } else {
        messageSpan.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 8px; color: #4CAF50;"></i>${message}`;
    }
    
    // 清除之前的定时器
    if (toast.hideTimeout) {
        clearTimeout(toast.hideTimeout);
    }
    
    // 显示 toast
    toast.classList.add('show');
    
    // 设置定时器隐藏 toast
    toast.hideTimeout = setTimeout(() => {
        toast.classList.remove('show');
        // 重置样式
        setTimeout(() => {
            toast.classList.remove('error', 'warning');
            messageSpan.textContent = '';
        }, 300);
    }, duration);
}

// 主题切换功能
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

function updateThemeIcon(theme) {
    const icons = {
        'light': 'fas fa-sun',
        'dark': 'fas fa-moon',
        'auto': 'fas fa-clock'
    };
    themeIcon.className = icons[theme] || icons.light;
}

// 检测系统主题
function detectSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// 应用主题
function applyTheme(theme) {
    const root = document.documentElement;
    // 更新图标
    updateThemeIcon(theme);
    
    // 设置实际主题
    if (theme === 'auto') {
        const systemTheme = detectSystemTheme();
        root.setAttribute('data-theme', systemTheme);
    } else {
        root.setAttribute('data-theme', theme);
    }
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
    const themes = ['light', 'dark', 'auto'];
    const currentTheme = localStorage.getItem('theme') || 'auto';
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const newTheme = themes[nextIndex];
    
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
});

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

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 加载文件内容
async function loadFileContent() {
    const loadingState = document.getElementById('loadingState');
    const contentCard = document.getElementById('contentCard');
    
    try {
        const shareId = window.location.pathname.split('/')[2];
        
        if (!shareId) {
            showToast('无效的分享链接', 3000, 'error');
            return;
        }
        
        let password = null;
        let needPassword = false;
        
        // 先尝试获取内容
        const response = await fetch(`/s/${shareId}`, {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        let data = await response.json();
        
        // 如果需要密码验证
        while (response.status === 403 && data.requirePassword) {
            needPassword = true;
            // 显示密码输入对话框
            password = await showPasswordDialog(shareId);
            if (!password) {
                return; // 用户取消输入密码
            }
            
            // 验证密码
            const verifyResponse = await fetch(`/s/${shareId}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });
            
            const verifyResult = await verifyResponse.json();
            if (!verifyResult.success) {
                showToast('密码错误，请重试', 3000, 'error');
                continue; // 继续显示密码输入框
            }
            
            // 密码验证通过，重新获取内容
            const newResponse = await fetch(`/s/${shareId}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Access-Token': password
                }
            });
            
            data = await newResponse.json();
            if (!data.success) {
                showToast(data.message || '获取内容失败', 3000, 'error');
                continue;
            }
            break;
        }
        
        if (data.success) {
            const fileName = data.data.originalname || data.data.filename;
            // 更新文件信息
            document.getElementById('fileName').textContent = fileName;
            document.getElementById('fileName').title = data.data.filename;
            document.getElementById('filename').value = data.data.filename;
            document.getElementById('fileSize').textContent = formatFileSize(data.data.filesize || 0);
            
            // 更新页面标题
            document.title = `CloudPaste - ${fileName}`;
            
            // 更新文件图标
            const fileIcon = document.querySelector('.file-icon-container i');
            fileIcon.className = `fas ${getFileIcon(data.data.mimeType)} fa-4x`;
            
            // 设置下载按钮事件
            const downloadBtn = document.getElementById('downloadFileBtn');
            downloadBtn.onclick = async () => {
                try {
                    const downloadResponse = await fetch(`/api/share/${shareId}/download`, {
                        headers: {
                            'X-Password': password || ''
                        }
                    });
                    
                    if (downloadResponse.status === 401) {
                        showToast('需要密码访问', 3000, 'error');
                        return;
                    } else if (!downloadResponse.ok) {
                        showToast('下载失败，请重试', 3000, 'error');
                        return;
                    }

                    const data = await downloadResponse.json();
                    if (data.success && data.data.url) {
                        // 使用预签名URL下载文件
                        window.location.href = data.data.url;
                    } else {
                        showToast('下载失败，请重试', 3000, 'error');
                    }
                } catch (error) {
                    console.error('下载文件失败:', error);
                    showToast('下载失败，请重试', 3000, 'error');
                }
            };
            
            // 更新信息
            document.getElementById('createTime').textContent = formatDate(data.data.createdAt);
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

            // 隐藏加载状态，显示内容
            loadingState.style.display = 'none';
            contentCard.style.display = 'block';
        } else {
            showToast(data.message || '加载文件内容失败', 3000, 'error');
        }
    } catch (error) {
        console.error('加载文件内容失败:', error);
        showToast('加载文件内容失败', 3000, 'error');
    }
}

// 显示密码验证对话框
function showPasswordDialog(shareId) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'password-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        const dialog = document.createElement('div');
        dialog.className = 'password-dialog';
        dialog.style.cssText = `
            background: var(--container-bg);
            border-radius: 16px;
            padding: 32px;
            width: 90%;
            max-width: 420px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            transform: translateY(20px) scale(0.95);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        
        dialog.innerHTML = `
            <div class="password-dialog-content">
                <div class="dialog-header" style="text-align: center; margin-bottom: 28px;">
                    <div class="icon-wrapper" style="
                        width: 80px;
                        height: 80px;
                        margin: 0 auto 20px;
                        background: rgba(74, 144, 226, 0.1);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transform: scale(0.8);
                        opacity: 0;
                        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s;
                    ">
                        <i class="fas fa-lock" style="
                            font-size: 32px;
                            color: #4A90E2;
                        "></i>
                    </div>
                    <h3 style="
                        margin: 0;
                        font-size: 24px;
                        color: var(--text-color);
                        font-weight: 600;
                        opacity: 0;
                        transform: translateY(10px);
                        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s;
                    ">需要密码访问</h3>
                    <p style="
                        margin: 8px 0 0;
                        color: var(--text-secondary);
                        font-size: 14px;
                        line-height: 1.6;
                        opacity: 0;
                        transform: translateY(10px);
                        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.4s;
                    ">此内容已被密码保护，请输入密码继续访问</p>
                </div>
                <div class="password-input-wrapper" style="
                    position: relative;
                    margin: 24px 0;
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.5s;
                ">
                    <input type="password" id="sharePassword" placeholder="请输入访问密码" style="
                        width: 80%;
                        padding: 16px 46px 16px 20px;
                        border: 2px solid var(--border-color);
                        border-radius: 12px;
                        font-size: 16px;
                        background: var(--input-bg);
                        color: var(--text-color);
                        transition: all 0.3s ease;
                        outline: none;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                    ">
                    <button class="toggle-password" style="
                        position: absolute;
                        right: 16px;
                        top: 35%;
                        transform: translateY(-50%);
                        border: none;
                        background: none;
                        cursor: pointer;
                        color: var(--text-secondary);
                        padding: 8px;
                        border-radius: 8px;
                        transition: all 0.2s ease;
                    ">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="dialog-buttons" style="
                    display: flex;
                    gap: 12px;
                    margin-top: 32px;
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.6s;
                ">
                    <button class="submit-btn" style="
                        width: 100%;
                        padding: 14px;
                        border: none;
                        border-radius: 12px;
                        background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
                        color: white;
                        font-size: 16px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
                    ">确认</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 显示动画
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            dialog.style.transform = 'translateY(0) scale(1)';
            dialog.style.opacity = '1';
            
            // 依次显示内部元素
            const iconWrapper = dialog.querySelector('.icon-wrapper');
            const title = dialog.querySelector('h3');
            const description = dialog.querySelector('p');
            const inputWrapper = dialog.querySelector('.password-input-wrapper');
            const buttons = dialog.querySelector('.dialog-buttons');
            
            [iconWrapper, title, description, inputWrapper, buttons].forEach(el => {
                if (el) {
                    el.style.transform = 'translateY(0)';
                    el.style.opacity = '1';
                }
            });
        });
        
        const passwordInput = dialog.querySelector('#sharePassword');
        const submitBtn = dialog.querySelector('.submit-btn');
        const togglePasswordBtn = dialog.querySelector('.toggle-password');
        
        // 密码显示切换
        togglePasswordBtn.addEventListener('click', () => {
            const input = passwordInput;
            const icon = togglePasswordBtn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
            togglePasswordBtn.style.background = 'var(--hover-bg)';
            setTimeout(() => {
                togglePasswordBtn.style.background = 'none';
            }, 200);
        });

        // 输入框焦点样式
        passwordInput.addEventListener('focus', () => {
            passwordInput.style.borderColor = '#4A90E2';
            passwordInput.style.boxShadow = '0 2px 8px rgba(74, 144, 226, 0.2)';
        });
        
        passwordInput.addEventListener('blur', () => {
            passwordInput.style.borderColor = 'var(--border-color)';
            passwordInput.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
        });

        // 按钮悬停效果
        submitBtn.addEventListener('mouseover', () => {
            submitBtn.style.transform = 'translateY(-1px)';
            submitBtn.style.boxShadow = '0 6px 16px rgba(74, 144, 226, 0.4)';
        });
        submitBtn.addEventListener('mouseout', () => {
            submitBtn.style.transform = 'translateY(0)';
            submitBtn.style.boxShadow = '0 4px 12px rgba(74, 144, 226, 0.3)';
        });

        // 关闭动画
        function closeDialog(result) {
            if (!result) {
                return; // 如果没有输入密码，不允许关闭
            }
            overlay.style.opacity = '0';
            dialog.style.transform = 'translateY(20px) scale(0.95)';
            dialog.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 300);
        }
        
        submitBtn.addEventListener('click', () => {
            const password = passwordInput.value.trim();
            if (!password) {
                passwordInput.style.borderColor = '#ff4d4f';
                passwordInput.style.boxShadow = '0 2px 8px rgba(255, 77, 79, 0.2)';
                showToast('请输入密码', 2000, 'warning');
                passwordInput.focus();
                return;
            }
            closeDialog(password);
        });
        
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitBtn.click();
            }
        });

        // 阻止对话框上的点击事件冒泡到遮罩层
        dialog.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // 自动聚焦密码输入框
        passwordInput.focus();
    });
}

// 二维码相关功能
document.addEventListener('DOMContentLoaded', function() {
    const qrButton = document.querySelector('.qr-btn');
    if (qrButton) {
        qrButton.addEventListener('click', function() {
            const url = this.dataset.url || window.location.href;
            toggleQRCode(url);
        });
    }
    
    // 加载文件内容
    loadFileContent();
}); 