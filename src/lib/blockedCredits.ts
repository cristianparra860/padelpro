// src/lib/blockedCredits.ts
// Utilidades para el sistema de bloqueo de saldo y reciclaje de plazas

import { prisma } from '@/lib/prisma';

/**
 * Calcula el saldo que debe estar bloqueado para un usuario.
 * 
 * Regla: Se bloquea la SUMA de TODAS las inscripciones pendientes (PENDING).
 * 
 * @param userId - ID del usuario
 * @returns Monto en céntimos que debe estar bloqueado
 */
export async function calculateBlockedCredits(userId: string): Promise<number> {
  // Obtener todas las inscripciones pendientes del usuario
  const pendingBookings = await prisma.booking.findMany({
    where: {
      userId,
      status: 'PENDING' // Solo las que están pendientes
    },
    select: {
      amountBlocked: true
    }
  });

  if (pendingBookings.length === 0) {
    return 0;
  }

  // Sumar todos los montos bloqueados
  const totalBlocked = pendingBookings.reduce((sum, booking) => {
    return sum + (booking.amountBlocked || 0);
  }, 0);

  return totalBlocked;
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
 * @returns Saldo disponible en céntimos
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
 * @param amount - Monto requerido en céntimos
 * @returns true si tiene saldo suficiente
 */
export async function hasAvailableCredits(userId: string, amount: number): Promise<boolean> {
  const available = await getAvailableCredits(userId);
  return available >= amount;
}

/**
 * Calcula el precio de una plaza según el tamaño del grupo.
 * 
 * @param totalPrice - Precio total de la clase (del TimeSlot)
 * @param groupSize - Número de jugadores en el grupo
 * @returns Precio por plaza en céntimos
 */
export function calculateSlotPrice(totalPrice: number, groupSize: number): number {
  // Convertir totalPrice (en euros) a céntimos
  const totalPriceCents = Math.round(totalPrice * 100);
  // Dividir entre el número de jugadores
  return Math.round(totalPriceCents / groupSize);
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
 * @param amount - Monto de la inscripción cancelada (en céntimos)
 * @returns Nuevos puntos del usuario
 */
export async function grantCompensationPoints(userId: string, amount: number): Promise<number> {
  // Convertir céntimos a euros para obtener los puntos (1€ = 1 punto)
  const pointsToGrant = Math.floor(amount / 100);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      points: {
        increment: pointsToGrant
      }
    }
  });

  return user.points;
}
