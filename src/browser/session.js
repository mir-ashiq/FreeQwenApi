import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_DIR = path.join(__dirname, '..', '..', 'session');
const TOKEN_FILE = path.join(SESSION_DIR, 'auth_token.txt');

export function initSessionDirectory() {
    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
        console.log(`Создана директория для сессий: ${SESSION_DIR}`);
    }
}

export async function saveSession(context, accountId = null) {
    try {
        initSessionDirectory();

        const isPuppeteer = context && typeof context.goto === 'function';
        const isPlaywright = context && typeof context.storageState === 'function';

        if (isPuppeteer) {
            const cookies = await context.cookies();
            
            const sessionPath = accountId 
                ? path.join(SESSION_DIR, 'accounts', accountId, 'cookies.json')
                : path.join(SESSION_DIR, 'cookies.json');
            
            const sessionDir = path.dirname(sessionPath);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }
            
            fs.writeFileSync(sessionPath, JSON.stringify(cookies, null, 2));
            
            console.log('Сессия Puppeteer сохранена');
            return true;
            
        } else if (isPlaywright && context.browser()) {
            const sessionPath = accountId 
                ? path.join(SESSION_DIR, 'accounts', accountId, 'state.json')
                : path.join(SESSION_DIR, 'state.json');
            
            const sessionDir = path.dirname(sessionPath);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }
            
            await context.storageState({ path: sessionPath });
            console.log('Сессия Playwright сохранена');
            return true;
        } else {
            console.error('Неизвестный тип контекста браузера');
            return false;
        }
    } catch (error) {
        console.error('Ошибка при сохранении сессии:', error);
        return false;
    }
}

export async function loadSession(context, accountId = null) {
    try {
        const isPuppeteer = context && typeof context.goto === 'function';
        const isPlaywright = context && typeof context.storageState === 'function';

        if (isPuppeteer) {
            const sessionPath = accountId 
                ? path.join(SESSION_DIR, 'accounts', accountId, 'cookies.json')
                : path.join(SESSION_DIR, 'cookies.json');
            
            if (fs.existsSync(sessionPath)) {
                const cookies = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
                await context.setCookie(...cookies);
                console.log('Сессия Puppeteer загружена');
                return true;
            }
        } else if (isPlaywright) {
            const sessionPath = accountId 
                ? path.join(SESSION_DIR, 'accounts', accountId, 'state.json')
                : path.join(SESSION_DIR, 'state.json');
            
            if (fs.existsSync(sessionPath)) {
                await context.storageState({ path: sessionPath });
                console.log('Сессия Playwright загружена');
                return true;
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке сессии:', error);
    }
    return false;
}

export function clearSession(accountId = null) {
    try {
        const sessionPaths = [
            accountId 
                ? path.join(SESSION_DIR, 'accounts', accountId, 'state.json')
                : path.join(SESSION_DIR, 'state.json'),
            accountId 
                ? path.join(SESSION_DIR, 'accounts', accountId, 'cookies.json')
                : path.join(SESSION_DIR, 'cookies.json')
        ];

        let cleared = false;
        for (const sessionPath of sessionPaths) {
            if (fs.existsSync(sessionPath)) {
                fs.unlinkSync(sessionPath);
                cleared = true;
            }
        }

        if (cleared) {
            console.log('Сессия очищена');
            return true;
        }
    } catch (error) {
        console.error('Ошибка при очистке сессии:', error);
    }
    return false;
}

export function hasSession(accountId = null) {
    const sessionPaths = [
        accountId 
            ? path.join(SESSION_DIR, 'accounts', accountId, 'state.json')
            : path.join(SESSION_DIR, 'state.json'),
        accountId 
            ? path.join(SESSION_DIR, 'accounts', accountId, 'cookies.json')
            : path.join(SESSION_DIR, 'cookies.json')
    ];

    return sessionPaths.some(path => fs.existsSync(path));
}

export function saveAuthToken(token) {
    try {
        initSessionDirectory();

        if (token) {
            fs.writeFileSync(TOKEN_FILE, token, 'utf8');
            console.log('Токен авторизации сохранен');
            return true;
        }
    } catch (error) {
        console.error('Ошибка при сохранении токена авторизации:', error);
    }
    return false;
}

export function loadAuthToken() {
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            const token = fs.readFileSync(TOKEN_FILE, 'utf8');
            console.log('Токен авторизации загружен');
            return token;
        }
    } catch (error) {
        console.error('Ошибка при загрузке токена авторизации:', error);
    }
    return null;
}
