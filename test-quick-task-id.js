// Quick test: Verify task_id is returned immediately with waitForCompletion=false

const BASE_URL = 'http://localhost:3264/api';

async function quickTest() {
    console.log('=== Quick Test: Immediate Task ID Return ===\n');
    
    const startTime = Date.now();
    
    try {
        console.log('Sending video generation request with waitForCompletion=false...');
        
        const response = await fetch(`${BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'A quick test video of clouds',
                model: 'qwen-vl-max-latest',
                chatType: 't2v',
                size: '16:9',
                waitForCompletion: false  // Should return immediately
            })
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const data = await response.json();
        
        console.log(`\n✅ Response received in ${duration}s`);
        console.log('\nResponse data:');
        console.log(JSON.stringify(data, null, 2));
        
        if (data.task_id) {
            console.log(`\n✅ SUCCESS: task_id returned immediately`);
            console.log(`   Task ID: ${data.task_id}`);
            console.log(`   Status: ${data.status}`);
            console.log(`   Object: ${data.object}`);
            console.log(`   Message: ${data.message}`);
            console.log(`\n📊 You can poll this task at: GET ${BASE_URL}/tasks/status/${data.task_id}`);
            return true;
        } else {
            console.log(`\n❌ FAILED: No task_id in response`);
            return false;
        }
        
    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n❌ ERROR after ${duration}s: ${error.message}`);
        return false;
    }
}

quickTest().then(success => {
    process.exit(success ? 0 : 1);
});
