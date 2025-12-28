const http = require('http');

function makeRequest(action, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/module',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function runTests() {
    console.log('--- Starting Verification Tasks ---');

    try {
        // Test 1: Save
        console.log('\n[Task 1] Saving Note...');
        const saveRes = await makeRequest('save', {
            module_act: 'save',
            pad_code: 'cmd_test_pad',
            pad_content: 'Verified via CMD'
        });
        console.log('Save Response:', saveRes);

        // Test 2: Open
        console.log('\n[Task 2] Opening Note...');
        const openRes = await makeRequest('open', {
            module_act: 'open',
            pad_code: 'cmd_test_pad'
        });
        console.log('Open Response:', openRes);

        if (openRes.pad_content === 'Verified via CMD') {
            console.log('\n✅ SUCCESS: Content verified!');
        } else {
            console.error('\n❌ FAILURE: Content mismatch.');
        }

    } catch (err) {
        console.error('Test Failed:', err);
    }
}

runTests();
