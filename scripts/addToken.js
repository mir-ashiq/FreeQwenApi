#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.resolve(__dirname, '..', 'session');
const TOKENS_FILE = path.join(SESSION_DIR, 'tokens.json');

function ensureSessionDir() {
    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
}

function loadTokens() {
    ensureSessionDir();
    if (!fs.existsSync(TOKENS_FILE)) {
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    } catch (e) {
        console.error('❌ Error reading tokens file:', e.message);
        return [];
    }
}

function saveTokens(tokens) {
    ensureSessionDir();
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf8');
        console.log('✅ Tokens saved successfully!');
    } catch (e) {
        console.error('❌ Error saving tokens:', e.message);
    }
}

async function promptUser(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function addToken() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              Qwen API - Add Authentication Token             ║
╚══════════════════════════════════════════════════════════════╝

📝 Instructions:
1. Open https://chat.qwen.ai in your browser
2. Login with your account
3. Open Developer Tools (F12)
4. Go to Application → Local Storage → https://chat.qwen.ai
5. Find the 'token' key and copy its value
6. Paste it below

`);

    const token = await promptUser('🔑 Enter your Qwen token: ');

    if (!token || token.length < 10) {
        console.error('❌ Invalid token! Token must be at least 10 characters long.');
        process.exit(1);
    }

    const accountName = await promptUser('📛 Enter account name (optional, press Enter to skip): ');

    const tokens = loadTokens();
    const newToken = {
        id: `acc_${Date.now()}`,
        token: token,
        name: accountName || `Account ${tokens.length + 1}`,
        addedAt: new Date().toISOString(),
        invalid: false,
        resetAt: null
    };

    tokens.push(newToken);
    saveTokens(tokens);

    console.log(`
✅ Token added successfully!
   ID: ${newToken.id}
   Name: ${newToken.name}
   Total accounts: ${tokens.length}

You can now start the server with: npm start
`);
}

addToken().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
