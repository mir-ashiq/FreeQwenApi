import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Qwen API Proxy',
            version: '1.0.0',
            description: `OpenAI-compatible proxy for Qwen AI models with support for text, image, and video generation.

## Features

- **💬 Text Chat (t2t)**: Regular conversational AI with context management
- **🖼️ Image Generation (t2i)**: Create images from text descriptions  
- **🎬 Video Generation (t2v)**: Generate videos from prompts

## Quick Start

All three features use the same \`/api/chat\` endpoint with different \`chatType\` values:

\`\`\`json
// Text chat
{"message": "Hello!", "chatType": "t2t"}

// Image generation
{"message": "A cat on the moon", "chatType": "t2i", "size": "1024x1024"}

// Video generation  
{"message": "Flying through clouds", "chatType": "t2v", "size": "1280x720"}
\`\`\``,
            contact: {
                name: 'API Support',
            },
        },
        servers: [
            {
                url: 'http://localhost:3264',
                description: 'Local development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'API Key',
                    description: 'Optional API key for proxy authentication (if configured in Authorization.txt)',
                },
            },
            schemas: {
                ChatRequest: {
                    type: 'object',
                    required: ['message'],
                    properties: {
                        message: {
                            type: 'string',
                            description: 'The user message or prompt (for image/video: describe what you want to generate)',
                            example: 'Hello! How are you?',
                        },
                        model: {
                            type: 'string',
                            description: 'Model to use for the request',
                            default: 'qwen-max-latest',
                            example: 'qwen-max-latest',
                        },
                        chatId: {
                            type: 'string',
                            description: 'Chat ID for continuing a conversation (optional)',
                            example: 'abc6ba8e-29e9-4663-ad0b-ec6b60a7193c',
                        },
                        parentId: {
                            type: 'string',
                            description: 'Parent message ID for conversation continuity (optional)',
                            example: 'c4be56bb-12b8-4e20-8712-f490dbf6314d',
                        },
                        chatType: {
                            type: 'string',
                            enum: ['t2t', 't2i', 't2v'],
                            default: 't2t',
                            description: '**Chat type determines the feature:**\n\n- `t2t` (default): Text-to-text chat (regular conversation)\n- `t2i`: Text-to-image generation (creates images)\n- `t2v`: Text-to-video generation (creates videos)',
                            example: 't2t',
                        },
                        size: {
                            type: 'string',
                            description: 'Output size for image/video generation. Common sizes: "1024x1024", "1280x720", "1920x1080" (only used with t2i/t2v)',
                            example: '1024x1024',
                        },
                        waitForCompletion: {
                            type: 'boolean',
                            default: true,
                            description: 'For video generation (t2v): if true, waits for the video to be generated and returns the URL. If false, returns task_id immediately for polling.',
                        },
                    },
                    example: {
                        message: 'A beautiful sunset over mountains',
                        chatType: 't2i',
                        size: '1024x1024',
                        model: 'qwen-max-latest',
                    },
                },
                ChatResponse: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Response ID',
                        },
                        object: {
                            type: 'string',
                            example: 'chat.completion',
                        },
                        created: {
                            type: 'integer',
                            description: 'Unix timestamp',
                        },
                        model: {
                            type: 'string',
                            description: 'Model used',
                        },
                        choices: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    index: {
                                        type: 'integer',
                                    },
                                    message: {
                                        type: 'object',
                                        properties: {
                                            role: {
                                                type: 'string',
                                                example: 'assistant',
                                            },
                                            content: {
                                                type: 'string',
                                                description: 'Response content (text, image URL, or video URL)',
                                            },
                                        },
                                    },
                                    finish_reason: {
                                        type: 'string',
                                        example: 'stop',
                                    },
                                },
                            },
                        },
                        usage: {
                            type: 'object',
                            properties: {
                                input_tokens: {
                                    type: 'integer',
                                },
                                output_tokens: {
                                    type: 'integer',
                                },
                                total_tokens: {
                                    type: 'integer',
                                },
                            },
                        },
                        response_id: {
                            type: 'string',
                        },
                        chatId: {
                            type: 'string',
                            description: 'Chat ID for continuing conversation',
                        },
                        parentId: {
                            type: 'string',
                            description: 'Use this as parentId in next request',
                        },
                    },
                },
                OpenAIChatRequest: {
                    type: 'object',
                    required: ['messages'],
                    properties: {
                        model: {
                            type: 'string',
                            default: 'qwen-max-latest',
                            description: 'Model identifier',
                        },
                        messages: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    role: {
                                        type: 'string',
                                        enum: ['system', 'user', 'assistant'],
                                    },
                                    content: {
                                        type: 'string',
                                    },
                                },
                            },
                            example: [
                                { role: 'system', content: 'You are a helpful assistant.' },
                                { role: 'user', content: 'Hello!' },
                            ],
                        },
                        stream: {
                            type: 'boolean',
                            default: false,
                        },
                        temperature: {
                            type: 'number',
                            minimum: 0,
                            maximum: 2,
                            default: 1,
                        },
                    },
                },
                CreateChatRequest: {
                    type: 'object',
                    properties: {
                        model: {
                            type: 'string',
                            default: 'qwen-max-latest',
                        },
                    },
                },
                CreateChatResponse: {
                    type: 'object',
                    properties: {
                        chatId: {
                            type: 'string',
                        },
                        parentId: {
                            type: 'string',
                        },
                    },
                },
                ModelsResponse: {
                    type: 'object',
                    properties: {
                        object: {
                            type: 'string',
                            example: 'list',
                        },
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: {
                                        type: 'string',
                                    },
                                    object: {
                                        type: 'string',
                                        example: 'model',
                                    },
                                    created: {
                                        type: 'integer',
                                    },
                                    owned_by: {
                                        type: 'string',
                                    },
                                },
                            },
                        },
                    },
                },
                StatusResponse: {
                    type: 'object',
                    properties: {
                        tokens: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: {
                                        type: 'string',
                                    },
                                    name: {
                                        type: 'string',
                                    },
                                    invalid: {
                                        type: 'boolean',
                                    },
                                    resetAt: {
                                        type: 'string',
                                        nullable: true,
                                    },
                                    source: {
                                        type: 'string',
                                        enum: ['env', 'file'],
                                    },
                                },
                            },
                        },
                        activeTokens: {
                            type: 'integer',
                        },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                        },
                    },
                },
            },
        },
        security: [],
    },
    apis: ['./src/api/routes.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
