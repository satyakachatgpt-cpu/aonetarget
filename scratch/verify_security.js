import http from 'http';

const endpoints = [
  { path: '/api/dashboard/stats', method: 'GET', name: 'Dashboard Stats' },
  { path: '/api/admin/verify', method: 'GET', name: 'Admin Verify' },
  { path: '/api/proxy-resource?url=http://127.0.0.1:5000', method: 'GET', name: 'SSRF Check (Localhost)' },
  { path: '/api/proxy-resource?url=https://res.cloudinary.com/dummy', method: 'GET', name: 'SSRF Check (Cloudinary)' }
];

async function testEndpoint(endpoint, postData = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: endpoint.path,
      method: endpoint.method || (postData ? 'POST' : 'GET'),
      headers: postData ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      } : {},
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          name: endpoint.name,
          status: res.statusCode,
          body: data.substring(0, 100)
        });
      });
    });

    req.on('error', (err) => {
      resolve({ name: endpoint.name, error: err.message });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- SECURITY VERIFICATION RESULTS ---');
  
  // 1. Basic Auth & SSRF Checks
  for (const ep of endpoints) {
    const result = await testEndpoint(ep);
    if (result.error) {
      console.log(`[FAIL] ${result.name}: Connection Error - ${result.error}`);
    } else {
      const isProtected = result.status === 401 || result.status === 403;
      const statusText = isProtected ? 'PROTECTED' : 'PUBLIC';
      console.log(`[${statusText}] ${result.name}: Status ${result.status}`);
    }
  }

  // 2. Payload Limit Checks
  console.log('\n--- PAYLOAD LIMIT CHECKS ---');
  
  // Large JSON (approx 3MB)
  const largeData = JSON.stringify({ data: 'a'.repeat(3 * 1024 * 1024) });
  
  // Test global limit (2MB) on a common endpoint
  const globalResult = await testEndpoint({ path: '/api/students/signup', method: 'POST', name: 'Global Limit Check (3MB to Signup)' }, largeData);
  console.log(`[VERIFIED] Global Limit Check (3MB): Status ${globalResult.status === 413 ? 'REJECTED (Correct)' : 'ACCEPTED (Error: ' + globalResult.status + ')'}`);

  // Test bulk upload limit (50MB) with 3MB
  const bulkResult = await testEndpoint({ path: '/api/questions/bulk', method: 'POST', name: 'Bulk Limit Check (3MB to Questions/Bulk)' }, largeData);
  // We expect 401 because we haven't provided a token, but the status shouldn't be 413
  console.log(`[VERIFIED] Bulk Limit Check (3MB): Status ${bulkResult.status === 413 ? 'REJECTED (Error)' : 'PASSED (Status ' + bulkResult.status + ')'}`);
}

runTests();
