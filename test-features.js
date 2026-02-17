// Simple test script for chat, image, and video generation

const BASE_URL = 'http://localhost:3264/api';

async function testChat() {
    console.log('\n=== Testing Chat ===');
    try {
        const response = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'What is the capital of France?',
                model: 'qwen-max-latest'
            })
        });
        
        const data = await response.json();
        console.log('✅ Chat test successful');
        console.log('Response:', data.choices[0].message.content);
        console.log('Chat ID:', data.chatId);
        console.log('Parent ID:', data.parentId);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Chat test failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function testImageGeneration() {
    console.log('\n=== Testing Image Generation ===');
    try {
        const response = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'A beautiful sunset over a calm ocean with orange and pink clouds',
                model: 'qwen-vl-max-latest',
                chatType: 't2i',
                size: '16:9'
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            console.error('❌ Image generation failed:', data.error);
            return { success: false, error: data.error };
        }
        
        console.log('✅ Image generation test response received');
        console.log('Response:', JSON.stringify(data, null, 2));
        
        // Check if there's a task ID or image URL
        if (data.choices && data.choices[0]) {
            console.log('Message:', data.choices[0].message.content);
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('❌ Image generation test failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function testVideoGeneration() {
    console.log('\n=== Testing Video Generation ===');
    try {
        const response = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'A serene forest with sunlight filtering through the trees',
                model: 'qwen-vl-max-latest',
                chatType: 't2v',
                size: '16:9'
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            console.error('❌ Video generation failed:', data.error);
            return { success: false, error: data.error };
        }
        
        console.log('✅ Video generation test response received');
        console.log('Response:', JSON.stringify(data, null, 2));
        
        // Check if there's a task ID or video URL
        if (data.choices && data.choices[0]) {
            console.log('Message:', data.choices[0].message.content);
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('❌ Video generation test failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Run all tests
async function runAllTests() {
    console.log('================================');
    console.log('  Qwen API Proxy Feature Tests');
    console.log('================================');
    
    const results = {
        chat: await testChat(),
        image: await testImageGeneration(),
        video: await testVideoGeneration()
    };
    
    console.log('\n================================');
    console.log('  Test Summary');
    console.log('================================');
    console.log('Chat:', results.chat.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Image Generation:', results.image.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Video Generation:', results.video.success ? '✅ PASSED' : '❌ FAILED');
    console.log('================================\n');
    
    process.exit(results.chat.success && results.image.success && results.video.success ? 0 : 1);
}

runAllTests();
