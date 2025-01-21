import { jest } from '@jest/globals';
import { setupEventListeners, setupMarkdownPreview } from './testUtils';

describe('主题切换功能测试', () => {
    beforeEach(() => {
        document.documentElement.setAttribute('data-theme', 'light');
    });

    test('默认主题应该是 light', () => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    test('切换到暗色主题', () => {
        document.documentElement.setAttribute('data-theme', 'dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('自动主题模式', () => {
        document.documentElement.setAttribute('data-theme', 'auto');
        expect(document.documentElement.getAttribute('data-theme')).toBe('auto');
    });

    test('切换无效的主题值', () => {
        document.documentElement.setAttribute('data-theme', 'invalid');
        expect(document.documentElement.getAttribute('data-theme')).toBe('invalid');
        // 主题切换应该容忍无效值，不应抛出错误
    });
});

describe('文本编辑器功能测试', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="editor-wrapper">
                <textarea id="textContent"></textarea>
                <div id="charCount">0 字符</div>
            </div>
        `;
        setupEventListeners();
    });

    test('文本输入应该更新字符计数', () => {
        const textarea = document.getElementById('textContent');
        const charCount = document.getElementById('charCount');
        
        textarea.value = 'Hello World';
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(event);
        
        expect(charCount.textContent).toBe('11 字符');
    });

    test('清空文本应该重置字符计数', () => {
        const textarea = document.getElementById('textContent');
        const charCount = document.getElementById('charCount');
        
        textarea.value = '';
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(event);
        
        expect(charCount.textContent).toBe('0 字符');
    });

    test('处理特殊字符', () => {
        const textarea = document.getElementById('textContent');
        const charCount = document.getElementById('charCount');
        
        textarea.value = '你好，世界！\n\t\r';
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(event);
        
        expect(charCount.textContent).toBe('9 字符');
    });

    test('处理超长文本', () => {
        const textarea = document.getElementById('textContent');
        const charCount = document.getElementById('charCount');
        
        const longText = 'a'.repeat(10000);
        textarea.value = longText;
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(event);
        
        expect(charCount.textContent).toBe('10000 字符');
    });

    test('处理null和undefined输入', () => {
        const textarea = document.getElementById('textContent');
        const charCount = document.getElementById('charCount');
        
        textarea.value = null;
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(event);
        expect(charCount.textContent).toBe('0 字符');

        textarea.value = undefined;
        textarea.dispatchEvent(event);
        expect(charCount.textContent).toBe('0 字符');
    });

    test('处理emoji字符', () => {
        const textarea = document.getElementById('textContent');
        const charCount = document.getElementById('charCount');
        
        textarea.value = '👋🌍✨';  // emoji字符
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(event);
        expect(charCount.textContent).toBe('3 字符');
    });
});

describe('文件上传功能测试', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="uploadArea">
                <input type="file" id="fileInput" multiple>
                <div id="fileList"></div>
            </div>
        `;
        setupEventListeners();
    });

    test('应该能够添加文件到上传列表', () => {
        const fileInput = document.getElementById('fileInput');
        const fileList = document.getElementById('fileList');
        
        const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
        Object.defineProperty(fileInput, 'files', {
            value: [file],
            writable: false
        });
        
        const event = new Event('change', {
            bubbles: true,
            cancelable: true,
        });
        fileInput.dispatchEvent(event);
        
        expect(fileList.children.length).toBe(1);
    });

    test('处理空文件列表', () => {
        const fileInput = document.getElementById('fileInput');
        const fileList = document.getElementById('fileList');
        
        Object.defineProperty(fileInput, 'files', {
            value: [],
            writable: false
        });
        
        const event = new Event('change', {
            bubbles: true,
            cancelable: true,
        });
        fileInput.dispatchEvent(event);
        
        expect(fileList.children.length).toBe(0);
    });

    test('处理大文件', () => {
        const fileInput = document.getElementById('fileInput');
        const fileList = document.getElementById('fileList');
        
        const largeContent = new ArrayBuffer(100 * 1024 * 1024); // 100MB
        const file = new File([largeContent], 'large.bin', { type: 'application/octet-stream' });
        Object.defineProperty(fileInput, 'files', {
            value: [file],
            writable: false
        });
        
        const event = new Event('change', {
            bubbles: true,
            cancelable: true,
        });
        fileInput.dispatchEvent(event);
        
        const sizeText = fileList.querySelector('.file-size').textContent;
        expect(sizeText).toBe('100 MB');
    });

    test('处理无效的文件类型', () => {
        const fileInput = document.getElementById('fileInput');
        const fileList = document.getElementById('fileList');
        
        const file = new File(['test content'], 'test.invalid', { type: 'invalid/type' });
        Object.defineProperty(fileInput, 'files', {
            value: [file],
            writable: false
        });
        
        const event = new Event('change', {
            bubbles: true,
            cancelable: true,
        });
        fileInput.dispatchEvent(event);
        
        expect(fileList.children.length).toBe(1);  // 应该仍然显示文件
    });

    test('处理零字节文件', () => {
        const fileInput = document.getElementById('fileInput');
        const fileList = document.getElementById('fileList');
        
        const file = new File([], 'empty.txt', { type: 'text/plain' });
        Object.defineProperty(fileInput, 'files', {
            value: [file],
            writable: false
        });
        
        const event = new Event('change', {
            bubbles: true,
            cancelable: true,
        });
        fileInput.dispatchEvent(event);
        
        const sizeText = fileList.querySelector('.file-size').textContent;
        expect(sizeText).toBe('0 B');
    });
});

describe('密码保护功能测试', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="password-input-container">
                <input type="password" id="sharePassword">
                <button class="password-toggle-btn" type="button">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `;
        setupEventListeners();
    });

    test('切换密码可见性', () => {
        const passwordInput = document.getElementById('sharePassword');
        const toggleBtn = document.querySelector('.password-toggle-btn');
        
        toggleBtn.click();
        expect(passwordInput.type).toBe('text');
        
        toggleBtn.click();
        expect(passwordInput.type).toBe('password');
    });

    test('密码输入验证', () => {
        const passwordInput = document.getElementById('sharePassword');
        
        // 测试密码输入
        passwordInput.value = 'test123';
        expect(passwordInput.value).toBe('test123');
        
        // 测试空密码
        passwordInput.value = '';
        expect(passwordInput.value).toBe('');
    });

    test('处理特殊字符密码', () => {
        const passwordInput = document.getElementById('sharePassword');
        const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        passwordInput.value = specialChars;
        expect(passwordInput.value).toBe(specialChars);
    });

    test('处理超长密码', () => {
        const passwordInput = document.getElementById('sharePassword');
        const longPassword = 'a'.repeat(1000);
        
        passwordInput.value = longPassword;
        expect(passwordInput.value).toBe(longPassword);
    });
});

describe('分享链接功能测试', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="share-link-container">
                <input type="text" id="shareLink" readonly>
                <button class="copy-btn" id="copyShareLink">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
            <div id="toast" class="toast"></div>
        `;
        setupEventListeners();
    });

    test('复制分享链接到剪贴板', async () => {
        const shareLink = document.getElementById('shareLink');
        const copyBtn = document.getElementById('copyShareLink');
        const toast = document.getElementById('toast');
        
        Object.assign(navigator, {
            clipboard: {
                writeText: jest.fn().mockImplementation(() => Promise.resolve()),
            },
        });
        
        shareLink.value = 'https://example.com/share/123';
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        await copyBtn.dispatchEvent(event);
        
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/share/123');
        expect(toast.classList.contains('show')).toBe(true);
    });

    test('处理复制失败的情况', async () => {
        const shareLink = document.getElementById('shareLink');
        const copyBtn = document.getElementById('copyShareLink');
        const toast = document.getElementById('toast');
        
        Object.assign(navigator, {
            clipboard: {
                writeText: jest.fn().mockImplementation(() => Promise.reject(new Error('Copy failed'))),
            },
        });
        
        shareLink.value = 'https://example.com/share/123';
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        await copyBtn.dispatchEvent(event);
        expect(toast.classList.contains('show')).toBe(false);
    });

    test('处理空链接', async () => {
        const shareLink = document.getElementById('shareLink');
        const copyBtn = document.getElementById('copyShareLink');
        const toast = document.getElementById('toast');
        
        Object.assign(navigator, {
            clipboard: {
                writeText: jest.fn().mockImplementation(() => Promise.resolve()),
            },
        });
        
        shareLink.value = '';
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        await copyBtn.dispatchEvent(event);
        
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('');
        expect(toast.classList.contains('show')).toBe(true);
    });

    test('处理特殊字符链接', async () => {
        const shareLink = document.getElementById('shareLink');
        const copyBtn = document.getElementById('copyShareLink');
        const toast = document.getElementById('toast');
        
        Object.assign(navigator, {
            clipboard: {
                writeText: jest.fn().mockImplementation(() => Promise.resolve()),
            },
        });
        
        shareLink.value = 'https://example.com/?q=特殊字符&param=!@#$%^&*()';
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        await copyBtn.dispatchEvent(event);
        
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/?q=特殊字符&param=!@#$%^&*()');
        expect(toast.classList.contains('show')).toBe(true);
    });
});

describe('Markdown预览功能测试', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="editor-content">
                <div class="content-view active">
                    <textarea id="textContent"></textarea>
                </div>
                <div class="preview-view">
                    <div class="preview-content"></div>
                </div>
            </div>
        `;
        setupEventListeners();
        setupMarkdownPreview();
    });

    test('Markdown内容应该正确渲染', () => {
        const textarea = document.getElementById('textContent');
        const previewContent = document.querySelector('.preview-content');
        
        textarea.value = '# 标题\n\n**粗体文本**';
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(event);
        
        expect(previewContent.innerHTML).toContain('<h1>');
        expect(previewContent.innerHTML).toContain('<strong>');
    });

    test('处理空Markdown内容', () => {
        const textarea = document.getElementById('textContent');
        const previewContent = document.querySelector('.preview-content');
        
        textarea.value = '';
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(event);
        
        expect(previewContent.innerHTML).toBe('');
    });

    test('处理复杂Markdown语法', () => {
        const textarea = document.getElementById('textContent');
        const previewContent = document.querySelector('.preview-content');
        
        textarea.value = `# 一级标题
## 二级标题

**粗体** *斜体*

- 列表项1
- 列表项2

1. 有序列表1
2. 有序列表2

> 引用文本

\`\`\`javascript
console.log('代码块');
\`\`\``;
        
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(event);
        
        expect(previewContent.innerHTML).toContain('<h1>');
        expect(previewContent.innerHTML).toContain('<h2>');
        expect(previewContent.innerHTML).toContain('<strong>');
        expect(previewContent.innerHTML).toContain('<em>');
        expect(previewContent.innerHTML).toContain('<ul>');
        expect(previewContent.innerHTML).toContain('<ol>');
        expect(previewContent.innerHTML).toContain('<blockquote>');
        expect(previewContent.innerHTML).toContain('<code>');
    });

    test('处理HTML注入', () => {
        const textarea = document.getElementById('textContent');
        const previewContent = document.querySelector('.preview-content');
        
        textarea.value = '<script>alert("xss")</script>\n<img src="x" onerror="alert(1)">';
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(event);
        
        expect(previewContent.innerHTML).not.toContain('<script>');
        expect(previewContent.innerHTML).not.toContain('onerror=');
    });

    test('处理嵌套Markdown语法', () => {
        const textarea = document.getElementById('textContent');
        const previewContent = document.querySelector('.preview-content');
        
        textarea.value = '# **粗体标题**\n> *斜体引用*\n- `代码列表项`';
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        textarea.dispatchEvent(event);
        
        expect(previewContent.innerHTML).toContain('<h1><strong>');
        expect(previewContent.innerHTML).toContain('<blockquote><em>');
        expect(previewContent.innerHTML).toContain('<ul><li><code>');
    });
}); 