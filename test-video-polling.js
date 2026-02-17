// Test video generation with client-side polling

const BASE_URL = 'http://localhost:3264/api';

// Test 1: Server-side polling (default, waitForCompletion=true)
async function testServerSidePolling() {
    console.log('\n=== Test 1: Server-Side Polling (Default) ===');
    console.log('Server will wait for video completion before returning...');
    
    const startTime = Date.now();
    
    try {
        const response = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'A peaceful mountain landscape with flowing rivers',
                model: 'qwen-vl-max-latest',
                chatType: 't2v',
                size: '16:9',
                waitForCompletion: true  // Explicit, but this is the default
            })
        });
        
        const data = await response.json();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        if (data.error) {
            console.log(`❌ Failed after ${duration}s: ${data.error}`);
            if (data.task_id) {
                console.log(`   Task ID: ${data.task_id}`);
            }
            return { success: false, duration, data };
        }
        
        console.log(`✅ Success after ${duration}s`);
        console.log(`   Video URL: ${data.video_url || data.choices[0].message.content}`);
        console.log(`   Task ID: ${data.task_id}`);
        return { success: true, duration, data };
    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`❌ Error after ${duration}s: ${error.message}`);
        return { success: false, duration, error: error.message };
    }
}

// Test 2: Client-side polling (waitForCompletion=false)
async function testClientSidePolling() {
    console.log('\n=== Test 2: Client-Side Polling (waitForCompletion=false) ===');
    console.log('Server will return task_id immediately...');
    
    const startTime = Date.now();
    
    try {
        // Step 1: Request video generation without waiting
        console.log('Step 1: Creating video generation task...');
        const response = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'A serene forest with sunlight filtering through trees',
                model: 'qwen-vl-max-latest',
                chatType: 't2v',
                size: '16:9',
                waitForCompletion: false  // Return task_id immediately
            })
        });
        
        const taskData = await response.json();
        const requestDuration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        if (!taskData.task_id) {
            console.log(`❌ No task_id returned after ${requestDuration}s`);
            console.log('   Response:', taskData);
            return { success: false, duration: requestDuration };
        }
        
        console.log(`✅ Task created in ${requestDuration}s`);
        console.log(`   Task ID: ${taskData.task_id}`);
        console.log(`   Status: ${taskData.status}`);
        console.log(`   Message: ${taskData.message}`);
        
        // Step 2: Poll for task completion
        console.log('\nStep 2: Polling task status...');
        const taskId = taskData.task_id;
        let attempts = 0;
        const maxAttempts = 90; // 3 minutes max (90 * 2s)
        const pollInterval = 2000; // 2 seconds
        
        while (attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            
            const statusResponse = await fetch(`${BASE_URL}/tasks/status/${taskId}`);
            const statusData = await statusResponse.json();
            
            const currentDuration = ((Date.now() - startTime) / 1000).toFixed(1);
            
            if (statusData.error) {
                console.log(`   Attempt ${attempts}/${maxAttempts} (${currentDuration}s): Error - ${statusData.error}`);
                continue;
            }
            
            const taskStatus = statusData.task_status || statusData.status;
            console.log(`   Attempt ${attempts}/${maxAttempts} (${currentDuration}s): ${taskStatus}`);
            
            if (taskStatus === 'completed' || taskStatus === 'succeeded') {
                const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
                const videoUrl = statusData.content || statusData.data?.content || statusData.result?.url;
                
                console.log(`\n✅ Video completed after ${totalDuration}s (${attempts} polls)`);
                console.log(`   Video URL: ${videoUrl}`);
                return { success: true, duration: totalDuration, attempts, videoUrl };
            }
            
            if (taskStatus === 'failed' || taskStatus === 'error') {
                console.log(`\n❌ Task failed after ${currentDuration}s`);
                return { success: false, duration: currentDuration, attempts };
            }
        }
        
        // Timeout
        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n⏰ Timeout after ${totalDuration}s (${attempts} attempts)`);
        return { success: false, duration: totalDuration, attempts, timeout: true };
        
    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`❌ Error after ${duration}s: ${error.message}`);
        return { success: false, duration, error: error.message };
    }
}

// Run tests
async function runTests() {
    console.log('==============================================');
    console.log('  Video Generation Polling Comparison Test');
    console.log('==============================================');
    
    // Test server-side polling
    const serverResult = await testServerSidePolling();
    
    console.log('\n\n--- Waiting 5 seconds before next test ---\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test client-side polling
    const clientResult = await testClientSidePolling();
    
    // Summary
    console.log('\n\n==============================================');
    console.log('  Test Summary');
    console.log('==============================================');
    console.log('\nServer-Side Polling (waitForCompletion=true):');
    console.log(`  Result: ${serverResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Duration: ${serverResult.duration}s`);
    console.log(`  Note: Single request, server handles all polling`);
    
    console.log('\nClient-Side Polling (waitForCompletion=false):');
    console.log(`  Result: ${clientResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Duration: ${clientResult.duration}s`);
    if (clientResult.attempts) {
        console.log(`  Poll Attempts: ${clientResult.attempts}`);
    }
    console.log(`  Note: Immediate task_id return, client controls polling`);
    
    console.log('\n==============================================');
    console.log('Recommendation:');
    console.log('  - Use waitForCompletion=true (default) for simple integrations');
    console.log('  - Use waitForCompletion=false for:');
    console.log('    * Long-running operations (>3 minutes)');
    console.log('    * Custom timeout/retry logic');
    console.log('    * Progress tracking in UI');
    console.log('    * Background job processing');
    console.log('==============================================\n');
    
    process.exit(serverResult.success || clientResult.success ? 0 : 1);
}

runTests();
