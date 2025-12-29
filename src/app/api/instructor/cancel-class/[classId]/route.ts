// src/app/api/instructor/cancel-class/[classId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateUserBlockedCredits } from '@/lib/blockedCredits';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await context.params;
    
    console.log('🔴 API cancel-class - Recibida petición para clase:', classId);

    // Verificar que la clase existe
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: classId },
      include: {
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED']
            }
          },
          include: {
            user: true
          }
        }
      }
    });

    if (!timeSlot) {
      console.log('❌ Clase no encontrada:', classId);
      return NextResponse.json(
        { error: 'Clase no encontrada' },
        { status: 404 }
      );
    }
    
    console.log('✅ Clase encontrada:', {
      id: timeSlot.id,
      start: timeSlot.start,
      courtId: timeSlot.courtId,
      bookings: timeSlot.bookings.length
    });

    // Procesar reembolsos para cada reserva
    const refundedUsers: string[] = [];
    
    // Convertir timestamp BigInt a Date para descripción
    const classDate = new Date(Number(timeSlot.start)).toLocaleDateString('es-ES');
    
    console.log('🔄 Procesando reembolsos para', timeSlot.bookings.length, 'reservas');
    
    for (const booking of timeSlot.bookings) {
      try {
        console.log('💰 Procesando reembolso para booking:', {
          id: booking.id,
          userId: booking.userId,
          groupSize: booking.groupSize,
          status: booking.status,
          paymentMethod: booking.paymentMethod,
          paidWithPoints: booking.paidWithPoints
        });
        
        // Calcular monto a reembolsar
        const pricePerPerson = Math.ceil((timeSlot.totalPrice || 25) / booking.groupSize);
        const amountToRefund = pricePerPerson * 100; // Convertir a céntimos
        
        console.log('💵 Monto a reembolsar:', {
          pricePerPerson,
          amountToRefund,
          totalPrice: timeSlot.totalPrice
        });

        if (booking.paymentMethod === 'POINTS' || booking.paidWithPoints) {
          console.log('🎁 Reembolsando PUNTOS');
          // Devolver puntos
          const updatedUser = await prisma.user.update({
            where: { id: booking.userId },
            data: {
              points: {
                increment: pricePerPerson // Los puntos son 1:1 con euros
              }
            },
            select: { points: true }
          });
          
          console.log('✅ Puntos devueltos. Nuevo balance:', updatedUser.points);
          
          // Crear transacción de reembolso de puntos
          await prisma.transaction.create({
            data: {
              userId: booking.userId,
              amount: Number(pricePerPerson),
              balance: Number(updatedUser.points),
              type: 'points',
              action: 'refund',
              concept: `Reembolso por cancelación de clase por instructor - ${classDate}`,
              relatedId: classId,
              relatedType: 'booking'
            }
          });
        } else {
          console.log('💳 Reembolsando CRÉDITOS');
          // Devolver créditos en céntimos (solo incrementar credits, no tocar blockedCredits)
          // Las reservas CONFIRMED no tienen crédito bloqueado, se liberó al confirmar
          const updatedUser = await prisma.user.update({
            where: { id: booking.userId },
            data: {
              credits: {
                increment: amountToRefund
              }
            },
            select: { credits: true }
          });
          
          console.log('✅ Créditos devueltos. Nuevo balance:', updatedUser.credits);
          
          // Crear transacción de reembolso de créditos
          await prisma.transaction.create({
            data: {
              userId: booking.userId,
              amount: Number(amountToRefund),
              balance: Number(updatedUser.credits),
              type: 'credit',
              action: 'refund',
              concept: `Reembolso por cancelación de clase por instructor - ${classDate}`,
              relatedId: classId,
              relatedType: 'booking'
            }
          });
        }

        // Marcar reserva como CANCELLED
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED',
            isRecycled: false
          }
        });

        // Recalcular blockedCredits del usuario (limpia créditos bloqueados de reservas canceladas)
        await updateUserBlockedCredits(booking.userId);

        refundedUsers.push(booking.user.name || booking.user.email);
      } catch (error) {
        console.error(`Error procesando reembolso para usuario ${booking.userId}:`, error);
      }
    }

    // Eliminar las reservas canceladas para evitar errores de foreign key
    await prisma.booking.deleteMany({
      where: {
        timeSlotId: classId,
        status: 'CANCELLED'
      }
    });

    // Eliminar el TimeSlot para que la clase desaparezca del panel
    await prisma.timeSlot.delete({
      where: { id: classId }
    });

    console.log('✅ Clase anulada y eliminada:', {
      classId,
      refundedUsers: refundedUsers.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Clase anulada. ${refundedUsers.length} alumno(s) reembolsado(s)`,
      refundedUsers
    });

  } catch (error) {
    console.error('❌ Error anulando clase:', error);
    return NextResponse.json(
      { error: 'Error al anular la clase' },
      { status: 500 }
    );
  }
}
