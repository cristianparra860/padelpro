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
 * @returns Monto en euros que debe estar bloqueado
 */
export async function calculateBlockedCredits(userId: string): Promise<number> {
  // Obtener todas las inscripciones pendientes del usuario donde el TimeSlot NO tenga pista asignada
  const pendingBookings = await prisma.booking.findMany({
    where: {
      userId,
      status: 'PENDING', // Solo las que están pendientes
      timeSlot: {
        courtId: null // Solo TimeSlots sin pista asignada (incompletas)
      }
    },
    select: {
      amountBlocked: true
    }
  });

  if (pendingBookings.length === 0) {
    return 0;
  }

  // Encontrar el monto MÁS ALTO (la clase más cara)
  const maxAmount = Math.max(...pendingBookings.map(b => b.amountBlocked || 0));

  return maxAmount;
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
 * @returns Saldo disponible en euros
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
 * @param amount - Monto requerido en euros
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
  await prisma.timeSlot.update({
    where: { id: timeSlotId },
    data: { hasRecycledSlots: true }
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
