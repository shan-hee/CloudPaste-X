// 将这段代码放在文件的最开始位置
console.log('app.js loaded'); // 验证脚本是否加载

// 全局变量
let selectedFiles = []; // 存储选中的文件

// 初始化所有功能
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化功能');
    
    // 优先获取统计数据
    fetchShareStats().then(() => {
        console.log('统计数据已更新');
    }).catch(error => {
        console.error('获取统计数据失败:', error);
    });
    
    // 初始化主题切换
    initThemeToggle();
    
    // 初始化标签页切换
    initTabSwitching();
    
    // 初始化文件上传
    initFileUpload();
    
    // 初始化其他功能
    initAdminPanel();
    initEditor();
    initShareFilters();
    initTextSubmit();
    initUploadToggles();
    initFileSubmit();
});

// 初始化文本提交功能
function initTextSubmit() {
    const submitTextBtn = document.getElementById('submitText');
    const shareResult = document.getElementById('shareResult');
    const shareLink = document.getElementById('shareLink');
    const copyBtn = document.getElementById('copyShareLink');
    const expiresAtSpan = shareResult.querySelector('.expires-at');
    const maxViewsSpan = shareResult.querySelector('.max-views');

    if (submitTextBtn) {
        console.log('找到提交按钮');
        submitTextBtn.addEventListener('click', async () => {
            console.log('点击提交按钮');
            try {
                const textContent = document.getElementById('textContent').value;
                const password = document.getElementById('textPassword').value;
                const duration = document.getElementById('textDuration').value;
                const customUrl = document.getElementById('textCustomUrl').value;
                const maxViews = parseInt(document.getElementById('textMaxViews').value) || 0;

                if (!textContent) {
                    alert('请输入要分享的文本内容');
                    return;
                }

                // 禁用提交按钮
                submitTextBtn.disabled = true;
                submitTextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 创建中...';

                console.log('准备发送请求，数据：', {
                    content: textContent,
                    password: password || undefined,
                    duration,
                    customUrl: customUrl || undefined,
                    maxViews
                });

                const response = await fetch('/api/text', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content: textContent,
                        password: password || undefined,
                        duration,
                        customUrl: customUrl || undefined,
                        maxViews
                    })
                });

                console.log('收到响应:', response);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('响应错误:', response.status, errorText);
                    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                }

                const result = await response.json();
                console.log('解析响应:', result);
                
                if (result.success) {
                    // 创建结果显示
                    const resultDiv = document.getElementById('result');
                    const url = `${window.location.origin}${result.data.url}`;
                    const textContentElement = document.getElementById('textContent');
                    
                    // 获取过期时间文本
                    const durationText = {
                        '1h': '1小时后过期',
                        '1d': '1天后过期',
                        '7d': '7天后过期',
                        '30d': '30天后过期',
                        'never': '永久有效'
                    };

                    // 创建新的结果元素
                    const newResultDiv = document.createElement('div');
                    newResultDiv.innerHTML = `
                        <div class="share-result success">
                            <div class="result-header">
                                <i class="fas fa-check-circle"></i>
                                <h3>文本上传成功！</h3>
                            </div>
                            <div class="file-info">
                                <div class="info-item">
                                    <i class="fas fa-file-alt"></i>
                                    <span>文本内容</span>
                                </div>
                                <div class="info-item">
                                    <i class="fas fa-text-width"></i>
                                    <span>${textContentElement ? textContentElement.value.length : 0} 字符</span>
                                </div>
                            </div>
                            <div class="share-settings">
                                <div class="setting-item">
                                    <i class="far fa-clock"></i>
                                    <span>${durationText[duration]}</span>
                                </div>
                                ${password ? `
                                    <div class="setting-item">
                                        <i class="fas fa-lock"></i>
                                        <span>已设置密码保护</span>
                                    </div>
                                ` : ''}
                                ${maxViews > 0 ? `
                                    <div class="setting-item">
                                        <i class="far fa-eye"></i>
                                        <span>限制访问 ${maxViews} 次</span>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="share-link-container">
                                <div class="link-group">
                                    <input type="text" class="share-link" value="${url}" readonly>
                                    <button class="copy-btn" onclick="copyToClipboard('${url}')" title="复制链接">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                                <div class="qr-group">
                                    <button class="qr-btn" onclick="toggleQRCode('${url}')" title="显示二维码">
                                        <i class="fas fa-qrcode"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="qr-code-container" style="display: none;">
                                <div class="qr-code"></div>
                                <button class="download-qr" title="下载二维码">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        </div>
                    `;

                    // 将新的结果添加到结果区域的顶部
                    resultDiv.insertBefore(newResultDiv, resultDiv.firstChild);

                    // 自动选中分享链接
                    const shareLinkInput = newResultDiv.querySelector('.share-link');
                    shareLinkInput.select();
                    
                    // 清空表单
                    document.getElementById('textPassword').value = '';
                    document.getElementById('textCustomUrl').value = '';
                    document.getElementById('textMaxViews').value = '0';
                    if (textContentElement) {
                        textContentElement.value = '';
                        document.getElementById('charCount').textContent = '0 字符';
                    }

                    // 添加到存储列表
                    displayStorageList(null, {
                        type: 'text',
                        id: result.data.id,
                        expiresAt: result.data.expiresAt
                    });

                    // 刷新分享统计
                    fetchShareStats();
                } else {
                    shareResult.style.display = 'block';
                    shareResult.classList.add('error');
                    shareLink.value = '创建分享失败：' + result.message;
                }
            } catch (error) {
                console.error('创建分享时出错：', error);
                shareResult.style.display = 'block';
                shareResult.classList.add('error');
                shareLink.value = '创建分享时出错：' + error.message;
            } finally {
                // 恢复提交按钮
                submitTextBtn.disabled = false;
                submitTextBtn.innerHTML = '<i class="fas fa-share"></i> 创建文本分享';
            }
        });
    } else {
        console.error('未找到提交按钮');
    }

    // 复制按钮功能
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareLink.value);
                const originalTitle = copyBtn.getAttribute('title');
                copyBtn.setAttribute('title', '已复制！');
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyBtn.setAttribute('title', originalTitle);
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            } catch (err) {
                console.error('复制失败:', err);
                alert('复制失败，请手动复制');
            }
        });
    }

    // 二维码按钮功能
    const qrBtn = document.getElementById('showQRCode');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const closeQRCodeBtn = document.getElementById('closeQRCode');
    const downloadQRCodeBtn = document.getElementById('downloadQRCode');

    function hideQRCode() {
        qrCodeContainer.style.display = 'none';
        qrBtn.innerHTML = '<i class="fas fa-qrcode"></i>';
        qrBtn.setAttribute('title', '显示二维码');
    }

    if (qrBtn) {
        qrBtn.addEventListener('click', () => {
            const qrCodeDiv = document.getElementById('qrCode');
            const isVisible = qrCodeContainer.style.display === 'block';
            
            if (isVisible) {
                hideQRCode();
            } else {
                // 清空之前的二维码
                qrCodeDiv.innerHTML = '';
                // 生成新的二维码
                const shareUrl = shareLink.value.replace('/share/', '/');
                QRCode.toDataURL(shareUrl, {
                    width: 200,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                }, (err, url) => {
                    if (err) {
                        console.error('生成二维码失败:', err);
                        alert('生成二维码失败');
                        return;
                    }
                    // 创建图片元素显示二维码
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = '分享链接二维码';
                    qrCodeDiv.appendChild(img);

                    // 保存数据URL用于下载
                    downloadQRCodeBtn.setAttribute('data-qr-url', url);
                });
                qrCodeContainer.style.display = 'block';
                qrBtn.innerHTML = '<i class="fas fa-times"></i>';
                qrBtn.setAttribute('title', '关闭二维码');
            }
        });
    }

    // 关闭二维码
    if (closeQRCodeBtn) {
        closeQRCodeBtn.addEventListener('click', hideQRCode);
    }

    // 点击遮罩层关闭
    qrCodeContainer.addEventListener('click', (e) => {
        if (e.target === qrCodeContainer) {
            hideQRCode();
        }
    });

    // 下载二维码
    if (downloadQRCodeBtn) {
        downloadQRCodeBtn.addEventListener('click', () => {
            const url = downloadQRCodeBtn.getAttribute('data-qr-url');
            if (url) {
                const link = document.createElement('a');
                link.download = '分享链接二维码.png';
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    }
}

// 初始化上传开关
function initUploadToggles() {
    const textUploadBtn = document.getElementById('textUploadBtn');
    const fileUploadBtn = document.getElementById('fileUploadBtn');
    
    // 从localStorage读取保存的状态
    const textUploadEnabled = localStorage.getItem('textUploadEnabled') === 'true';
    const fileUploadEnabled = localStorage.getItem('fileUploadEnabled') === 'true';
    
    // 初始化按钮状态
    if (textUploadEnabled) {
        textUploadBtn.classList.add('active');
    }
    if (fileUploadEnabled) {
        fileUploadBtn.classList.add('active');
    }
    
    // 添加点击事件
    textUploadBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        const isEnabled = this.classList.contains('active');
        localStorage.setItem('textUploadEnabled', isEnabled);
        // 这里可以添加启用/禁用文本上传的API调用
    });
    
    fileUploadBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        const isEnabled = this.classList.contains('active');
        localStorage.setItem('fileUploadEnabled', isEnabled);
        // 这里可以添加启用/禁用文件上传的API调用
    });
}

// 主题切换功能
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const root = document.documentElement;
    const themes = ['light', 'dark', 'auto'];
    
    // 从localStorage读取保存的主题设置，如果没有则默认使用'auto'
    const savedTheme = localStorage.getItem('theme') || 'auto';
    let currentThemeIndex = themes.indexOf(savedTheme);
    
    // 应用主题设置
    root.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    function updateThemeIcon(theme) {
        const icons = {
            'light': 'fa-sun',
            'dark': 'fa-moon',
            'auto': 'fa-clock'
        };
        
        const icon = themeToggle.querySelector('i');
        icon.className = `fas ${icons[theme]}`;
    }

    themeToggle.addEventListener('click', () => {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;
        const newTheme = themes[currentThemeIndex];
        
        // 应用新主题
        root.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
        
        // 保存用户选择
        localStorage.setItem('theme', newTheme);
    });
}

// 标签页切换功能
function initTabSwitching() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabsContainer = document.querySelector('.tabs');

    function activateTab(tab) {
        const target = tab.getAttribute('data-tab');
        
        // 移除所有活动状态
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => {
            content.style.display = 'none';
            content.classList.remove('active');
        });
        
        // 添加新的活动状态
        tab.classList.add('active');
        const targetContent = document.getElementById(target + 'Upload');
        if (targetContent) {
            targetContent.style.display = 'block';
            targetContent.classList.add('active');
            
            // 如果是文件上传标签，确保上传区域可见
            if (target === 'file') {
                const uploadArea = document.getElementById('uploadArea');
                const fileList = document.getElementById('fileList');
                if (uploadArea) {
                    uploadArea.style.display = 'flex';
                    if (fileList) {
                        fileList.style.display = selectedFiles.length > 0 ? 'block' : 'none';
                    }
                }
            }
        }
        
        // 更新滑块位置
        tabsContainer.setAttribute('data-active-tab', target);
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            activateTab(tab);
        });
    });

    // 初始化时激活第一个标签
    const firstTab = tabs[0];
    if (firstTab) {
        activateTab(firstTab);
    }
}

// 文件上传相关功能
function initFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');

    if (!uploadArea || !fileInput || !fileList) {
        console.error('文件上传所需的DOM元素未找到');
        return;
    }

    console.log('初始化文件上传功能');

    // 确保上传区域可见
    uploadArea.style.display = 'flex';
    fileList.style.display = 'none';

    // 处理文件选择
    fileInput.addEventListener('change', (event) => {
        console.log('文件选择事件触发');
        const files = event.target.files;
        addFilesToList(Array.from(files));
    });

    // 处理拖放
    uploadArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', (event) => {
        event.preventDefault();
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (event) => {
        event.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = event.dataTransfer.files;
        addFilesToList(Array.from(files));
    });

    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    function addFilesToList(files) {
        console.log('添加文件到列表:', files);
        files.forEach(file => {
            // 检查是否已经存在同名文件
            if (!selectedFiles.some(f => f.name === file.name)) {
                selectedFiles.push(file);
                const filePreview = createFilePreview(file);
                const fileList = document.getElementById('fileList');
                fileList.appendChild(filePreview);
            } else {
                console.log('文件已存在:', file.name);
            }
        });
        updateUploadAreaVisibility();
    }
}

// 管理面板功能
function initAdminPanel() {
    const adminBtn = document.querySelector('.header-btn.admin');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebarBtn = document.getElementById('closeSidebar');

    function openSidebar() {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    adminBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openSidebar();
    });

    closeSidebarBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });
}

// 编辑器功能初始化
function initEditor() {
    const editor = document.querySelector('.editor-wrapper');
    const toolbar = document.querySelector('.editor-toolbar');
    const toolbarButtons = document.querySelector('.toolbar-buttons');
    const toggleToolbarBtn = document.getElementById('toggleToolbar');
    const fullscreenBtn = document.querySelector('.fullscreen-btn');
    const textContent = document.getElementById('textContent');
    const splitEditor = document.querySelector('.split-editor textarea');
    const charCount = document.getElementById('charCount');
    
    // 同步主编辑器和分屏编辑器的内容
    function syncEditors(source, target) {
        target.value = source.value;
        updatePreview();
        const count = source.value.length;
        charCount.textContent = `${count} 字符`;
    }

    // 监听主编辑器的输入
    textContent.addEventListener('input', () => {
        syncEditors(textContent, splitEditor);
    });

    // 监听分屏编辑器的输入
    splitEditor.addEventListener('input', () => {
        syncEditors(splitEditor, textContent);
    });

    // 工具栏按钮点击处理
    toolbar.addEventListener('click', (e) => {
        const button = e.target.closest('.toolbar-btn');
        if (!button) return;
        
        const action = button.getAttribute('data-action');
        if (!action) return;
        
        e.preventDefault();
        // 根据当前活动的编辑器选择目标
        const activeEditor = document.querySelector('.split-view.active') ? splitEditor : textContent;
        handleToolbarAction(action, activeEditor);
    });

    // 字符计数
    textContent.addEventListener('input', () => {
        const count = textContent.value.length;
        charCount.textContent = `${count} 字符`;
    });

    // 工具栏折叠/展开
    toggleToolbarBtn.addEventListener('click', () => {
        toolbarButtons.classList.toggle('collapsed');
        toggleToolbarBtn.classList.toggle('collapsed');
    });

    // 全屏切换
    fullscreenBtn.addEventListener('click', () => {
        editor.classList.toggle('fullscreen');
        const icon = fullscreenBtn.querySelector('i');
        icon.classList.toggle('fa-expand');
        icon.classList.toggle('fa-compress');
    });

    // 编辑器标签切换
    const editorTabs = document.querySelectorAll('.editor-tab');
    const contentView = document.querySelector('.content-view');
    const previewView = document.querySelector('.preview-view');
    const splitView = document.querySelector('.split-view');

    editorTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-editor-tab');
            
            // 移除所有活动状态
            editorTabs.forEach(t => t.classList.remove('active'));
            contentView.classList.remove('active');
            previewView.classList.remove('active');
            splitView.classList.remove('active');
            
            // 添加新的活动状态
            tab.classList.add('active');

            // 显示对应视图
            switch(target) {
                case 'content':
                    contentView.classList.add('active');
                    break;
                case 'preview':
                    previewView.classList.add('active');
                    updatePreview();
                    break;
                case 'split':
                    splitView.classList.add('active');
                    // 同步内容到分屏编辑器
                    splitEditor.value = textContent.value;
                    updatePreview();
                    break;
            }
        });
    });

    // 初始化时同步内容
    splitEditor.value = textContent.value;
}

// 处理工具栏按钮动作
function handleToolbarAction(action, textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);
    
    let replacement = '';
    let cursorOffset = 0;
    
    switch(action) {
        case 'bold':
            replacement = `**${selection || '粗体文本'}**`;
            cursorOffset = selection ? 0 : -2;
            break;
        case 'italic':
            replacement = `*${selection || '斜体文本'}*`;
            cursorOffset = selection ? 0 : -1;
            break;
        case 'strikethrough':
            replacement = `~~${selection || '删除线文本'}~~`;
            cursorOffset = selection ? 0 : -2;
            break;
        case 'heading':
            replacement = `\n### ${selection || '标题'}\n`;
            cursorOffset = selection ? 0 : -1;
            break;
        case 'list-ul':
            replacement = selection ? selection.split('\n').map(line => `- ${line}`).join('\n') : '- 列表项';
            break;
        case 'list-ol':
            replacement = selection ? selection.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n') : '1. 列表项';
            break;
        case 'quote':
            replacement = selection ? selection.split('\n').map(line => `> ${line}`).join('\n') : '> 引用文本';
            break;
        case 'link':
            replacement = `[${selection || '链接文本'}](url)`;
            cursorOffset = selection ? -1 : -4;
            break;
        case 'image':
            replacement = `![${selection || '图片描述'}](url)`;
            cursorOffset = selection ? -1 : -4;
                break;
        case 'code':
            replacement = selection.includes('\n') ? 
                         `\n\`\`\`\n${selection || '代码块'}\n\`\`\`\n` :
                         `\`${selection || '代码'}\``;
            cursorOffset = selection ? 0 : -1;
                break;
        case 'table':
            replacement = '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n';
                break;
        case 'clear':
            textarea.value = '';
            updatePreview();
            return;
    }
    
    // 插入文本
    textarea.focus();
    document.execCommand('insertText', false, replacement);
    
    // 更新光标位置
    if (cursorOffset) {
        const newPosition = end + replacement.length + cursorOffset;
        textarea.setSelectionRange(newPosition, newPosition);
    }
    
    // 更新预览
    updatePreview();
}

// 更新预览内容
function updatePreview() {
    const textContent = document.getElementById('textContent');
    const previewContents = document.querySelectorAll('.preview-content');
    const html = marked.parse(textContent.value);
    
    previewContents.forEach(preview => {
        preview.innerHTML = html;
    });
}

// 分享列表筛选功能
function initShareFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const shareItems = document.getElementById('shareItems');
    let currentFilter = 'all';

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 更新按钮状态
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 获取筛选类型
            currentFilter = btn.getAttribute('data-type');
            
            // 筛选分享项
            const items = shareItems.querySelectorAll('.share-item');
            items.forEach(item => {
                const itemType = item.getAttribute('data-type');
                if (currentFilter === 'all' || itemType === currentFilter) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

// 在创建分享项时添加类型标记
function createShareItem(share) {
    const item = document.createElement('div');
    item.className = 'share-item';
    
    // 获取文件图标
    let iconClass = 'fa-file-alt';
    if (share.type === 'file') {
        iconClass = share.fileName ? getFileIconByName(share.fileName) : 'fa-file';
    } else if (share.type === 'book') {
        iconClass = 'fa-bookmark';
    }

    // 格式化创建时间
    const createDate = new Date(share.createdAt);
    const formattedDate = `${createDate.getFullYear()}/${(createDate.getMonth() + 1).toString().padStart(2, '0')}/${createDate.getDate().toString().padStart(2, '0')} ${createDate.getHours().toString().padStart(2, '0')}:${createDate.getMinutes().toString().padStart(2, '0')}:${createDate.getSeconds().toString().padStart(2, '0')}`;

    // 格式化过期时间
    let expiresText = '永不过期';
    if (share.expiresAt) {
        const expiresDate = new Date(share.expiresAt);
        const now = new Date();
        const diffTime = expiresDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffTime < 0) {
            expiresText = '已过期';
        } else if (diffDays === 0) {
            expiresText = '今天过期';
        } else if (diffDays === 1) {
            expiresText = '明天过期';
        } else {
            expiresText = `${diffDays}天后过期`;
        }
    }

    item.innerHTML = `
        <i class="fas ${iconClass} share-icon"></i>
        <div class="share-info">
            <div class="share-id">
                ${share.fileName || share.id}
                <span class="share-type">${share.type === 'text' ? '文本' : share.type === 'file' ? '文件' : '书签'}</span>
            </div>
            <div class="share-meta">
                <span><i class="far fa-clock"></i>创建时间: ${formattedDate}</span>
                <span class="share-expires"><i class="fas fa-hourglass-half"></i>${expiresText}</span>
            </div>
        </div>
        <div class="share-actions">
            <button class="share-btn copy" title="复制链接">
                <i class="fas fa-link"></i>
            </button>
            <button class="share-btn edit" title="修改密码">
                <i class="fas fa-key"></i>
            </button>
            <button class="share-btn delete" title="删除">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

    // 添加事件处理
    const copyBtn = item.querySelector('.share-btn.copy');
    const editBtn = item.querySelector('.share-btn.edit');
    const deleteBtn = item.querySelector('.share-btn.delete');

    copyBtn.addEventListener('click', () => {
        const shareUrl = `${window.location.origin}/share/${share.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-link"></i>';
            }, 2000);
        });
    });

    editBtn.addEventListener('click', () => {
        // 实现修改密码功能
    });

    deleteBtn.addEventListener('click', () => {
        if (confirm('确定要删除这个分享吗？')) {
            // 实现删除功能
        }
    });

    return item;
}

function getFileIconByName(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        pdf: 'fa-file-pdf',
        doc: 'fa-file-word',
        docx: 'fa-file-word',
        xls: 'fa-file-excel',
        xlsx: 'fa-file-excel',
        ppt: 'fa-file-powerpoint',
        pptx: 'fa-file-powerpoint',
        jpg: 'fa-file-image',
        jpeg: 'fa-file-image',
        png: 'fa-file-image',
        gif: 'fa-file-image',
        zip: 'fa-file-archive',
        rar: 'fa-file-archive',
        '7z': 'fa-file-archive',
        txt: 'fa-file-alt',
        mp3: 'fa-file-audio',
        wav: 'fa-file-audio',
        mp4: 'fa-file-video',
        avi: 'fa-file-video'
    };
    return iconMap[ext] || 'fa-file';
}

function createFilePreview(file) {
    const preview = document.createElement('div');
    preview.className = 'file-preview';
    
    const fileIcon = document.createElement('i');
    fileIcon.className = `fas ${getFileIcon(file.type)}`;
    
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    
    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = file.name;
    
    const fileSize = document.createElement('div');
    fileSize.className = 'file-size';
    fileSize.textContent = formatFileSize(file.size);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-file';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.onclick = () => {
        preview.remove();
        selectedFiles = selectedFiles.filter(f => f !== file);
        updateUploadAreaVisibility();
    };
    
    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileSize);
    preview.appendChild(fileIcon);
    preview.appendChild(fileInfo);
    preview.appendChild(removeBtn);
    
    return preview;
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return 'fa-file-image';
    if (mimeType.startsWith('video/')) return 'fa-file-video';
    if (mimeType.startsWith('audio/')) return 'fa-file-audio';
    if (mimeType.includes('pdf')) return 'fa-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'fa-file-archive';
    if (mimeType.includes('text/')) return 'fa-file-alt';
    return 'fa-file';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateUploadAreaVisibility() {
    const uploadArea = document.getElementById('uploadArea');
    const fileList = document.getElementById('fileList');
    
    // 始终显示上传区域和文件列表
    uploadArea.style.display = 'flex';
    fileList.style.display = 'block';
    
    // 如果没有文件，隐藏文件列表
    if (selectedFiles.length === 0) {
        fileList.style.display = 'none';
    }
}

// 初始化文件提交功能
function initFileSubmit() {
    const submitFileBtn = document.getElementById('submitFile');
    const filePassword = document.getElementById('filePassword');
    const fileDuration = document.getElementById('fileDuration');
    const fileCustomUrl = document.getElementById('fileCustomUrl');
    const fileMaxViews = document.getElementById('fileMaxViews');
    const progressContainer = document.getElementById('uploadProgressContainer');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('uploadProgressText');
    const progressPercent = document.getElementById('uploadProgressPercent');

    // 添加速度计算相关变量
    let uploadStartTime;
    let lastUploadedBytes = 0;
    let lastUploadTime = 0;
    let uploadSpeed = 0;
    let speedUpdateInterval;

    // 格式化速度显示
    function formatSpeed(bytesPerSecond) {
        if (bytesPerSecond < 1024) {
            return `${bytesPerSecond.toFixed(1)} B/s`;
        } else if (bytesPerSecond < 1024 * 1024) {
            return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
        } else {
            return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
        }
    }

    // 计算上传速度
    function calculateSpeed(loadedBytes, timestamp) {
        const timeElapsed = timestamp - lastUploadTime;
        if (timeElapsed > 0) {
            const bytesIncrement = loadedBytes - lastUploadedBytes;
            uploadSpeed = (bytesIncrement / timeElapsed) * 1000; // 转换为每秒
        }
        lastUploadedBytes = loadedBytes;
        lastUploadTime = timestamp;
        return uploadSpeed;
    }

    if (submitFileBtn) {
        submitFileBtn.addEventListener('click', async () => {
            if (selectedFiles.length === 0) {
                alert('请先选择要上传的文件');
                return;
            }

            submitFileBtn.disabled = true;
            submitFileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在上传...';
            progressContainer.style.display = 'block';

            try {
                for (let i = 0; i < selectedFiles.length; i++) {
                    const file = selectedFiles[i];
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('password', filePassword.value);
                    formData.append('duration', fileDuration.value);
                    formData.append('customUrl', fileCustomUrl.value);
                    formData.append('maxViews', fileMaxViews.value);

                    // 重置上传速度计算
                    uploadStartTime = Date.now();
                    lastUploadedBytes = 0;
                    lastUploadTime = uploadStartTime;
                    uploadSpeed = 0;

                    // 使用 XMLHttpRequest 替代 fetch 以支持上传进度
                    const response = await new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        
                        xhr.upload.addEventListener('progress', (progressEvent) => {
                            if (progressEvent.lengthComputable) {
                                const currentTime = Date.now();
                                const speed = calculateSpeed(progressEvent.loaded, currentTime);
                                
                                // 计算进度百分比
                                const progress = (progressEvent.loaded / progressEvent.total) * 100;
                                
                                // 更新进度显示
                                progressBar.style.width = `${progress}%`;
                                progressPercent.textContent = `${Math.round(progress)}%`;
                                
                                // 更新文件名和速度显示
                                const remainingBytes = progressEvent.total - progressEvent.loaded;
                                const estimatedTimeSeconds = speed > 0 ? remainingBytes / speed : 0;
                                
                                // 使用图标显示上传状态
                                progressText.innerHTML = `
                                    <i class="fas fa-file"></i>
                                    <i class="fas fa-arrow-right"></i>
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <span class="upload-count">${i + 1}/${selectedFiles.length}</span>
                                    <i class="fas fa-tachometer-alt"></i>
                                    <span class="upload-speed">${formatSpeed(speed)}</span>
                                    ${estimatedTimeSeconds > 0 ? `
                                        <i class="far fa-clock"></i>
                                        <span class="time-remaining">${Math.ceil(estimatedTimeSeconds)}s</span>
                                    ` : ''}
                                `;
                            }
                        });

                        xhr.upload.addEventListener('loadstart', () => {
                            uploadStartTime = Date.now();
                            lastUploadTime = uploadStartTime;
                            lastUploadedBytes = 0;
                        });

                        xhr.upload.addEventListener('loadend', () => {
                            // 清理速度更新定时器
                            if (speedUpdateInterval) {
                                clearInterval(speedUpdateInterval);
                                speedUpdateInterval = null;
                            }
                        });

                        xhr.addEventListener('load', () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                resolve({
                                    ok: true,
                                    json: () => Promise.resolve(JSON.parse(xhr.responseText))
                                });
                            } else {
                                reject(new Error(`HTTP Error: ${xhr.status}`));
                            }
                        });

                        xhr.addEventListener('error', () => {
                            reject(new Error('Network Error'));
                        });

                        xhr.open('POST', '/api/file');
                        xhr.send(formData);
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || '上传失败');
                    }

                    const result = await response.json();
                    if (result.success) {
                        // 创建结果显示
                        const resultDiv = document.getElementById('result');
                        const url = `${window.location.origin}${result.data.url}`;
                        
                        // 获取过期时间文本
                        const durationText = {
                            '1h': '1小时后过期',
                            '1d': '1天后过期',
                            '7d': '7天后过期',
                            '30d': '30天后过期',
                            'never': '永久有效'
                        };

                        // 创建新的结果元素
                        const newResultDiv = document.createElement('div');
                        newResultDiv.innerHTML = `
                            <div class="share-result success">
                                <div class="result-header">
                                    <i class="fas fa-check-circle"></i>
                                    <h3>文件上传成功！</h3>
                                </div>
                                <div class="file-info">
                                    <div class="info-item">
                                        <i class="fas ${getFileIcon(file.type)}"></i>
                                        <span>${file.name}</span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-weight"></i>
                                        <span>${formatFileSize(file.size)}</span>
                                    </div>
                                </div>
                                <div class="share-settings">
                                    <div class="setting-item">
                                        <i class="far fa-clock"></i>
                                        <span>${durationText[fileDuration.value]}</span>
                                    </div>
                                    ${filePassword.value ? `
                                        <div class="setting-item">
                                            <i class="fas fa-lock"></i>
                                            <span>已设置密码保护</span>
                                        </div>
                                    ` : ''}
                                    ${fileMaxViews.value > 0 ? `
                                        <div class="setting-item">
                                            <i class="far fa-eye"></i>
                                            <span>限制访问 ${fileMaxViews.value} 次</span>
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="share-link-container">
                                    <div class="link-group">
                                        <input type="text" class="share-link" value="${url}" readonly>
                                        <button class="copy-btn" onclick="copyToClipboard('${url}')" title="复制链接">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                    <div class="qr-group">
                                        <button class="qr-btn" onclick="toggleQRCode('${url}')" title="显示二维码">
                                            <i class="fas fa-qrcode"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="qr-code-container" style="display: none;">
                                    <div class="qr-code"></div>
                                    <button class="download-qr" title="下载二维码">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                            </div>
                        `;

                        // 将新的结果添加到结果区域的顶部
                        resultDiv.insertBefore(newResultDiv, resultDiv.firstChild);

                        // 自动选中分享链接
                        const shareLinkInput = newResultDiv.querySelector('.share-link');
                        shareLinkInput.select();

                        // 从选中的文件列表中移除已上传的文件
                        selectedFiles = selectedFiles.filter(f => f !== file);
                        const fileList = document.getElementById('fileList');
                        const fileElement = Array.from(fileList.children).find(el => 
                            el.querySelector('.file-name').textContent === file.name
                        );
                        if (fileElement) {
                            fileElement.remove();
                        }

                        // 添加到存储列表
                        displayStorageList(null, {
                            type: 'file',
                            filename: result.data.filename,
                            mimetype: file.type,
                            filesize: file.size
                        });

                        // 刷新分享统计
                        fetchShareStats();
                    }
                }

                // 更新上传区域可见性
                updateUploadAreaVisibility();

                // 重置表单但保持上传区域可用
                filePassword.value = '';
                fileCustomUrl.value = '';
                fileMaxViews.value = '0';

            } catch (error) {
                console.error('上传文件时出错：', error);
                alert('上传失败：' + error.message);
            } finally {
                submitFileBtn.disabled = false;
                submitFileBtn.innerHTML = '<i class="fas fa-share"></i> 创建文件分享';
                progressContainer.style.display = 'none';
                progressBar.style.width = '0%';
                progressPercent.textContent = '0%';
                progressText.textContent = '正在上传...';
            }
        });
    }
}

// 获取分享统计数据
async function fetchShareStats() {
    try {
        console.log('开始获取统计数据');
        const response = await fetch('/api/share/stats', {
            // 添加 no-cache 确保获取最新数据
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取统计数据失败');
        }
        
        const data = await response.json();
        console.log('获取到的统计数据:', data);
        
        // 立即更新显示
        const totalSharesEl = document.getElementById('totalShares');
        const activeSharesEl = document.getElementById('activeShares');
        const usedStorageEl = document.getElementById('usedStorage');
        const totalStorageEl = document.getElementById('totalStorage');
        const usagePercentEl = document.getElementById('usagePercent');
        const usageProgressEl = document.querySelector('.usage-progress');
        
        // 只有在请求成功且有数据时才更新显示
        if (data.success && data.data) {
            if (totalSharesEl) totalSharesEl.textContent = data.data.totalShares || 0;
            if (activeSharesEl) activeSharesEl.textContent = data.data.activeShares || 0;
            if (usedStorageEl) usedStorageEl.textContent = formatFileSize(data.data.usedStorage || 0);
            if (totalStorageEl) totalStorageEl.textContent = formatFileSize(data.data.totalStorage || 0);
            
            if (usagePercentEl && usageProgressEl && data.data.totalStorage > 0) {
                const percent = ((data.data.usedStorage / data.data.totalStorage) * 100).toFixed(1);
                usagePercentEl.textContent = `${percent}%`;
                usageProgressEl.style.width = `${percent}%`;
            }
            
            // 更新缓存
            localStorage.setItem('shareStats', JSON.stringify({
                totalShares: data.data.totalShares || 0,
                activeShares: data.data.activeShares || 0
            }));
        }
    } catch (error) {
        console.error('获取统计数据失败:', error);
        // 从缓存获取之前的统计数据
        const cachedStats = JSON.parse(localStorage.getItem('shareStats') || '{"totalShares":0,"activeShares":0}');
        
        // 发生错误时使用缓存数据
        const totalSharesEl = document.getElementById('totalShares');
        const activeSharesEl = document.getElementById('activeShares');
        
        if (totalSharesEl) totalSharesEl.textContent = cachedStats.totalShares;
        if (activeSharesEl) activeSharesEl.textContent = cachedStats.activeShares;
    }
}

// 获取存储列表
async function fetchStorageList() {
    const shareItems = document.getElementById('shareItems');
    
    try {
        // 显示加载状态
        shareItems.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>正在加载存储列表...</p>
            </div>
        `;

        const response = await fetch('/api/share/storage');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            // 清空加载状态
            shareItems.innerHTML = '';
            displayStorageList(data.data);
        } else {
            throw new Error(data.message || '获取存储列表失败');
        }
    } catch (err) {
        console.error('获取存储列表失败:', err);
        shareItems.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>获取存储列表失败: ${err.message}</p>
                <button onclick="fetchStorageList()" class="retry-btn">
                    <i class="fas fa-redo"></i> 重试
                </button>
            </div>
        `;
    }
}

// 显示存储列表
function displayStorageList(data, newItem = null) {
    const shareItems = document.getElementById('shareItems');
    
    // 如果是新项插入，找到对应的列表并插入
    if (newItem) {
        if (newItem.type === 'text') {
            // 找到 KV 列表
            const kvList = shareItems.querySelector('.kv-list');
            if (kvList) {
                const newItemHtml = `
                    <div class="storage-item" data-id="${newItem.id}">
                        <div class="storage-item-icon">
                            <i class="fas fa-key"></i>
                        </div>
                        <div class="storage-item-info">
                            <div class="storage-item-name">${newItem.id}</div>
                            <div class="storage-item-meta">
                                <span><i class="fas fa-clock"></i> ${new Date(newItem.expiresAt).toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="storage-item-actions">
                            <button class="storage-item-btn copy" title="复制">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="storage-item-btn delete" title="删除" onclick="deleteStorageItem('${newItem.id}', 'kv')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                // 插入到标题后面
                const title = kvList.querySelector('.storage-title');
                title.insertAdjacentHTML('afterend', newItemHtml);
                
                // 为新项添加事件监听器
                const newElement = kvList.querySelector(`[data-id="${newItem.id}"]`);
                if (newElement) {
                    addStorageItemEventListeners(newElement);
                }
                return;
            }
        } else if (newItem.type === 'file') {
            // 找到 R2 列表
            const r2List = shareItems.querySelector('.r2-list');
            if (r2List) {
                const newItemHtml = `
                    <div class="storage-item" data-id="${newItem.filename}">
                        <div class="storage-item-icon">
                            <i class="fas ${getFileIcon(newItem.mimetype)}"></i>
                        </div>
                        <div class="storage-item-info">
                            <div class="storage-item-name">${newItem.filename}</div>
                            <div class="storage-item-meta">
                                <span><i class="fas fa-clock"></i> ${new Date().toLocaleString()}</span>
                                <span><i class="fas fa-weight"></i> ${formatFileSize(newItem.filesize)}</span>
                            </div>
                        </div>
                        <div class="storage-item-actions">
                            <button class="storage-item-btn copy" title="复制">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="storage-item-btn delete" title="删除" onclick="deleteStorageItem('${newItem.filename}', 'r2')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                // 插入到标题后面
                const title = r2List.querySelector('.storage-title');
                title.insertAdjacentHTML('afterend', newItemHtml);
                
                // 为新项添加事件监听器
                const newElement = r2List.querySelector(`[data-id="${newItem.filename}"]`);
                if (newElement) {
                    addStorageItemEventListeners(newElement);
                }
                return;
            }
        }
    }

    // 如果不是插入新项或插入失败，则显示完整列表
    const storageResults = document.createElement('div');
    storageResults.className = 'storage-results';

    // KV 存储列表
    const kvList = document.createElement('div');
    kvList.className = 'kv-list';
    kvList.innerHTML = `
        <h3 class="storage-title"><i class="fas fa-database"></i> KV 存储</h3>
        ${data.kv.map(item => `
            <div class="storage-item" data-id="${item.name}">
                <div class="storage-item-icon">
                    <i class="fas fa-key"></i>
                </div>
                <div class="storage-item-info">
                    <div class="storage-item-name">${item.name}</div>
                    <div class="storage-item-meta">
                        <span><i class="fas fa-clock"></i> ${new Date(item.expiration * 1000).toLocaleString()}</span>
                    </div>
                </div>
                <div class="storage-item-actions">
                    <button class="storage-item-btn copy" title="复制">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="storage-item-btn delete" title="删除" onclick="deleteStorageItem('${item.name}', 'kv')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('')}
    `;

    // R2 存储列表
    const r2List = document.createElement('div');
    r2List.className = 'r2-list';
    r2List.innerHTML = `
        <h3 class="storage-title"><i class="fas fa-cloud"></i> R2 存储</h3>
        ${data.r2.map(item => `
            <div class="storage-item" data-id="${item.Key}">
                <div class="storage-item-icon">
                    <i class="fas fa-file"></i>
                </div>
                <div class="storage-item-info">
                    <div class="storage-item-name">${item.Key}</div>
                    <div class="storage-item-meta">
                        <span><i class="fas fa-clock"></i> ${new Date(item.LastModified).toLocaleString()}</span>
                        <span><i class="fas fa-weight"></i> ${formatFileSize(item.Size)}</span>
                    </div>
                </div>
                <div class="storage-item-actions">
                    <button class="storage-item-btn copy" title="复制">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="storage-item-btn delete" title="删除" onclick="deleteStorageItem('${item.Key}', 'r2')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('')}
    `;

    storageResults.appendChild(kvList);
    storageResults.appendChild(r2List);
    shareItems.innerHTML = ''; // 清空现有内容
    shareItems.appendChild(storageResults);

    // 添加事件监听器
    addStorageItemEventListeners();
}

// 修改事件监听器添加函数
function addStorageItemEventListeners(container = document) {
    // 复制按钮事件
    container.querySelectorAll('.storage-item-btn.copy').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const item = e.target.closest('.storage-item');
            const name = item.querySelector('.storage-item-name').textContent;
            try {
                await navigator.clipboard.writeText(name);
                showToast('已复制到剪贴板', 'success');
            } catch (err) {
                console.error('复制失败:', err);
                showToast('复制失败', 'error');
            }
        });
    });
}

// 在刷新列表时调用
document.getElementById('refreshList').addEventListener('click', () => {
    fetchStorageList();
});

// 初始化时调用
document.addEventListener('DOMContentLoaded', () => {
    fetchStorageList();
});

// Toast 通知功能
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);

    // 添加显示类以触发动画
    setTimeout(() => toast.classList.add('show'), 10);

    // 3秒后移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 添加 Toast 样式
const style = document.createElement('style');
style.textContent = `
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 4px;
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transform: translateX(120%);
        transition: transform 0.3s ease-in-out;
        z-index: 1000;
        display: flex;
        align-items: center;
        min-width: 250px;
    }

    .toast.show {
        transform: translateX(0);
    }

    .toast-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .toast-success {
        background: #f0fdf4;
        border-left: 4px solid #22c55e;
        color: #15803d;
    }

    .toast-error {
        background: #fef2f2;
        border-left: 4px solid #ef4444;
        color: #b91c1c;
    }

    .toast-info {
        background: #eff6ff;
        border-left: 4px solid #3b82f6;
        color: #1d4ed8;
    }

    .toast i {
        font-size: 1.2em;
    }
`;
document.head.appendChild(style);

// 修改删除按钮的点击处理函数
async function handleDelete(id) {
    try {
        const response = await fetch(`/api/share/${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('删除成功', 'success');
            // 重新加载分享列表
            await fetchShareList();
            // 重新加载存储列表
            await fetchStorageList();
            // 重新加载统计数据
            await fetchShareStats();
        } else {
            showToast(data.message || '删除失败', 'error');
        }
    } catch (err) {
        console.error('删除失败:', err);
        showToast('删除失败: ' + err.message, 'error');
    }
}

// 删除存储项
async function deleteStorageItem(id, type) {
    const confirmed = await showConfirmDialog(
        '确定要删除这个文本分享吗？',
        '此操作不可恢复！'
    );
    
    if (!confirmed) return;

    try {
        // 立即从界面上移除
        const item = document.querySelector(`.storage-item[data-id="${id}"]`);
        if (item) {
            item.remove();
        }

        // 发送删除请求
        const response = await fetch(`/api/share/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        const data = await response.json();
        
        if (data.success) {
            // 只更新统计数据，不显示成功通知
            await fetchShareStats();
        } else {
            // 如果删除失败，显示错误消息并重新获取列表
            showToast(data.message || '删除失败', 'error');
            await fetchStorageList();
        }
    } catch (err) {
        console.error('删除失败:', err);
        showToast(err.message || '删除失败', 'error');
        // 如果出错，重新获取列表以恢复状态
        await fetchStorageList();
    }
}

// 添加确认对话框样式
const confirmDialogStyle = document.createElement('style');
confirmDialogStyle.textContent = `
    .confirm-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .confirm-dialog {
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .confirm-dialog h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        color: #333;
    }

    .confirm-dialog p {
        margin: 0 0 20px 0;
        color: #666;
    }

    .confirm-dialog p.warning {
        color: #dc2626;
        font-weight: 500;
    }

    .confirm-dialog-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    }

    .confirm-dialog-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
    }

    .confirm-dialog-btn.confirm {
        background: #3b82f6;
        color: white;
    }

    .confirm-dialog-btn.confirm:hover {
        background: #2563eb;
    }

    .confirm-dialog-btn.cancel {
        background: #e5e7eb;
        color: #374151;
    }

    .confirm-dialog-btn.cancel:hover {
        background: #d1d5db;
    }
`;
document.head.appendChild(confirmDialogStyle);

// 显示确认对话框
function showConfirmDialog(message, warningText) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';
        
        overlay.innerHTML = `
            <div class="confirm-dialog">
                <h3>确认删除</h3>
                <p>${message}</p>
                ${warningText ? `<p class="warning">${warningText}</p>` : ''}
                <div class="confirm-dialog-buttons">
                    <button class="confirm-dialog-btn confirm">确定删除</button>
                    <button class="confirm-dialog-btn cancel">取消</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const dialog = overlay.querySelector('.confirm-dialog');
        const confirmBtn = dialog.querySelector('.confirm-dialog-btn.confirm');
        const cancelBtn = dialog.querySelector('.confirm-dialog-btn.cancel');
        
        function close(result) {
            overlay.remove();
            resolve(result);
        }
        
        confirmBtn.addEventListener('click', () => close(true));
        cancelBtn.addEventListener('click', () => close(false));
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(false);
        });
        
        // ESC 键关闭
        document.addEventListener('keydown', function escListener(e) {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escListener);
                close(false);
            }
        });
    });
} 