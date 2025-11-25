const http = require('http');

const options = {
  hostname: 'localhost',
  port: 9002,
  path: '/api/admin/clubs/padel-estrella-madrid/courts',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    try {
      const json = JSON.parse(data);
      console.log('\n📊 Pistas encontradas:', json.length);
      json.forEach(court => {
        console.log(`  - Pista #${court.number}: ${court.name || 'Sin nombre'}`);
      });
    } catch (e) {
      console.log('No es JSON válido');
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
