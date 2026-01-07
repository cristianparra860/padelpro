import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCourtPriceForTime } from '@/lib/courtPricing';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    console.log('\n🤖 AUTO-GENERACIÓN DE PARTIDAS - INICIANDO');
    console.log('='.repeat(60));

    // Verificar autorización (opcional pero recomendado en producción)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ No autorizado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener club principal
    const club = await prisma.club.findFirst();
    if (!club) {
      console.log('❌ No se encontró el club');
      return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });
    }

    console.log(`✅ Club: ${club.name} (${club.id})`);

    // Configuración
    const DAYS_AHEAD = 7; // Generar para los próximos 7 días
    const TIME_SLOTS = [
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

    const MATCH_TYPES = [
      { isOpen: true, duration: 90, price: 15 }, // Partidas abiertas (90 min, 15€)
      { isOpen: false, level: '2.5', duration: 60, price: 12 }, // Nivel intermedio
      { isOpen: false, level: '4.5', duration: 90, price: 20 }, // Nivel avanzado
    ];

    let generated = 0;
    let skipped = 0;

    // Generar para cada día
    for (let dayOffset = 0; dayOffset < DAYS_AHEAD; dayOffset++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dayOffset);
      targetDate.setHours(0, 0, 0, 0);

      console.log(`\n📅 Generando para: ${targetDate.toLocaleDateString('es-ES')}`);

      // Generar para cada franja horaria
      for (const timeSlot of TIME_SLOTS) {
        const startDate = new Date(targetDate);
        startDate.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

        // Generar varios tipos de partidas para el mismo horario
        for (const matchType of MATCH_TYPES) {
          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + matchType.duration);

          // Verificar si ya existe una partida similar
          const existing = await prisma.matchGame.findFirst({
            where: {
              clubId: club.id,
              start: startDate,
              isOpen: matchType.isOpen,
              level: matchType.level || null
            }
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Calcular precio de pista según horario y duración
          const courtPricePerHour = await getCourtPriceForTime(club.id, startDate);
          const courtPrice = courtPricePerHour * (matchType.duration / 60); // Precio proporcional
          
          // Crear la partida
          await prisma.matchGame.create({
            data: {
              clubId: club.id,
              start: startDate,
              end: endDate,
              duration: matchType.duration,
              maxPlayers: 4,
              pricePerPlayer: matchType.price,
              courtRentalPrice: courtPrice,
              level: matchType.level || null,
              genderCategory: null, // Se define cuando se une el primer jugador
              isOpen: matchType.isOpen,
              creditsSlots: JSON.stringify([1, 2, 3, 4]),
              creditsCost: 50 // Coste en puntos para reservar
            }
          });

          generated++;
        }
      }
    }

    console.log(`\n✅ Generación completada:`);
    console.log(`   - Creadas: ${generated} partidas`);
    console.log(`   - Omitidas (ya existen): ${skipped}`);
    console.log('='.repeat(60));

    return NextResponse.json({
      success: true,
      generated,
      skipped,
      message: `Se generaron ${generated} partidas para los próximos ${DAYS_AHEAD} días`
    });

  } catch (error) {
    console.error('❌ Error al generar partidas:', error);
    return NextResponse.json(
      { error: 'Error al generar partidas', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
