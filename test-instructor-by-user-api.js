const fetch = require('node-fetch');

async function testInstructorByUserAPI() {
  console.log('🧪 Testing /api/instructors/by-user endpoint...\n');
  
  const userId = 'user-1763677141038-6l5kk4i4p'; // Carlos Ruiz
  const url = `http://localhost:9002/api/instructors/by-user/${userId}`;
  
  console.log('📡 Calling:', url);
  
  try {
    const response = await fetch(url);
    console.log('Status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Response data:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('\n❌ Error response:', text);
    }
  } catch (error) {
    console.error('\n❌ Fetch error:', error.message);
  }
}

testInstructorByUserAPI();
