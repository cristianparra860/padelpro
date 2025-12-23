// src/app/api/instructor/cancel-class/[classId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const { classId } = params;

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
      return NextResponse.json(
        { error: 'Clase no encontrada' },
        { status: 404 }
      );
    }

    // Procesar reembolsos para cada reserva
    const refundedUsers: string[] = [];
    
    for (const booking of timeSlot.bookings) {
      try {
        // Calcular monto a reembolsar
        const pricePerPerson = Math.ceil((timeSlot.totalPrice || 25) / booking.groupSize);
        const amountToRefund = pricePerPerson * 100; // Convertir a céntimos

        if (booking.paymentMethod === 'POINTS') {
          // Devolver puntos
          await prisma.user.update({
            where: { id: booking.userId },
            data: {
              loyaltyPoints: {
                increment: pricePerPerson // Los puntos son 1:1 con euros
              }
            }
          });

          // Crear transacción de reembolso de puntos
          await prisma.transaction.create({
            data: {
              userId: booking.userId,
              amount: pricePerPerson,
              type: 'POINTS_EARNED',
              description: `Reembolso por cancelación de clase por instructor - ${new Date(timeSlot.start).toLocaleDateString('es-ES')}`,
              relatedActivityId: classId,
              clubId: timeSlot.clubId
            }
          });
        } else {
          // Devolver créditos en céntimos
          await prisma.user.update({
            where: { id: booking.userId },
            data: {
              credit: {
                increment: amountToRefund
              },
              blockedCredit: {
                decrement: amountToRefund
              }
            }
          });

          // Crear transacción de reembolso de créditos
          await prisma.transaction.create({
            data: {
              userId: booking.userId,
              amount: amountToRefund,
              type: 'REFUND',
              description: `Reembolso por cancelación de clase por instructor - ${new Date(timeSlot.start).toLocaleDateString('es-ES')}`,
              relatedActivityId: classId,
              clubId: timeSlot.clubId
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

        refundedUsers.push(booking.user.name || booking.user.email);
      } catch (error) {
        console.error(`Error procesando reembolso para usuario ${booking.userId}:`, error);
      }
    }

    // Eliminar el TimeSlot o marcarlo como cancelado
    // Opción 1: Eliminar completamente
    await prisma.timeSlot.delete({
      where: { id: classId }
    });

    // Opción 2 (comentada): Marcar como cancelado
    // await prisma.timeSlot.update({
    //   where: { id: classId },
    //   data: { courtId: null } // Esto lo hace no visible en listados
    // });

    console.log('✅ Clase anulada:', {
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
