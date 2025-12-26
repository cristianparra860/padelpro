const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMoreMatches() {
  console.log('🎾 CREANDO 10 PARTIDAS DE PRUEBA\n');
  
  const clubId = 'club-1';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Horarios variados durante el día
  const timeSlots = [
    { hour: 8, minute: 0 },
    { hour: 9, minute: 30 },
    { hour: 11, minute: 0 },
    { hour: 12, minute: 30 },
    { hour: 14, minute: 0 },
    { hour: 15, minute: 30 },
    { hour: 17, minute: 0 },
    { hour: 18, minute: 30 },
    { hour: 20, minute: 0 },
    { hour: 21, minute: 30 }
  ];
  
  const levels = ['0.0 - 7.0', '1.5', '2.5', '3.5', '4.5'];
  const genderCategories = ['masculino', 'femenino', 'mixto'];
  const durations = [60, 90];
  
  let created = 0;
  
  for (let i = 0; i < timeSlots.length; i++) {
    const slot = timeSlots[i];
    const startDate = new Date(today);
    startDate.setHours(slot.hour, slot.minute, 0, 0);
    
    const duration = durations[Math.floor(Math.random() * durations.length)];
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    
    const level = i % 3 === 0 ? null : levels[i % levels.length];
    const isOpen = level === null;
    const genderCategory = i % 3 === 0 ? null : genderCategories[i % genderCategories.length];
    
    const pricePerPlayer = 10 + (i % 3) * 5; // 10, 15, 20
    const courtRentalPrice = pricePerPlayer * 4;
    
    try {
      const match = await prisma.matchGame.create({
        data: {
          clubId,
          start: startDate,
          end: endDate,
          duration,
          maxPlayers: 4,
          pricePerPlayer,
          courtRentalPrice,
          level,
          genderCategory,
          isOpen,
          creditsSlots: JSON.stringify([1, 2, 3, 4]),
          creditsCost: 50
        }
      });
      
      created++;
      console.log(`✅ Partida ${created}: ${startDate.toLocaleTimeString('es-ES')} - ${pricePerPlayer}€ - ${isOpen ? 'Abierta' : `Nivel ${level}`}`);
      
    } catch (error) {
      console.log(`❌ Error creando partida ${i + 1}:`, error.message);
    }
  }
  
  console.log(`\n🎉 ${created} partidas creadas exitosamente`);
  
  await prisma.$disconnect();
}

addMoreMatches().catch(console.error);
