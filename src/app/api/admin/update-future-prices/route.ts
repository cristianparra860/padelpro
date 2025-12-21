import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCourtPriceForTime } from '@/lib/courtPricing';

/**
 * POST /api/admin/update-future-prices
 * 
 * Recalcula los precios de todas las clases futuras sin confirmar
 * basándose en las tarifas actuales configuradas en CourtPriceSlot.
 * 
 * Casos de uso:
 * - Club actualiza sus tarifas horarias
 * - Instructor cambia su precio por clase
 * - Necesitan aplicar nuevos precios a clases ya generadas
 * 
 * Solo actualiza clases:
 * - Con courtId = NULL (propuestas sin confirmar)
 * - Con fecha futura (start > ahora)
 * 
 * @requires Authentication - Usuario debe ser admin o instructor del club
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clubId, userId, instructorId } = body;

    // Validaciones básicas
    if (!clubId || !userId) {
      return NextResponse.json(
        { error: 'Se requiere clubId y userId' },
        { status: 400 }
      );
    }

    // Verificar permisos del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        role: true,
        clubId: true,
        instructorProfile: {
          select: { id: true, clubId: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Validar que el usuario tenga permisos:
    // - Es SUPER_ADMIN (acceso global), O
    // - Es CLUB_ADMIN del club especificado, O
    // - Es instructor del club especificado
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const isClubAdmin = user.role === 'CLUB_ADMIN' && user.clubId === clubId;
    const isInstructorOfClub = user.instructorProfile?.clubId === clubId;

    if (!isSuperAdmin && !isClubAdmin && !isInstructorOfClub) {
      return NextResponse.json(
        { error: 'No tienes permisos para actualizar precios de este club' },
        { status: 403 }
      );
    }

    // Obtener todas las clases futuras sin confirmar del club
    // Solo actualizar clases SIN usuarios inscritos (sin bookings PENDING o CONFIRMED)
    const now = Date.now();
    const futureSlots = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        ts.id,
        ts.start,
        ts.instructorId,
        ts.clubId,
        COALESCE(i.hourlyRate, i.defaultRatePerHour, 15) as instructorPrice,
        (
          SELECT COUNT(*) 
          FROM Booking b 
          WHERE b.timeSlotId = ts.id 
            AND b.status IN ('PENDING', 'CONFIRMED')
        ) as activeBookingsCount
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.clubId = ?
        AND ts.courtId IS NULL
        AND ts.start > ?
      ORDER BY ts.start ASC
    `, clubId, now);

    console.log(`📊 Encontradas ${futureSlots.length} clases futuras sin confirmar`);

    // Filtrar solo clases sin bookings activos (sin usuarios inscritos o pendientes)
    const slotsWithoutBookings = futureSlots.filter(slot => 
      Number(slot.activeBookingsCount) === 0
    );
    
    console.log(`✅ De las cuales ${slotsWithoutBookings.length} NO tienen usuarios inscritos ni pendientes`);

    if (slotsWithoutBookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay clases sin usuarios para actualizar',
        updated: 0,
        details: {
          totalFound: futureSlots.length,
          withBookings: futureSlots.length - slotsWithoutBookings.length
        }
      });
    }

    // Filtrar por instructor si se especifica
    let slotsToUpdate = slotsWithoutBookings;
    if (instructorId) {
      slotsToUpdate = futureSlots.filter(slot => slot.instructorId === instructorId);
      console.log(`🎯 Filtrando por instructor ${instructorId}: ${slotsToUpdate.length} clases`);
    }

    // Recalcular precio de cada clase
    let updatedCount = 0;
    const updates = [];

    for (const slot of slotsToUpdate) {
      const startDate = new Date(Number(slot.start));
      
      // Obtener precio actual de la pista para ese horario
      const courtPrice = await getCourtPriceForTime(clubId, startDate);
      const instructorPrice = Number(slot.instructorPrice) || 15;
      const newTotalPrice = courtPrice + instructorPrice;

      updates.push({
        id: slot.id,
        oldPrice: null, // No lo tenemos en la query
        newPrice: newTotalPrice,
        courtPrice,
        instructorPrice,
        date: startDate.toISOString()
      });

      // Actualizar en base de datos
      await prisma.timeSlot.update({
        where: { id: slot.id },
        data: {
          totalPrice: newTotalPrice,
          courtRentalPrice: courtPrice,
          instructorPrice: instructorPrice
        }
      });

      updatedCount++;
    }

    console.log(`✅ Actualizados ${updatedCount} precios de clases futuras`);

    // Log de auditoría
    await prisma.$executeRaw`
      INSERT INTO ActivityLog (userId, action, details, createdAt)
      VALUES (
        ${userId},
        'UPDATE_FUTURE_PRICES',
        ${JSON.stringify({ 
          clubId, 
          instructorId: instructorId || 'all',
          updatedCount,
          timestamp: new Date().toISOString()
        })},
        ${Date.now()}
      )
    `.catch(err => {
      // Si no existe tabla ActivityLog, solo logueamos
      console.log('⚠️ No se pudo guardar en ActivityLog:', err.message);
    });

    return NextResponse.json({
      success: true,
      message: `Se actualizaron ${updatedCount} clases sin usuarios`,
      updated: updatedCount,
      details: {
        totalFound: futureSlots.length,
        withoutBookings: slotsWithoutBookings.length,
        withBookings: futureSlots.length - slotsWithoutBookings.length,
        filtered: slotsToUpdate.length,
        clubId,
        instructorId: instructorId || 'all',
        dateRange: {
          from: slotsToUpdate[0]?.start ? new Date(Number(slotsToUpdate[0].start)).toISOString() : null,
          to: slotsToUpdate[slotsToUpdate.length - 1]?.start 
            ? new Date(Number(slotsToUpdate[slotsToUpdate.length - 1].start)).toISOString() 
            : null
        }
      },
      // Incluir muestra de primeros 5 cambios para verificación
      sample: updates.slice(0, 5)
    });

  } catch (error) {
    console.error('❌ Error actualizando precios futuros:', error);
    console.error('📝 Stack trace:', error instanceof Error ? error.stack : 'No stack');
    console.error('📝 Message:', error instanceof Error ? error.message : String(error));
    
    return NextResponse.json(
      { 
        error: 'Error al actualizar precios',
        details: error instanceof Error ? error.message : 'Error desconocido',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
