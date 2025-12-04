const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeTestBooking() {
  console.log('\n🎯 HACIENDO RESERVA DE PRUEBA...\n');
  
  // 1. Obtener usuario Marc Parra
  const user = await prisma.user.findFirst({
    where: { email: 'marcparra@hotmail.es' }
  });
  
  if (!user) {
    console.log('❌ Usuario no encontrado');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`👤 Usuario: ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Nivel: ${user.level}`);
  console.log(`   Género: ${user.gender}`);
  console.log(`   Créditos: ${user.credits}`);
  
  // 2. Verificar la clase vacía
  const timeSlotId = 'ts-1764308191576-ckdaeugsvsh';
  const slot = await prisma.$queryRaw`
    SELECT * FROM TimeSlot WHERE id = ${timeSlotId}
  `;
  
  if (!slot || slot.length === 0) {
    console.log('❌ TimeSlot no encontrado');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`\n🎾 Clase a reservar:`);
  console.log(`   ID: ${slot[0].id}`);
  console.log(`   Hora: ${new Date(Number(slot[0].start)).toLocaleString('es-ES')}`);
  console.log(`   Level actual: "${slot[0].level}"`);
  console.log(`   Gender actual: ${slot[0].genderCategory}`);
  
  // 3. Hacer la llamada a la API de booking
  const bookingData = {
    timeSlotId: timeSlotId,
    userId: user.id,
    groupSize: 1,
    paymentMethod: 'credits'
  };
  
  console.log(`\n📤 Enviando request de reserva...`);
  console.log(`   TimeSlot: ${bookingData.timeSlotId}`);
  console.log(`   User: ${bookingData.userId}`);
  console.log(`   GroupSize: ${bookingData.groupSize}`);
  
  try {
    const http = require('http');
    
    const postData = JSON.stringify(bookingData);
    
    const options = {
      hostname: 'localhost',
      port: 9002,
      path: '/api/classes/book',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const result = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });
      
      req.on('error', (e) => {
        reject(e);
      });
      
      req.write(postData);
      req.end();
    });
    
    console.log(`\n📥 Response Status: ${result.status}`);
    console.log(`📥 Response Data:`, JSON.stringify(result.data, null, 2));
    
    if (result.status === 200 || result.status === 201) {
      console.log('\n✅ RESERVA EXITOSA!\n');
      
      // 4. Verificar cambios en el TimeSlot
      const updatedSlot = await prisma.$queryRaw`
        SELECT level, levelRange, genderCategory FROM TimeSlot WHERE id = ${timeSlotId}
      `;
      
      console.log('🔍 Estado actualizado del TimeSlot:');
      console.log(`   Level: "${updatedSlot[0].level}"`);
      console.log(`   LevelRange: "${updatedSlot[0].levelRange}"`);
      console.log(`   GenderCategory: "${updatedSlot[0].genderCategory}"`);
      
      // 5. Verificar la reserva creada
      const booking = await prisma.$queryRaw`
        SELECT * FROM Booking WHERE timeSlotId = ${timeSlotId} AND userId = ${user.id}
        ORDER BY createdAt DESC LIMIT 1
      `;
      
      if (booking.length > 0) {
        console.log('\n📋 Reserva creada:');
        console.log(`   ID: ${booking[0].id}`);
        console.log(`   Status: ${booking[0].status}`);
        console.log(`   GroupSize: ${booking[0].groupSize}`);
      }
      
    } else {
      console.log('\n❌ ERROR en la reserva');
    }
    
  } catch (error) {
    console.log('\n❌ Error en la petición:', error.message);
  }
  
  await prisma.$disconnect();
}

makeTestBooking().catch(console.error);
