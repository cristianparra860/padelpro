/**
 * Generador automático de propuestas de clases
 * Verifica que todos los horarios disponibles tengan propuestas de TimeSlot
 */

import { prisma } from '@/lib/prisma';

interface GenerationResult {
  success: boolean;
  message: string;
  stats: {
    slotsChecked: number;
    slotsCreated: number;
    slotsSkipped: number;
    errors: string[];
  };
}

/**
 * Genera propuestas de clases para los próximos días
 * @param daysAhead Número de días hacia adelante para generar (default: 7)
 * @param clubId ID del club (default: 'padel-estrella-madrid')
 */
export async function generateClassProposals(
  daysAhead: number = 7,
  clubId: string = 'padel-estrella-madrid'
): Promise<GenerationResult> {
  const stats = {
    slotsChecked: 0,
    slotsCreated: 0,
    slotsSkipped: 0,
    errors: [] as string[],
  };

  try {
    console.log(`🚀 Iniciando generación de propuestas para ${daysAhead} días...`);

    // 1. Obtener todos los instructores activos
    const instructors = await prisma.instructor.findMany({
      where: {
        clubId: clubId,
        isActive: true,
      },
    });

    if (instructors.length === 0) {
      return {
        success: false,
        message: 'No hay instructores disponibles',
        stats,
      };
    }

    console.log(`✅ Encontrados ${instructors.length} instructores`);

    // 2. Obtener todas las pistas del club
    const courts = await prisma.court.findMany({
      where: { clubId },
    });

    if (courts.length === 0) {
      return {
        success: false,
        message: 'No hay pistas disponibles',
        stats,
      };
    }

    console.log(`✅ Encontradas ${courts.length} pistas`);

    // 3. Duración de los slots
    const slotDurationMinutes = 30;

    // 4. Generar slots para cada día
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      
      const dayOfWeek = currentDate.toLocaleDateString('es-ES', { weekday: 'long' });
      console.log(`\n📅 Procesando ${currentDate.toLocaleDateString('es-ES')} (${dayOfWeek})`);

      // Leer horarios desde ClubSchedule
      const clubSchedule = await prisma.clubSchedule.findFirst({
        where: {
          clubId,
          dayOfWeek: currentDate.getDay(), // 0 = domingo, 6 = sábado
        },
      });

      if (clubSchedule?.isClosed) {
        console.log(`⏭️ Club cerrado el ${dayOfWeek}`);
        continue;
      }

      // Usar horarios configurados o fallback a 9:00-22:00
      const startHour = clubSchedule?.openTime ? parseInt(clubSchedule.openTime.split(':')[0]) : 9;
      const endHour = clubSchedule?.closeTime ? parseInt(clubSchedule.closeTime.split(':')[0]) : 22;
      
      console.log(`⏰ Horarios: ${startHour}:00 - ${endHour}:00`);

      // Generar slots para cada hora del día
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDurationMinutes) {
          stats.slotsChecked++;

          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, minute, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotStart.getMinutes() + 60); // 60 minutos de clase

          // Crear una propuesta para CADA instructor en este horario
          for (const instructor of instructors) {
            // Verificar si ya existe una propuesta para este instructor y horario
            const existingSlot = await prisma.timeSlot.findFirst({
              where: {
                clubId,
                instructorId: instructor.id,
                start: slotStart,
                courtId: null, // Solo propuestas
              },
            });

            if (existingSlot) {
              stats.slotsSkipped++;
              continue;
            }

            // Crear la propuesta de clase
            try {
              const timeSlotId = `ts-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
              
              await prisma.timeSlot.create({
                data: {
                  id: timeSlotId,
                  clubId,
                  instructorId: instructor.id,
                  start: slotStart,
                  end: slotEnd,
                  courtId: null, // Sin pista asignada (propuesta)
                  courtNumber: null,
                  level: 'abierto',
                  category: 'general',
                  maxPlayers: 4,
                  totalPrice: 10.0,
                  instructorPrice: 7.0,
                  courtRentalPrice: 3.0,
                },
              });

              stats.slotsCreated++;
              
              if (stats.slotsCreated % 100 === 0) {
                console.log(`✨ Creados ${stats.slotsCreated} slots...`);
              }
            } catch (error) {
              stats.errors.push(`Error creando slot para ${instructor.id} en ${slotStart.toISOString()}: ${error}`);
            }
          }
        }
      }
    }

    console.log(`\n✅ Generación completada:`);
    console.log(`   - Slots verificados: ${stats.slotsChecked}`);
    console.log(`   - Slots creados: ${stats.slotsCreated}`);
    console.log(`   - Slots omitidos: ${stats.slotsSkipped}`);
    console.log(`   - Errores: ${stats.errors.length}`);

    return {
      success: true,
      message: `Generación completada: ${stats.slotsCreated} slots creados`,
      stats,
    };
  } catch (error) {
    console.error('❌ Error en generación:', error);
    return {
      success: false,
      message: `Error: ${error}`,
      stats,
    };
  }
}

/**
 * Limpia propuestas antiguas (más de 30 días atrás)
 */
export async function cleanOldProposals(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prisma.timeSlot.deleteMany({
    where: {
      start: {
        lt: thirtyDaysAgo,
      },
      courtId: null, // Solo propuestas sin pista asignada
    },
  });

  console.log(`🧹 Limpiadas ${result.count} propuestas antiguas`);
  return result.count;
}
