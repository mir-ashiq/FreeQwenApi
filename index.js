// Load environment variables first
import 'dotenv/config';

import express from 'express';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './src/swagger.js';
import apiRoutes from './src/api/routes.js';
import { getAvailableModelsFromFile, getApiKeys } from './src/api/chat.js';
import { loadTokens, hasValidTokens } from './src/api/tokenManager.js';
import { logHttpRequest, logInfo, logError, logWarn } from './src/logger/index.js';
import { PORT, HOST } from './src/config.js';

const app = express();

const port = Number.parseInt(process.env.PORT ?? PORT, 10);
const host = process.env.HOST || HOST;

if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

// Middleware
app.use(logHttpRequest);
app.use(bodyParser.json({ limit: '150mb' }));
app.use(bodyParser.urlencoded({ limit: '150mb', extended: true }));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Qwen API Proxy Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
}));

// Routes
app.use('/api', apiRoutes);

// 404 Handler
app.use((req, res) => {
    logWarn(`404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler
app.use((err, req, res, next) => {
    logError('Internal server error', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Shutdown handlers
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
process.on('SIGHUP', handleShutdown);
process.on('uncaughtException', async (error) => {
    logError('Uncaught exception', error);
    await handleShutdown();
});

async function handleShutdown() {
    logInfo('\nShutdown signal received. Closing server...');
    process.exit(0);
}

async function startServer() {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║                      QWEN API PROXY SERVER                            ║
║                      (No Browser Automation)                          ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

    logInfo('Starting server...');

    // Check for valid tokens
    const tokens = loadTokens();
    if (tokens.length === 0) {
        console.error(`
❌ NO AUTHENTICATION TOKENS FOUND!

You need to add at least one token to use the proxy.

📝 How to add a token:
   1. Run: npm run addToken
   2. Follow the instructions to get your token from https://chat.qwen.ai
   3. Restart the server

`);
        process.exit(1);
    }

    if (!hasValidTokens()) {
        console.warn(`
⚠️  WARNING: No valid tokens available!

You have ${tokens.length} token(s), but all are either:
- Marked as invalid
- Rate limited (waiting for reset)

Please add a valid token with: npm run addToken

`);
        process.exit(1);
    }

    const validTokens = tokens.filter(t => !t.invalid && (!t.resetAt || new Date(t.resetAt).getTime() <= Date.now()));
    logInfo(`Found ${tokens.length} token(s), ${validTokens.length} active`);

    validTokens.forEach(t => {
        logInfo(`  - ${t.name || t.id} (${t.id})`);
    });

    try {
        app.listen(port, host, () => {
            const displayHost = host === '0.0.0.0' ? 'localhost' : host;
            console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║  ✅ Server running on ${host}:${port.toString().padEnd(42)} ║
║                                                                       ║
║  📍 API Base URL: http://${displayHost}:${port}/api${' '.repeat(32 - displayHost.length - port.toString().length)} ║
║  📚 API Documentation: http://${displayHost}:${port}/api-docs${' '.repeat(27 - displayHost.length - port.toString().length)} ║
║                                                                       ║
║  ENDPOINTS:                                                           ║
║  ├─ POST   /api/chat                - Send chat message               ║
║  ├─ POST   /api/chat/completions    - OpenAI compatible              ║
║  ├─ POST   /api/chats               - Create new chat                ║
║  ├─ GET    /api/models              - List available models          ║
║  ├─ GET    /api/status              - Check token status             ║
║  └─ POST   /api/files/upload        - Upload files                   ║
║                                                                       ║
║  CHAT TYPES:                                                          ║
║  ├─ t2t (default) - Text to text chat                                ║
║  ├─ t2i           - Text to image generation                         ║
║  └─ t2v           - Text to video generation                         ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

            getApiKeys();
            getAvailableModelsFromFile();
        });
    } catch (err) {
        if (err.code === 'EADDRINUSE') {
            logError(`Port ${port} is already in use. Is the server already running?`);
            process.exit(1);
        }
        throw err;
    }
}

startServer().catch(async error => {
    logError('Error starting server', error);
    process.exit(1);
});
