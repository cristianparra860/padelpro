// src/lib/blockedCredits.ts
// Utilidades para el sistema de bloqueo de saldo y reciclaje de plazas

import { prisma } from '@/lib/prisma';

/**
 * Calcula el saldo que debe estar bloqueado para un usuario.
 * 
 * NUEVA REGLA: Se bloquea solo el precio de la clase MÁS CARA entre todas las inscripciones
 * pendientes (PENDING) cuyos TimeSlots NO tengan pista asignada (courtId = NULL).
 * 
 * @param userId - ID del usuario
 * @returns Monto en CÉNTIMOS que debe estar bloqueado
 */
import { createTransaction } from '@/lib/transactionLogger';

/**
 * Calcula el saldo que debe estar bloqueado para un usuario.
 * 
 * REGLA: "Suma de los Máximos por Día"
 * 1. Agrupar inscripciones pendientes por día.
 * 2. En cada día, tomar la inscripción de mayor valor.
 * 3. Sumar esos máximos diarios.
 * 
 * @param userId - ID del usuario
 * @returns Monto en CÉNTIMOS que debe estar bloqueado
 */
export async function calculateBlockedCredits(userId: string): Promise<number> {
  // Obtener todas las inscripciones pendientes del usuario donde el TimeSlot NO tenga pista asignada
  // Y que sean FUTURAS (para no bloquear saldo de clases pasadas)
  const pendingBookings = await prisma.booking.findMany({
    where: {
      userId,
      status: 'PENDING',
      timeSlot: {
        courtId: null, // Solo TimeSlots sin pista asignada
        start: {
          gt: new Date() // ✅ SOLO FUTURAS
        }
      }
    },
    select: {
      amountBlocked: true,
      timeSlot: {
        select: {
          start: true
        }
      }
    }
  });

  if (pendingBookings.length === 0) {
    return 0;
  }

  // Agrupar por fecha (YYYY-MM-DD)
  const maxPerDay: Record<string, number> = {};

  pendingBookings.forEach(booking => {
    const dateKey = new Date(booking.timeSlot.start).toISOString().split('T')[0];
    const amount = booking.amountBlocked || 0;

    if (!maxPerDay[dateKey] || amount > maxPerDay[dateKey]) {
      maxPerDay[dateKey] = amount;
    }
  });

  // Sumar los máximos de cada día
  const totalBlocked = Object.values(maxPerDay).reduce((sum, val) => sum + val, 0);

  return totalBlocked;
}

/**
 * Obtiene el desglose del saldo bloqueado por día.
 * Útil para mostrar al usuario qué días están bloqueando saldo.
 */
export async function getBlockedCreditsBreakdown(userId: string) {
  const pendingBookings = await prisma.booking.findMany({
    where: {
      userId,
      status: 'PENDING',
      timeSlot: {
        courtId: null,
        start: {
          gt: new Date()
        }
      }
    },
    select: {
      id: true,
      amountBlocked: true,
      timeSlot: {
        select: {
          start: true
        }
      }
    }
  });

  const breakdown: Record<string, { date: string, amount: number, count: number }> = {};

  pendingBookings.forEach(booking => {
    const dateKey = new Date(booking.timeSlot.start).toISOString().split('T')[0];
    const amount = booking.amountBlocked || 0;

    if (!breakdown[dateKey]) {
      breakdown[dateKey] = { date: dateKey, amount: 0, count: 0 };
    }

    // Guardar el máximo del día
    if (amount > breakdown[dateKey].amount) {
      breakdown[dateKey].amount = amount;
    }

    breakdown[dateKey].count++;
  });

  // Convertir a array ordenado por fecha
  return Object.values(breakdown).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Finaliza reservas pendientes expiradas (que ya pasaron de fecha sin confirmarse).
 * 1. Las marca como CANCELLED.
 * 2. Recalcula el saldo bloqueado.
 * 3. Si se libera saldo, crea una transacción de devolución.
 */
export async function finalizeExpiredBookings(userId: string): Promise<void> {
  const now = new Date();

  // 1. Buscar inscripciones expiradas (PENDING + fecha pasada)
  const expiredBookings = await prisma.booking.findMany({
    where: {
      userId,
      status: 'PENDING',
      timeSlot: {
        start: {
          lt: now // Solo pasadas
        }
      }
    },
    include: {
      timeSlot: true
    }
  });

  if (expiredBookings.length === 0) {
    // Si no hay expiradas, solo asegurarnos que el saldo bloqueado esté actualizado
    // (Pudo haber cambiado por reservas confirmadas de otros usuarios)
    await updateUserBlockedCredits(userId);
    return;
  }

  console.log(`🧹 Encontradas ${expiredBookings.length} inscripciones expiradas para ${userId}`);

  // 2. Obtener saldo bloqueado ANTES de limpiar
  const userBefore = await prisma.user.findUnique({
    where: { id: userId },
    select: { blockedCredits: true, credits: true }
  });
  const blockedBefore = userBefore?.blockedCredits || 0;

  // 3. Cancelar inscripciones expiradas
  for (const booking of expiredBookings) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' }
    });
    console.log(`   ❌ Cancelada inscripción expirada: ${booking.id} (${booking.timeSlot.start})`);
  }

  // 4. Recalcular saldo bloqueado (ahora sin las expiradas)
  const blockedAfter = await calculateBlockedCredits(userId);

  // 5. Actualizar usuario
  await prisma.user.update({
    where: { id: userId },
    data: { blockedCredits: blockedAfter }
  });

  // 6. Calcular diferencia liberada
  const releasedAmount = blockedBefore - blockedAfter;

  // 7. Si se liberó saldo positivo, registrar transacción
  if (releasedAmount > 0) {
    console.log(`   💰 Liberando €${releasedAmount / 100} bloqueados al usuario ${userId}`);

    await createTransaction({
      userId,
      type: 'credit',
      action: 'unblock', // Usamos 'unblock' o 'add' según prefieras visualmente. 'unblock' es semánticamente correcto.
      amount: releasedAmount,
      balance: (userBefore?.credits || 0) - blockedAfter, // El saldo real disponible sube
      concept: `Saldo desbloqueado (Clases incompletas expiradas)`,
      relatedType: 'system_cleanup'
    });
  }
}

/**
 * Actualiza el campo blockedCredits del usuario basado en sus inscripciones pendientes.
 * 
 * @param userId - ID del usuario
 * @returns Nuevo valor de blockedCredits
 */
export async function updateUserBlockedCredits(userId: string): Promise<number> {
  const blockedAmount = await calculateBlockedCredits(userId);

  await prisma.user.update({
    where: { id: userId },
    data: { blockedCredits: blockedAmount }
  });

  return blockedAmount;
}

/**
 * Calcula el saldo disponible del usuario (credits - blockedCredits).
 * 
 * @param userId - ID del usuario
 * @returns Saldo disponible en CÉNTIMOS
 */
export async function getAvailableCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, blockedCredits: true }
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  return user.credits - user.blockedCredits;
}

/**
 * Verifica si el usuario tiene suficiente saldo disponible para una inscripción.
 * 
 * @param userId - ID del usuario
 * @param amount - Monto requerido en CÉNTIMOS
 * @returns true si tiene saldo suficiente
 */
export async function hasAvailableCredits(userId: string, amount: number): Promise<boolean> {
  const available = await getAvailableCredits(userId);
  return available >= amount;
}

/**
 * Calcula el precio por jugador individual según el tamaño del grupo.
 * 
 * @param totalPrice - Precio total de la clase EN EUROS (del TimeSlot)
 * @param groupSize - Número de jugadores en el grupo
 * @returns Precio por jugador individual en euros
 */
export function calculateSlotPrice(totalPrice: number, groupSize: number): number {
  // totalPrice viene en euros desde la BD
  // El precio por jugador es simplemente el total dividido entre el número de jugadores
  const pricePerPlayer = totalPrice / groupSize;
  return Math.round(pricePerPlayer * 100) / 100; // Redondear a 2 decimales
}

/**
 * Marca una plaza como reciclada en el TimeSlot.
 * Esto permite que otros usuarios la reserven con puntos.
 * 
 * @param timeSlotId - ID del TimeSlot
 */
export async function markSlotAsRecycled(timeSlotId: string): Promise<void> {
  // Obtener información del timeslot y sus bookings
  const timeSlot = await prisma.timeSlot.findUnique({
    where: { id: timeSlotId },
    include: {
      bookings: true
    }
  });

  if (!timeSlot) {
    console.error(`⚠️ TimeSlot ${timeSlotId} no encontrado`);
    return;
  }

  // Calcular plazas recicladas disponibles
  const recycledBookings = timeSlot.bookings.filter(b => b.status === 'CANCELLED' && b.isRecycled);
  const activeBookings = timeSlot.bookings.filter(b => b.status !== 'CANCELLED');

  const maxPlayers = Number(timeSlot.maxPlayers || 4);
  const availableRecycledSlots = Math.max(0, maxPlayers - activeBookings.length);

  console.log(`♻️ Actualizando TimeSlot ${timeSlotId}:`, {
    maxPlayers,
    activeBookings: activeBookings.length,
    recycledBookings: recycledBookings.length,
    availableRecycledSlots,
    recycledSlotsOnlyPoints: true
  });

  // Actualizar el timeslot con los valores calculados
  await prisma.timeSlot.update({
    where: { id: timeSlotId },
    data: {
      hasRecycledSlots: true,
      availableRecycledSlots: availableRecycledSlots,
      recycledSlotsOnlyPoints: true
    }
  });
}

/**
 * Otorga puntos de compensación al usuario por cancelar una inscripción confirmada.
 * 
 * @param userId - ID del usuario
 * @param amount - Monto de la inscripción cancelada (en euros)
 * @returns Nuevos puntos del usuario
 */
export async function grantCompensationPoints(userId: string, amount: number, skipTransaction = false): Promise<number> {
  // Convertir euros a puntos (1€ = 1 punto)
  const pointsToGrant = Math.floor(amount);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      points: {
        increment: pointsToGrant
      }
    }
  });

  // Registrar transacción (a menos que se indique explícitamente que no)
  // El skipTransaction se usa cuando el caller ya registró la transacción manualmente
  if (!skipTransaction) {
    await createTransaction({
      userId,
      type: 'points',
      action: 'add',
      amount: pointsToGrant,
      balance: user.points,
      concept: `Puntos de compensación por cesión de plaza`,
      relatedType: 'compensation',
      metadata: {
        originalAmount: amount,
        pointsGranted: pointsToGrant
      }
    });
  }

  return user.points;
}

/**
 * Resetea el nivel y categoría de un TimeSlot si no tiene usuarios inscritos.
 * Solo aplica si NO hay bookings activos (PENDING o CONFIRMED).
 * 
 * @param timeSlotId - ID del TimeSlot a verificar
 * @returns true si se reseteó, false si aún tiene usuarios
 */
export async function resetSlotCategoryIfEmpty(timeSlotId: string): Promise<boolean> {
  // Contar bookings activos (NO cancelados)
  const activeBookings = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM Booking 
    WHERE timeSlotId = ${timeSlotId}
    AND status IN ('PENDING', 'CONFIRMED')
  ` as Array<{ count: number }>;

  const count = activeBookings[0]?.count || 0;

  // Si no hay usuarios, resetear nivel y categoría
  if (count === 0) {
    console.log(`🔄 TimeSlot ${timeSlotId} sin usuarios - reseteando nivel y categoría...`);

    await prisma.$executeRaw`
      UPDATE TimeSlot
      SET genderCategory = NULL,
      level = 'abierto',
      levelRange = NULL,
      updatedAt = datetime('now')
    WHERE id = ${timeSlotId}
    `;

    console.log(`✅ TimeSlot reseteado a valores por defecto (level='abierto', genderCategory=NULL, levelRange=NULL)`);
    return true;
  }

  console.log(`ℹ️ TimeSlot ${timeSlotId} tiene ${count} usuario(s) - NO se resetea`);
  return false;
}

/**
 * Elimina una Partida (MatchGame) si no tienen usuarios inscritos (activos).
 * Se usa cuando se cancela una reserva y la partida queda vacía.
 * 
 * @param matchGameId - ID del MatchGame a verificar
 */
export async function deleteMatchGameIfEmpty(matchGameId: string): Promise<void> {
  // Contar bookings activos (PENDING o CONFIRMED)
  const activeBookings = await prisma.matchGameBooking.count({
    where: {
      matchGameId,
      status: { in: ['PENDING', 'CONFIRMED'] }
    }
  });

  if (activeBookings === 0) {
    console.log(`🗑️ MatchGame ${matchGameId} está vacío (0 reservas activas) - Eliminando...`);

    // Primero eliminar los bookings cancelados asociados para evitar errores de FK (si no hay cascade)
    // O si hay cascade, el delete del matchGame se encarga.
    // Asumimos seguridad y borramos bookings cancelados primero.
    try {
      await prisma.matchGameBooking.deleteMany({
        where: { matchGameId }
      });

      await prisma.matchGame.delete({
        where: { id: matchGameId }
      });

      console.log(`✅ MatchGame ${matchGameId} eliminado correctamente.`);
    } catch (error) {
      console.error(`❌ Error eliminando MatchGame vacío ${matchGameId}:`, error);
    }
  } else {
    console.log(`ℹ️ MatchGame ${matchGameId} tiene ${activeBookings} reservas activas - NO se elimina.`);
  }
}
