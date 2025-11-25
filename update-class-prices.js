const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Recalcula el precio de una clase basándose en las tarifas actuales
 */
async function getCourtPriceForTime(clubId, datetime) {
  try {
    // Obtener todas las franjas horarias activas del club
    const priceSlots = await prisma.courtPriceSlot.findMany({
      where: {
        clubId: clubId,
        isActive: true
      },
      orderBy: {
        priority: 'desc'
      }
    });

    if (priceSlots.length === 0) {
      // Si no hay franjas configuradas, usar precio por defecto del club
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { courtRentalPrice: true }
      });
      return club?.courtRentalPrice || 10;
    }

    // Extraer hora y día de la semana del datetime
    const hours = datetime.getHours();
    const minutes = datetime.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    const dayOfWeek = datetime.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado

    // Buscar la franja que aplica (por prioridad)
    for (const slot of priceSlots) {
      // Parsear días de la semana
      const validDays = JSON.parse(slot.daysOfWeek);
      
      // Verificar si el día aplica
      if (!validDays.includes(dayOfWeek)) {
        continue;
      }

      // Convertir startTime y endTime a minutos
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Verificar si la hora está dentro del rango
      if (timeInMinutes >= startMinutes && timeInMinutes < endMinutes) {
        return slot.price;
      }
    }

    // Si no se encontró ninguna franja aplicable, usar precio por defecto del club
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { courtRentalPrice: true }
    });
    return club?.courtRentalPrice || 10;
  } catch (error) {
    console.error('❌ Error calculando precio de pista:', error);
    return 10;
  }
}

async function main() {
  console.log('🔄 ACTUALIZANDO PRECIOS DE CLASES EXISTENTES...\n');

  const clubId = 'padel-estrella-madrid';
  
  // Obtener todas las clases (confirmadas y propuestas)
  const allClasses = await prisma.timeSlot.findMany({
    where: {
      clubId: clubId
    },
    select: {
      id: true,
      start: true,
      totalPrice: true,
      instructorPrice: true,
      courtRentalPrice: true,
      courtId: true
    }
  });

  console.log(`📊 Total de clases encontradas: ${allClasses.length}\n`);

  let updatedCount = 0;
  const instructorPrice = 15; // Precio fijo del instructor

  for (const cls of allClasses) {
    const startDate = new Date(cls.start);
    const newCourtPrice = await getCourtPriceForTime(clubId, startDate);
    const newTotalPrice = instructorPrice + newCourtPrice;

    const oldTotal = Number(cls.totalPrice);
    const oldCourt = Number(cls.courtRentalPrice);
    const oldInstructor = Number(cls.instructorPrice);

    // Solo actualizar si el precio cambió
    if (oldTotal !== newTotalPrice || oldCourt !== newCourtPrice || oldInstructor !== instructorPrice) {
      await prisma.timeSlot.update({
        where: { id: cls.id },
        data: {
          totalPrice: newTotalPrice,
          instructorPrice: instructorPrice,
          courtRentalPrice: newCourtPrice
        }
      });

      console.log(`✅ Actualizada clase ${startDate.toLocaleString('es-ES')}`);
      console.log(`   Anterior: Total €${oldTotal} (Instructor €${oldInstructor} + Pista €${oldCourt})`);
      console.log(`   Nuevo:    Total €${newTotalPrice} (Instructor €${instructorPrice} + Pista €${newCourtPrice})`);
      console.log(`   Estado: ${cls.courtId ? 'CONFIRMADA' : 'PROPUESTA'}\n`);
      
      updatedCount++;
    }
  }

  console.log(`\n✨ RESUMEN:`);
  console.log(`   Total de clases: ${allClasses.length}`);
  console.log(`   Clases actualizadas: ${updatedCount}`);
  console.log(`   Sin cambios: ${allClasses.length - updatedCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
