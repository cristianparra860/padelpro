const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixClubHours() {
  // Array de 19 posiciones: índices 0-18 representan 6 AM - 12 AM (medianoche)
  // Para terminar a las 23:30, el último índice activo debe ser 17 (23:00)
  // Esto genera slots: 23:00 y 23:30
  
  const newHours = {
    monday: [
      false,  // 0: 6 AM
      false,  // 1: 7 AM
      true,   // 2: 8 AM
      true,   // 3: 9 AM
      true,   // 4: 10 AM
      true,   // 5: 11 AM
      true,   // 6: 12 PM
      true,   // 7: 1 PM
      true,   // 8: 2 PM
      true,   // 9: 3 PM
      true,   // 10: 4 PM
      true,   // 11: 5 PM
      true,   // 12: 6 PM
      true,   // 13: 7 PM
      true,   // 14: 8 PM
      true,   // 15: 9 PM
      true,   // 16: 10 PM
      true,   // 17: 11 PM (genera 23:00 y 23:30)
      false   // 18: 12 AM (medianoche - cerrado)
    ],
    tuesday: [false, false, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, false],
    wednesday: [false, false, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, false],
    thursday: [false, false, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, false],
    friday: [false, false, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, false],
    saturday: [false, false, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, false],
    sunday: [false, false, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, false]
  };

  const club = await prisma.club.findFirst();
  
  if (!club) {
    console.error('❌ No se encontró el club');
    await prisma.$disconnect();
    return;
  }

  await prisma.club.update({
    where: { id: club.id },
    data: {
      openingHours: JSON.stringify(newHours)
    }
  });

  console.log('✅ Horarios actualizados correctamente');
  console.log('📅 Todos los días: 8:00 AM - 23:30 PM (último slot)');
  console.log('🔢 Índices activos: 2-17 (16 horas × 2 slots = 32 slots por día)');

  await prisma.$disconnect();
}

fixClubHours();
