import crypto from 'crypto';

export function generateId(length = 8) {
  return crypto.randomBytes(length).toString('hex');
}

export function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9-_\.]/g, '_');
}

export function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

export function getMimeType(filename) {
  const ext = getFileExtension(filename).toLowerCase();
  const mimeTypes = {
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'md': 'text/markdown'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function isValidDate(date) {
  return date instanceof Date && !isNaN(date);
}

export function addDuration(duration) {
  const now = new Date();
  const units = {
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'w': 7 * 24 * 60 * 60 * 1000
  };

  const match = duration.match(/^(\d+)([mhdw])$/);
  if (!match) return null;

  const [, amount, unit] = match;
  return new Date(now.getTime() + parseInt(amount) * units[unit]);
} 