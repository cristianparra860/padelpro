// Simula el guardado de disponibilidad desde el navegador
async function testSaveAvailability() {
  console.log('🧪 Simulando guardado de disponibilidad...\n');
  
  // Datos que envía el componente
  const testData = {
    unavailableHours: {
      monday: [{ start: '09:00', end: '15:30' }]
    }
  };
  
  // Obtener token del instructor (simular)
  console.log('📝 Obteniendo instructor de la base de datos...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const instructor = await prisma.instructor.findFirst({
    where: { isActive: true },
    include: { user: true }
  });
  
  if (!instructor) {
    console.log('❌ No se encontró instructor');
    return;
  }
  
  console.log(`✅ Instructor: ${instructor.user.name} (${instructor.id})`);
  console.log(`   userId: ${instructor.userId}`);
  
  // Obtener token JWT para ese usuario
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'padelpro-secret-key-change-in-production';
  
  const token = jwt.sign({
    userId: instructor.userId,
    email: instructor.user.email,
    role: instructor.user.role,
    clubId: instructor.user.clubId
  }, JWT_SECRET, { expiresIn: '7d' });
  
  console.log('\n🔐 Token JWT generado');
  
  // Hacer la petición PUT
  console.log('\n📤 Enviando PUT a /api/instructors/' + instructor.id);
  console.log('Body:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch(`http://localhost:9002/api/instructors/${instructor.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log('\n📥 Respuesta recibida:');
    console.log('Status:', response.status, response.statusText);
    
    const result = await response.json();
    console.log('Body:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.log('\n❌ ERROR:', result.error);
      if (result.details) {
        console.log('📋 Detalles:', result.details);
      }
      if (result.stack) {
        console.log('📚 Stack trace:');
        console.log(result.stack);
      }
    } else {
      console.log('\n✅ Guardado exitoso!');
    }
    
  } catch (error) {
    console.error('\n❌ Error de red:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSaveAvailability();
