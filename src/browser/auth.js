// auth.js - Модуль для авторизации и проверки авторизации
import { saveSession } from './session.js';
import { setAuthenticationStatus, getAuthenticationStatus, restartBrowserInHeadlessMode } from './browser.js';
import { extractAuthToken } from '../api/chat.js';

const AUTH_URL = 'https://chat.qwen.ai/';
const AUTH_SIGNIN_URL = 'https://chat.qwen.ai/auth?action=signin';

const VERIFICATION_TIMEOUT = 300000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getPage(context) {
    if (context && typeof context.goto === 'function') {
        return context;
    } else if (context && typeof context.newPage === 'function') {
        return await context.newPage();
    } else {
        throw new Error('Неверный контекст: не страница Puppeteer, не контекст Playwright');
    }
}

function isPlaywright(context) {
    return context && typeof context.newPage === 'function';
}

async function promptUser(question) {
    return new Promise(resolve => {
        process.stdout.write(question);

        const onData = (data) => {
            const input = data.toString().trim();
            process.stdin.removeListener('data', onData);
            process.stdin.pause();
            resolve(input);
        };

        process.stdin.resume();
        process.stdin.once('data', onData);
    });
}

export async function checkAuthentication(context) {
    try {
        if (getAuthenticationStatus()) {
            return true;
        }

        const page = await getPage(context);
        const isPW = isPlaywright(context);

        console.log('Проверка авторизации...');
        
        try {
            await page.goto(AUTH_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
            
            if (isPW) {
                await page.waitForLoadState('domcontentloaded');
            }
            
            await delay(2000);

            const pageTitle = await page.title();
            const hasVerification = pageTitle.includes('Verification');

            if (hasVerification) {
                console.log('Обнаружена страница верификации. Пожалуйста, пройдите верификацию вручную.');
                await promptUser('После прохождения верификации нажмите ENTER для продолжения...');
                console.log('Верификация подтверждена пользователем.');
            }

            let loginContainerCount = 0;
            if (isPW) {
                loginContainerCount = await page.locator('.login-container').count();
            } else {
                const loginElements = await page.$$('.login-container');
                loginContainerCount = loginElements.length;
            }

            if (loginContainerCount === 0) {
                console.log('======================================================');
                console.log('               АВТОРИЗАЦИЯ ОБНАРУЖЕНА                 ');
                console.log('======================================================');

                setAuthenticationStatus(true);
                
                try {
                    await extractAuthToken(context, true);
                    await saveSession(context);
                    console.log('Сессия обновлена');
                } catch (e) {
                    console.error('Не удалось обновить сессию:', e);
                }

                if (isPW) {
                    await page.close();
                }

                return true;
            } else {
                console.log('------------------------------------------------------');
                console.log('               НЕОБХОДИМА АВТОРИЗАЦИЯ                 ');
                console.log('------------------------------------------------------');
                console.log('Пожалуйста, выполните следующие действия:');
                console.log('1. Войдите в систему через GitHub или другой способ в открытом браузере');
                console.log('2. Дождитесь завершения процесса авторизации');
                console.log('3. Нажмите ENTER в этой консоли');
                console.log('------------------------------------------------------');

                await promptUser('После успешной авторизации нажмите ENTER для продолжения...');
                console.log('Пользователь подтвердил завершение авторизации.');

                await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
                await delay(3000);

                let loginElements = 0;
                if (isPW) {
                    loginElements = await page.locator('.login-container').count();
                } else {
                    const elements = await page.$$('.login-container');
                    loginElements = elements.length;
                }

                if (loginElements === 0) {
                    console.log('Авторизация подтверждена.');
                    setAuthenticationStatus(true);

                    await saveSession(context);
                    await extractAuthToken(context, true);

                    if (isPW) {
                        await page.close();
                    }
                    
                    return true;
                } else {
                    console.log('Предупреждение: Авторизация не обнаружена.');
                    setAuthenticationStatus(false);
                    return false;
                }
            }
        } catch (error) {
            if (isPW) {
                await page.close().catch(() => {});
            }
            throw error;
        }
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        setAuthenticationStatus(false);
        return false;
    }
}

export async function startManualAuthentication(context, skipRestart = false) {
    try {
        const page = await getPage(context);
        const isPW = isPlaywright(context);

        console.log('Открытие страницы для ручной авторизации...');
        
        try {
            await page.goto(AUTH_SIGNIN_URL, { waitUntil: 'load', timeout: 120000 });

            console.log('------------------------------------------------------');
            console.log('               НЕОБХОДИМА АВТОРИЗАЦИЯ                 ');
            console.log('------------------------------------------------------');
            console.log('Пожалуйста, выполните следующие действия:');
            console.log('1. Войдите в систему в открытом браузере');
            console.log('2. Дождитесь завершения процесса авторизации');
            console.log('3. Нажмите ENTER в этой консоли');
            console.log('------------------------------------------------------');

            await promptUser('После успешной авторизации нажмите ENTER для продолжения...');
            
            await page.goto(AUTH_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
            await delay(2000);

            let loginElements = 0;
            if (isPW) {
                loginElements = await page.locator('.login-container').count();
            } else {
                const elements = await page.$$('.login-container');
                loginElements = elements.length;
            }

            if (loginElements === 0) {
                console.log('Авторизация подтверждена.');
                setAuthenticationStatus(true);

                await saveSession(context);
                await extractAuthToken(context, true);

                console.log('Сессия сохранена успешно!');

                if (isPW) {
                    await page.close();
                }
                
                if (!skipRestart) {
                    await restartBrowserInHeadlessMode();
                }
                return true;
            } else {
                console.log('Авторизация не удалась.');
                setAuthenticationStatus(false);
                return false;
            }
        } catch (error) {
            if (isPW) {
                await page.close().catch(() => {});
            }
            throw error;
        }
    } catch (error) {
        console.error('Ошибка при ручной авторизации:', error);
        setAuthenticationStatus(false);
        return false;
    }
}

export async function checkVerification(page) {
    try {
        const pageTitle = await page.title();
        if (pageTitle.includes('Verification')) {
            console.log('Обнаружена страница верификации');
            await promptUser('Пройдите верификацию и нажмите ENTER...');
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}
