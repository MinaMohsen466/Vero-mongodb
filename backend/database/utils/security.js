const crypto = require('crypto');

const PBKDF2_ITERATIONS_V2 = 600000;
const PBKDF2_ITERATIONS_V1 = 1000;

function hashPassword(password) {
    if (!password) return '';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS_V2, 64, 'sha512').toString('hex');
    return `pbkdf2v2$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
    if (!storedPassword || !password) return false;
    if (storedPassword.startsWith('pbkdf2v2$')) {
        const parts = storedPassword.split('$');
        if (parts.length === 3) {
            const salt = parts[1];
            const originalHash = parts[2];
            const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS_V2, 64, 'sha512').toString('hex');
            try { return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex')); } catch(e) { return false; }
        }
    }
    if (storedPassword.startsWith('pbkdf2$')) {
        const parts = storedPassword.split('$');
        if (parts.length === 3) {
            const salt = parts[1];
            const originalHash = parts[2];
            const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS_V1, 64, 'sha512').toString('hex');
            try { return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex')); } catch(e) { return false; }
        }
    }
    console.warn('[Security] Plaintext password comparison detected - will be upgraded on next login');
    return password === storedPassword;
}

function encryptData(text, keyHex) {
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

function decryptData(encryptedText, keyHex) {
    const key = Buffer.from(keyHex, 'hex');
    const parts = encryptedText.split(':');
    if (parts.length !== 2) throw new Error('Invalid encrypted backup format');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = {
    hashPassword,
    verifyPassword,
    encryptData,
    decryptData
};
