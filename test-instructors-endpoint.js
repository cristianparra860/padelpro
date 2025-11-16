const http = require('http');

function testInstructorsAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9002,
      path: '/api/instructors',
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const instructors = JSON.parse(data);
          console.log('📊 Instructores desde /api/instructors:\n');
          console.log(`Total: ${instructors.length}\n`);
          instructors.forEach((inst, i) => {
            console.log(`${i + 1}. ${inst.name}`);
            console.log(`   ID: ${inst.id}`);
            console.log(`   Email: ${inst.email || 'Sin email'}`);
            console.log(`   Especialidades: ${inst.specialties || 'Sin especialidades'}`);
            console.log(`   Club: ${inst.clubId}`);
            console.log('');
          });
          resolve(instructors);
        } catch (error) {
          console.error('❌ Error parsing JSON:', error);
          console.error('Raw response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.end();
  });
}

testInstructorsAPI()
  .then(() => console.log('✅ Test completed'))
  .catch((err) => console.error('❌ Test failed:', err));
