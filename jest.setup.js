import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// 模拟浏览器环境
global.window = {
    location: {
        href: 'http://localhost'
    }
};

// 模拟 localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// 模拟 document
document.body.innerHTML = '';

// 模拟 fetch API
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        blob: () => Promise.resolve(new Blob()),
        text: () => Promise.resolve(''),
    })
); 