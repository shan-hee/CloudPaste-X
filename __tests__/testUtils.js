import { jest } from '@jest/globals';

// 简单的Markdown解析函数
function simpleMarkdown(text) {
    if (!text) return '';
    
    // 转义HTML
    text = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/onerror=/g, 'data-error=');  // 移除危险属性

    // 处理引用块
    text = text.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');

    // 处理其他Markdown语法
    text = text
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*$)/gm, '<ul><li>$1</li></ul>')
        .replace(/^[0-9]+\. (.*$)/gm, '<ol><li>$1</li></ol>')
        .replace(/`{3}([\s\S]*?)`{3}/gm, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');

    // 处理嵌套标签
    text = text
        .replace(/(<blockquote>)(.*?)(<\/blockquote>)/g, (match, p1, p2, p3) => {
            p2 = simpleMarkdown(p2);
            return p1 + p2 + p3;
        })
        .replace(/(<h[12]>)(.*?)(<\/h[12]>)/g, (match, p1, p2, p3) => {
            p2 = simpleMarkdown(p2);
            return p1 + p2 + p3;
        })
        .replace(/(<[uo]l><li>)(.*?)(<\/li><\/[uo]l>)/g, (match, p1, p2, p3) => {
            p2 = simpleMarkdown(p2);
            return p1 + p2 + p3;
        });

    // 还原已转义的HTML标签
    text = text
        .replace(/&lt;(\/?(h[12]|strong|em|ul|ol|li|blockquote|code|pre))&gt;/g, '<$1>')
        .replace(/&lt;(\/?(h[12]|strong|em|ul|ol|li|blockquote|code|pre))\s*&gt;/g, '<$1>')
        .replace(/&gt; /g, '<blockquote>') // 修复引用块的渲染
        .replace(/·$/gm, '</blockquote>'); // 使用特殊字符作为引用块的结束标记

    return text;
}

// DOM 事件处理函数
export function setupEventListeners() {
    // 文本输入处理
    const handleInput = (e) => {
        if (e.target.id === 'textContent') {
            const charCount = document.getElementById('charCount');
            if (charCount) {
                const text = e.target.value;
                if (text === undefined || text === null || text === '' || text === 'undefined') {
                    charCount.textContent = '0 字符';
                    return;
                }
                charCount.textContent = `${[...String(text).replace(/\r\n/g, '\n')].length} 字符`;
            }
        }
    };
    document.removeEventListener('input', handleInput);
    document.addEventListener('input', handleInput);

    // 文件上传处理
    const handleFileChange = (e) => {
        if (e.target.id === 'fileInput' && e.target.files.length > 0) {
            const fileList = document.getElementById('fileList');
            if (fileList) {
                // 清空现有内容
                fileList.innerHTML = '';
                // 添加新文件
                const div = document.createElement('div');
                div.className = 'file-preview';
                div.innerHTML = `
                    <i class="fas fa-file"></i>
                    <div class="file-info">
                        <div class="file-name">${e.target.files[0].name}</div>
                        <div class="file-size">${formatFileSize(e.target.files[0].size)}</div>
                    </div>
                `;
                fileList.appendChild(div);
            }
        }
    };
    document.removeEventListener('change', handleFileChange);
    document.addEventListener('change', handleFileChange);

    // 密码可见性切换
    const handlePasswordToggle = () => {
        const passwordInput = document.getElementById('sharePassword');
        if (passwordInput) {
            passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
        }
    };

    const toggleBtn = document.querySelector('.password-toggle-btn');
    if (toggleBtn) {
        toggleBtn.removeEventListener('click', handlePasswordToggle);
        toggleBtn.addEventListener('click', handlePasswordToggle);
    }

    // 复制链接处理
    const handleCopy = async (e) => {
        const copyBtn = e.target.closest('#copyShareLink');
        if (copyBtn) {
            const shareLink = document.getElementById('shareLink');
            const toast = document.getElementById('toast');
            if (shareLink && toast) {
                try {
                    await navigator.clipboard.writeText(shareLink.value);
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 2000);
                } catch (error) {
                    console.error('复制失败:', error);
                }
            }
        }
    };
    document.removeEventListener('click', handleCopy);
    document.addEventListener('click', handleCopy);
}

// Markdown 渲染
export function setupMarkdownPreview() {
    const handleMarkdownInput = (e) => {
        if (e.target.id === 'textContent') {
            const previewContent = document.querySelector('.preview-content');
            if (previewContent) {
                const text = e.target.value || '';
                if (!text.trim()) {
                    previewContent.innerHTML = '';
                    return;
                }

                try {
                    const html = simpleMarkdown(text);
                    previewContent.innerHTML = html;
                } catch (error) {
                    console.error('Markdown渲染失败:', error);
                    previewContent.innerHTML = '<div class="error">Markdown渲染失败</div>';
                }
            }
        }
    };
    document.removeEventListener('input', handleMarkdownInput);
    document.addEventListener('input', handleMarkdownInput);
}

// 辅助函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 