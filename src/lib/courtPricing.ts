import { prisma } from '@/lib/prisma';

/**
 * Obtiene el precio de alquiler de pista para un horario específico
 * basado en las franjas horarias configuradas del club
 */
export async function getCourtPriceForTime(
  clubId: string,
  datetime: Date
): Promise<number> {
  try {
    // Obtener todas las franjas horarias activas del club
    const priceSlots = await prisma.courtPriceSlot.findMany({
      where: {
        clubId: clubId,
        isActive: true
      },
      orderBy: {
        priority: 'desc' // Mayor prioridad primero
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
      const validDays = JSON.parse(slot.daysOfWeek) as number[];
      
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
    // En caso de error, devolver precio por defecto
    return 10;
  }
}

/**
 * Obtiene información de la franja horaria que aplica para un horario específico
 */
export async function getPriceSlotInfoForTime(
  clubId: string,
  datetime: Date
): Promise<{ price: number; slotName?: string; isDefaultPrice: boolean }> {
  try {
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
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { courtRentalPrice: true }
      });
      return {
        price: club?.courtRentalPrice || 10,
        isDefaultPrice: true
      };
    }

    const hours = datetime.getHours();
    const minutes = datetime.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    const dayOfWeek = datetime.getDay();

    for (const slot of priceSlots) {
      const validDays = JSON.parse(slot.daysOfWeek) as number[];
      
      if (!validDays.includes(dayOfWeek)) {
        continue;
      }

      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (timeInMinutes >= startMinutes && timeInMinutes < endMinutes) {
        return {
          price: slot.price,
          slotName: slot.name,
          isDefaultPrice: false
        };
      }
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { courtRentalPrice: true }
    });
    return {
      price: club?.courtRentalPrice || 10,
      isDefaultPrice: true
    };
  } catch (error) {
    console.error('❌ Error obteniendo info de franja:', error);
    return {
      price: 10,
      isDefaultPrice: true
    };
  }
}
