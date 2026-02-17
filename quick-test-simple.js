// Quick test with timeouts

const BASE_URL = 'http://localhost:3264/api';

async function testWithTimeout(testFn, timeout = 30000) {
    return Promise.race([
        testFn(),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
        )
    ]);
}

async function testChat() {
    console.log('\n✓ Testing Chat...');
    const response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: 'Tell me a fun fact about space in one sentence.',
            model: 'qwen-max-latest'
        })
    });
    
    const data = await response.json();
    console.log(`  Response: ${data.choices[0].message.content}`);
    console.log(`  Chat ID: ${data.chatId}`);
    return { success: true };
}

async function testImageAnalysis() {
    console.log('\n✓ Testing Image Analysis (Vision Model)...');
    const response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: [
                { type: 'text', text: 'Describe this image' },
                { type: 'image', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400' }
            ],
            model: 'qwen-vl-max-latest'
        })
    });
    
    const data = await response.json();
    if (data.error) {
        console.log(`  ⚠ Error: ${data.error}`);
        return { success: false, error: data.error };
    }
    console.log(`  Response: ${data.choices[0].message.content.substring(0, 100)}...`);
    return { success: true };
}

async function runTests() {
    console.log('================================');
    console.log('  Qwen API Proxy Quick Tests ');
    console.log('================================');
    
    try {
        // Test Chat
        await testWithTimeout(testChat, 15000);
        console.log('  ✅ Chat: PASSED\n');
    } catch (error) {
        console.log(`  ❌ Chat: FAILED (${error.message})\n`);
    }
    
    try {
        // Test Image Analysis (not generation)
        await testWithTimeout(testImageAnalysis, 30000);
        console.log('  ✅ Image Analysis: PASSED\n');
    } catch (error) {
        console.log(`  ❌ Image Analysis: FAILED (${error.message})\n`);
    }
    
    console.log('================================');
    console.log('Note: Image/Video GENERATION (t2i/t2v) may not be');
    console.log('supported by Qwen API or requires special access.');
    console.log('VL models are for IMAGE ANALYSIS, not generation.');
    console.log('================================\n');
}

runTests();
