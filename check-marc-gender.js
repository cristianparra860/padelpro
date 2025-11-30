const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const marc = await prisma.user.findFirst({
    where: { name: { contains: 'Marc' } }
  });
  
  console.log('\n📋 DATOS DE MARC PARRA:\n');
  console.log('ID:', marc.id);
  console.log('Nombre:', marc.name);
  console.log('Email:', marc.email);
  console.log('Género:', marc.gender || '❌ NO DEFINIDO');
  console.log('Nivel:', marc.level || '❌ NO DEFINIDO');
  console.log('Créditos:', marc.credits / 100, '€');
  console.log('Bloqueados:', marc.blockedCredits / 100, '€');
  console.log('Disponibles:', (marc.credits - marc.blockedCredits) / 100, '€');
  console.log('\n');
  
  // Verificar si este es el problema
  if (!marc.gender) {
    console.log('⚠️⚠️⚠️ PROBLEMA ENCONTRADO ⚠️⚠️⚠️');
    console.log('Marc NO tiene género definido!');
    console.log('El API de booking CANCELA las reservas si el usuario no tiene género.');
    console.log('Esto explica por qué no se guardó la reserva.');
  }
  
  await prisma.$disconnect();
}

main();
