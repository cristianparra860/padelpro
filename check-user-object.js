const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function checkUserObject() {
  try {
    // Token simulado
    const token = 'eyJ...'; // Reemplazar con token real si es necesario
    
    // O buscar directamente al usuario
    const user = await prisma.user.findFirst({
      where: {
        email: 'jugador1@padelpro.com'
      }
    });
    
    console.log('📊 Usuario en base de datos:');
    console.log(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      profilePictureUrl: user.profilePictureUrl?.substring(0, 80),
      hasPhoto: !!user.profilePictureUrl,
      photoLength: user.profilePictureUrl?.length
    }, null, 2));
    
    // Simular lo que devuelve el API
    const apiResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      emergencyContact: user.emergencyContact,
      genderCategory: user.genderCategory,
      level: user.level,
      role: user.role,
      credits: Number(user.credits),
      profilePictureUrl: user.profilePictureUrl
    };
    
    console.log('\n📡 Lo que devuelve el API:');
    console.log(JSON.stringify({
      ...apiResponse,
      profilePictureUrl: apiResponse.profilePictureUrl?.substring(0, 80)
    }, null, 2));
    
    console.log('\n✅ user.profilePictureUrl existe:', !!apiResponse.profilePictureUrl);
    console.log('✅ Es base64/data URI:', apiResponse.profilePictureUrl?.startsWith('data:image'));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserObject();
