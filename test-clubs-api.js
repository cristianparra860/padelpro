const fetch = require('node-fetch');

async function testClubsAPI() {
  try {
    console.log('🔍 Testing clubs API...');
    const response = await fetch('http://localhost:9002/api/admin/clubs');
    
    console.log('Status:', response.status);
    console.log('OK:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Response data:');
      console.log('Total clubs:', data.length);
      console.log('\nClubs:');
      data.forEach((club, index) => {
        console.log(`\n${index + 1}. ${club.name}`);
        console.log(`   ID: ${club.id}`);
        console.log(`   Address: ${club.address}`);
        console.log(`   Email: ${club.email || 'N/A'}`);
        console.log(`   Logo: ${club.logo || 'N/A'}`);
      });
    } else {
      console.error('❌ Error:', response.statusText);
      const error = await response.text();
      console.error('Error details:', error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testClubsAPI();
