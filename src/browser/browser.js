import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { saveSession, loadSession, saveAuthToken } from './session.js';
import { checkAuthentication, startManualAuthentication } from './auth.js';
import { clearPagePool, getAuthToken } from '../api/chat.js';
import fs from 'fs';
import path from 'path';

puppeteer.use(StealthPlugin());

let browserInstance = null;
let browserContext = null;

export let isAuthenticated = false;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function initBrowser(visibleMode = true, skipManualRestart = false) {
    if (!browserInstance) {
        console.log('Инициализация браузера с Puppeteer Stealth...');
        try {
            browserInstance = await puppeteer.launch({
                headless: !visibleMode,
                slowMo: visibleMode ? 30 : 0,
                executablePath: process.env.CHROME_PATH || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--window-size=1920,1080',
                    '--start-maximized',
                    '--disable-infobars',
                    '--disable-extensions',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list'
                ],
                defaultViewport: {
                    width: 1920,
                    height: 1080
                },
                ignoreHTTPSErrors: true
            });

            const pages = await browserInstance.pages();
            const page = pages.length > 0 ? pages[0] : await browserInstance.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

            await page.setViewport({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1
            });

            await page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            });

            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'platform', {
                    get: () => 'Win32'
                });

                Object.defineProperty(navigator, 'hardwareConcurrency', {
                    get: () => 8
                });

                Object.defineProperty(navigator, 'deviceMemory', {
                    get: () => 8
                });

                Object.defineProperty(navigator, 'plugins', {
                    get: () => [
                        {
                            0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' },
                            description: 'Portable Document Format',
                            filename: 'internal-pdf-viewer',
                            length: 1,
                            name: 'Chrome PDF Plugin'
                        }
                    ]
                });

                Object.defineProperty(navigator, 'connection', {
                    get: () => ({
                        effectiveType: '4g',
                        rtt: 50,
                        downlink: 10,
                        saveData: false
                    })
                });

                if (!navigator.getBattery) {
                    navigator.getBattery = () => Promise.resolve({
                        charging: true,
                        chargingTime: 0,
                        dischargingTime: Infinity,
                        level: 1
                    });
                }

                const originalAddEventListener = EventTarget.prototype.addEventListener;
                EventTarget.prototype.addEventListener = function(type, listener, options) {
                    if (type === 'mousemove' || type === 'mousedown' || type === 'mouseup') {
                        const wrappedListener = function(event) {
                            const delay = Math.random() * 3;
                            setTimeout(() => {
                                listener.call(this, event);
                            }, delay);
                        };
                        return originalAddEventListener.call(this, type, wrappedListener, options);
                    }
                    return originalAddEventListener.call(this, type, listener, options);
                };

                const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
                HTMLCanvasElement.prototype.toDataURL = function(type) {
                    const context = this.getContext('2d');
                    if (context) {
                        const imageData = context.getImageData(0, 0, this.width, this.height);
                        const data = imageData.data;
                        for (let i = 0; i < data.length; i += 4) {
                            const noise = Math.floor(Math.random() * 5) - 2;
                            data[i] = Math.max(0, Math.min(255, data[i] + noise));
                            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
                        }
                        context.putImageData(imageData, 0, 0);
                    }
                    return originalToDataURL.apply(this, arguments);
                };

                console.log('Puppeteer Stealth активирован');
            });

            browserContext = page;

            console.log('Браузер инициализирован с максимальной защитой от обнаружения');

            if (visibleMode) {
                await startManualAuthenticationPuppeteer(page, skipManualRestart);
            } else {
                const sessionLoaded = await loadSessionPuppeteer(page);
                if (sessionLoaded) {
                    setAuthenticationStatus(true);
                    console.log('Сессия успешно загружена');
                }
            }

            return true;
        } catch (error) {
            console.error('Ошибка при инициализации браузера:', error);
            return false;
        }
    }
    return true;
}

async function saveSessionPuppeteer(page) {
    try {
        const cookies = await page.cookies();
        
        const sessionDir = path.join(process.cwd(), 'session', 'accounts');
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        
        const accountId = `acc_${Date.now()}`;
        const accountDir = path.join(sessionDir, accountId);
        
        if (!fs.existsSync(accountDir)) {
            fs.mkdirSync(accountDir, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(accountDir, 'cookies.json'),
            JSON.stringify(cookies, null, 2)
        );
        
        console.log(`Cookies сохранены для аккаунта ${accountId}`);
        return accountId;
        
    } catch (error) {
        console.error('Ошибка при сохранении сессии:', error);
        return null;
    }
}

async function startManualAuthenticationPuppeteer(page, skipManualRestart) {
    try {
        console.log('Открытие страницы для ручной авторизации...');
        
        await page.goto('https://chat.qwen.ai/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await delay(5000);

        console.log('------------------------------------------------------');
        console.log('               НЕОБХОДИМА АВТОРИЗАЦИЯ');
        console.log('------------------------------------------------------');
        console.log('Пожалуйста, выполните следующие действия:');
        console.log('1. Войдите в систему в открытом браузере');
        console.log('2. ВАЖНО: Двигайте мышью естественно, не спешите');
        console.log('3. Если появится слайдер капчи - решите её медленно');
        console.log('4. Дождитесь полной загрузки главной страницы');
        console.log('5. После успешной авторизации нажмите ENTER в консоли');
        console.log('------------------------------------------------------');
        console.log('После успешной авторизации нажмите ENTER для продолжения...');

        await new Promise((resolve) => {
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(false);
            }
            process.stdin.resume();
            process.stdin.setEncoding('utf8');

            const onData = (key) => {
                if (key === '\n' || key === '\r' || key.charCodeAt(0) === 13) {
                    process.stdin.pause();
                    process.stdin.removeListener('data', onData);
                    console.log('\nПолучено подтверждение, продолжаем...');
                    resolve();
                }
            };

            process.stdin.on('data', onData);
        });

        const cookies = await page.cookies();
        console.log(`Сохранено ${cookies.length} cookies`);

        const token = await page.evaluate(() => {
            return localStorage.getItem('token') || 
                   localStorage.getItem('auth_token') ||
                   localStorage.getItem('access_token') ||
                   sessionStorage.getItem('token') ||
                   sessionStorage.getItem('auth_token') ||
                   null;
        });

        if (token) {
            console.log('Токен найден и будет сохранен');
            saveAuthToken(token);
        } else {
            console.log('Токен не найден в localStorage/sessionStorage');
            console.log('Попытка извлечь токен из cookies...');
            
            const tokenCookie = cookies.find(c => 
                c.name.toLowerCase().includes('token') || 
                c.name.toLowerCase().includes('auth')
            );
            
            if (tokenCookie) {
                console.log(`Токен найден в cookie: ${tokenCookie.name}`);
                saveAuthToken(tokenCookie.value);
            }
        }

        const accountId = await saveSessionPuppeteer(page);
        if (accountId) {
            console.log(`Сессия сохранена с ID: ${accountId}`);
        }

        setAuthenticationStatus(true);
        console.log('Авторизация завершена успешно');

        if (!skipManualRestart) {
            await restartBrowserInHeadlessMode();
        }

    } catch (error) {
        console.error('Ошибка при ручной авторизации:', error);
        throw error;
    }
}

async function loadSessionPuppeteer(page) {
    try {
        return false;
    } catch (error) {
        console.error('Ошибка при загрузке сессии:', error);
        return false;
    }
}

export async function restartBrowserInHeadlessMode() {
    console.log('Перезапуск браузера в фоновом режиме...');

    const token = getAuthToken();
    if (token) {
        console.log('Сохранение токена...');
        saveAuthToken(token);
        await delay(1000);
    }

    await shutdownBrowser();
    await delay(2000);

    const success = await initBrowser(false);
    
    if (success) {
        console.log('Браузер перезапущен в фоновом режиме');
    } else {
        console.error('Ошибка при перезапуске браузера');
    }
}

export async function shutdownBrowser() {
    try {
        // Сначала очищаем пул страниц
        try {
            await clearPagePool();
        } catch (e) {
            console.error('Ошибка при очистке пула страниц:', e);
        }
        
        // Закрываем контекст браузера
        if (browserInstance) {
            try {
                const pages = await browserInstance.pages();
                for (const page of pages) {
                    await page.close().catch(() => {});
                }
                await browserInstance.close();
            } catch (e) {
                // Игнорируем ошибку, если контекст уже закрыт
                console.error('Ошибка при закрытии браузера:', e);
            }
        }

        // Сбрасываем переменные
        browserContext = null;
        browserInstance = null;

        console.log('Браузер закрыт');
    } catch (error) {
        console.error('Ошибка при завершении работы браузера:', error);
    }
}

export function getBrowserContext() {
    return browserContext;
}

// Установить статус авторизации
export function setAuthenticationStatus(status) {
    isAuthenticated = status;
}

// Получить статус авторизации
export function getAuthenticationStatus() {
    return isAuthenticated;
}
