const fetch = require('node-fetch');

async function testApi() {
    try {
        const response = await fetch('http://localhost:5000/api/subcategories');
        const data = await response.json();
        console.log('Subcategories API Response (Count):', data.length);
        if (data.length > 0) {
            console.log('Sample Subcategory:', data[0]);
        }
        process.exit(0);
    } catch (error) {
        console.error('API Test Error:', error.message);
        process.exit(1);
    }
}

testApi();
