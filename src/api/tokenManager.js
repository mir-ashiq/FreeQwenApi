import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logError, logInfo } from '../logger/index.js';
import { SESSION_DIR, ACCOUNTS_DIR } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SESSION_PATH = path.resolve(__dirname, '..', '..', SESSION_DIR);
const ACCOUNTS_PATH = path.join(SESSION_PATH, ACCOUNTS_DIR);
const TOKENS_FILE = path.join(SESSION_PATH, 'tokens.json');

let pointer = 0;

function ensureSessionDir() {
    if (!fs.existsSync(SESSION_PATH)) fs.mkdirSync(SESSION_PATH, { recursive: true });
    if (!fs.existsSync(ACCOUNTS_PATH)) fs.mkdirSync(ACCOUNTS_PATH, { recursive: true });
}

/**
 * Load tokens from environment variables
 * Supports QWEN_TOKEN (single) and QWEN_TOKENS (comma-separated)
 */
function loadTokensFromEnv() {
    const envTokens = [];
    
    // Single token from QWEN_TOKEN
    if (process.env.QWEN_TOKEN) {
        const token = process.env.QWEN_TOKEN.trim();
        if (token) {
            envTokens.push({
                id: 'env_token_1',
                token: token,
                name: 'Environment Token',
                addedAt: new Date().toISOString(),
                source: 'env',
                invalid: false,
                resetAt: null
            });
            logInfo('Loaded 1 token from QWEN_TOKEN environment variable');
        }
    }
    
    // Multiple tokens from QWEN_TOKENS (comma-separated)
    if (process.env.QWEN_TOKENS) {
        const tokens = process.env.QWEN_TOKENS
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);
        
        tokens.forEach((token, index) => {
            envTokens.push({
                id: `env_token_${index + 1}`,
                token: token,
                name: `Environment Token ${index + 1}`,
                addedAt: new Date().toISOString(),
                source: 'env',
                invalid: false,
                resetAt: null
            });
        });
        
        if (tokens.length > 0) {
            logInfo(`Loaded ${tokens.length} token(s) from QWEN_TOKENS environment variable`);
        }
    }
    
    return envTokens;
}

/**
 * Load tokens from session/tokens.json file
 */
function loadTokensFromFile() {
    ensureSessionDir();
    if (!fs.existsSync(TOKENS_FILE)) return [];
    try {
        const fileTokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
        if (fileTokens.length > 0) {
            logInfo(`Loaded ${fileTokens.length} token(s) from session/tokens.json`);
        }
        return fileTokens;
    } catch (e) {
        logError('TokenManager: error reading tokens.json', e);
        return [];
    }
}

/**
 * Load all tokens (from both env and file)
 * Environment tokens take priority
 */
export function loadTokens() {
    const envTokens = loadTokensFromEnv();
    const fileTokens = loadTokensFromFile();
    
    // Combine tokens, env tokens first (higher priority)
    return [...envTokens, ...fileTokens];
}

export function saveTokens(tokens) {
    ensureSessionDir();
    // Only save tokens that are not from environment variables
    const fileTokens = tokens.filter(t => t.source !== 'env');
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(fileTokens, null, 2), 'utf8');
    } catch (e) {
        logError('TokenManager: error saving tokens.json', e);
    }
}

export async function getAvailableToken() {
    const tokens = loadTokens();
    const now = Date.now();
    const valid = tokens.filter(t => (!t.resetAt || new Date(t.resetAt).getTime() <= now) && !t.invalid);
    if (!valid.length) return null;
    const token = valid[pointer % valid.length];
    pointer = (pointer + 1) % valid.length;
    return token;
}

export function hasValidTokens() {
    const tokens = loadTokens();
    const now = Date.now();
    return tokens.some(t => (!t.resetAt || new Date(t.resetAt).getTime() <= now) && !t.invalid);
}

export function markRateLimited(id, hours = 24) {
    const tokens = loadTokens();
    const idx = tokens.findIndex(t => t.id === id);
    if (idx !== -1) {
        tokens[idx].resetAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
        saveTokens(tokens);
    }
}

export function removeToken(id) {
    saveTokens(loadTokens().filter(t => t.id !== id));
}

export { removeToken as removeInvalidToken };

export function markInvalid(id) {
    const tokens = loadTokens();
    const idx = tokens.findIndex(t => t.id === id);
    if (idx !== -1) { tokens[idx].invalid = true; saveTokens(tokens); }
}

export function markValid(id, newToken) {
    const tokens = loadTokens();
    const idx = tokens.findIndex(t => t.id === id);
    if (idx !== -1) {
        tokens[idx].invalid = false;
        tokens[idx].resetAt = null;
        if (newToken) tokens[idx].token = newToken;
        saveTokens(tokens);
    }
}

export function listTokens() {
    return loadTokens();
}
