import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  hasAvailableCredits, 
  updateUserBlockedCredits
} from '@/lib/blockedCredits';
import { createTransaction } from '@/lib/transactionLogger';

// 🚫 Cancelar otras inscripciones del mismo día (clases Y partidas)
async function cancelOtherActivitiesOnSameDay(userId: string, confirmedMatchGameId: string, prisma: any) {
  console.log(`\n🚨 CANCELAR OTRAS ACTIVIDADES DEL MISMO DÍA`);
  console.log(`🔍 Usuario: ${userId}`);
  console.log(`🔍 MatchGame confirmado: ${confirmedMatchGameId}`);
  
  // Obtener fecha del match confirmado
  const confirmedMatch = await prisma.matchGame.findUnique({
    where: { id: confirmedMatchGameId },
    select: { start: true }
  });
  
  if (!confirmedMatch) return;
  
  const matchDate = new Date(confirmedMatch.start);
  const startOfDayDate = new Date(Date.UTC(matchDate.getUTCFullYear(), matchDate.getUTCMonth(), matchDate.getUTCDate(), 0, 0, 0, 0));
  const endOfDayDate = new Date(Date.UTC(matchDate.getUTCFullYear(), matchDate.getUTCMonth(), matchDate.getUTCDate(), 23, 59, 59, 999));
  const startTimestamp = startOfDayDate.getTime();
  const endTimestamp = endOfDayDate.getTime();
  
  console.log(`📅 Rango de timestamps: ${startTimestamp} - ${endTimestamp}`);
  
  // Buscar otras inscripciones en CLASES
  const otherClassBookings = await prisma.$queryRaw`
    SELECT b.id, b.userId, b.timeSlotId, b.amountBlocked, b.status, b.paidWithPoints, b.pointsUsed, ts.start
    FROM Booking b
    JOIN TimeSlot ts ON b.timeSlotId = ts.id
    WHERE b.userId = ${userId}
    AND b.status IN ('PENDING', 'CONFIRMED')
    AND ts.start >= ${startTimestamp}
    AND ts.start <= ${endTimestamp}
  ` as Array<any>;
  
  // Buscar otras inscripciones en PARTIDAS
  const otherMatchBookings = await prisma.matchGameBooking.findMany({
    where: {
      userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      matchGameId: { not: confirmedMatchGameId },
      matchGame: {
        start: { gte: startOfDayDate, lte: endOfDayDate }
      }
    },
    include: {
      matchGame: { select: { start: true } }
    }
  });
  
  console.log(`📊 Otras inscripciones encontradas:`);
  console.log(`   - Clases: ${otherClassBookings.length}`);
  console.log(`   - Partidas: ${otherMatchBookings.length}`);
  
  // Cancelar inscripciones en clases
  for (const booking of otherClassBookings) {
    const amountBlocked = Number(booking.amountBlocked);
    const pointsBlocked = Number(booking.pointsUsed || 0);
    const isPaidWithPoints = booking.paidWithPoints;
    
    console.log(`   🗑️ Cancelando clase ${booking.id}`);
    
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' }
    });
    
    // Devolver créditos/puntos bloqueados
    if (booking.status === 'CONFIRMED') {
      if (isPaidWithPoints) {
        await prisma.user.update({
          where: { id: userId },
          data: { points: { increment: pointsBlocked } }
        });
        
        await createTransaction({
          userId,
          type: 'points',
          action: 'refund',
          amount: pointsBlocked,
          concept: `Reembolso por conflicto con partida ${confirmedMatchGameId}`,
          relatedId: booking.id,
          relatedType: 'booking'
        });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { 
            credits: { increment: amountBlocked },
            blockedCredits: { decrement: amountBlocked }
          }
        });
        
        await createTransaction({
          userId,
          type: 'credit',
          action: 'unblock',
          amount: amountBlocked / 100,
          concept: `Desbloqueo por conflicto con partida ${confirmedMatchGameId}`,
          relatedId: booking.id,
          relatedType: 'booking'
        });
      }
    } else {
      // PENDING: solo desbloquear
      if (isPaidWithPoints) {
        await prisma.user.update({
          where: { id: userId },
          data: { blockedPoints: { decrement: pointsBlocked } }
        });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { blockedCredits: { decrement: amountBlocked } }
        });
      }
    }
  }
  
  // Cancelar inscripciones en partidas
  for (const booking of otherMatchBookings) {
    const amountBlocked = Number(booking.amountBlocked);
    const pointsBlocked = Number(booking.pointsUsed || 0);
    
    console.log(`   🗑️ Cancelando partida ${booking.id}`);
    
    await prisma.matchGameBooking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' }
    });
    
    // Devolver créditos/puntos bloqueados
    if (booking.status === 'CONFIRMED') {
      if (booking.paidWithPoints) {
        await prisma.user.update({
          where: { id: userId },
          data: { points: { increment: pointsBlocked } }
        });
        
        await createTransaction({
          userId,
          type: 'points',
          action: 'refund',
          amount: pointsBlocked,
          concept: `Reembolso por conflicto con partida ${confirmedMatchGameId}`,
          relatedId: booking.id,
          relatedType: 'matchGameBooking'
        });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { 
            credits: { increment: amountBlocked },
            blockedCredits: { decrement: amountBlocked }
          }
        });
        
        await createTransaction({
          userId,
          type: 'credit',
          action: 'unblock',
          amount: amountBlocked / 100,
          concept: `Desbloqueo por conflicto con partida ${confirmedMatchGameId}`,
          relatedId: booking.id,
          relatedType: 'matchGameBooking'
        });
      }
    } else {
      // PENDING: solo desbloquear
      if (booking.paidWithPoints) {
        await prisma.user.update({
          where: { id: userId },
          data: { blockedPoints: { decrement: pointsBlocked } }
        });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { blockedCredits: { decrement: amountBlocked } }
        });
      }
    }
  }
}

// 🎯 Generar nueva partida abierta cuando se clasifica una
async function generateNewOpenMatchGame(originalMatchGame: any, prisma: any) {
  console.log(`\n🎾 GENERANDO NUEVA PARTIDA ABIERTA`);
  
  const newMatchGame = await prisma.matchGame.create({
    data: {
      clubId: originalMatchGame.clubId,
      start: originalMatchGame.start,
      end: originalMatchGame.end,
      duration: originalMatchGame.duration,
      maxPlayers: 4,
      courtRentalPrice: originalMatchGame.courtRentalPrice,
      pricePerPlayer: originalMatchGame.pricePerPlayer,
      isOpen: true, // Nueva partida ABIERTA
      creditsCost: originalMatchGame.creditsCost
    }
  });
  
  console.log(`✅ Nueva partida abierta creada: ${newMatchGame.id}`);
  return newMatchGame;
}

// 🏆 Cancelar partidas competidoras del mismo horario (sistema de carrera)
async function cancelCompetingMatches(confirmedMatchGameId: string, prisma: any) {
  console.log(`\n🏁 CANCELAR PARTIDAS COMPETIDORAS - Sistema de Carrera`);
  console.log(`🔍 Partida ganadora: ${confirmedMatchGameId}`);
  
  // Obtener información de la partida confirmada
  const confirmedMatch = await prisma.matchGame.findUnique({
    where: { id: confirmedMatchGameId },
    select: { 
      start: true, 
      end: true, 
      clubId: true,
      courtNumber: true
    }
  });
  
  if (!confirmedMatch) return;
  
  const startTimestamp = new Date(confirmedMatch.start).getTime();
  const endTimestamp = new Date(confirmedMatch.end).getTime();
  
  console.log(`📅 Horario: ${new Date(startTimestamp).toLocaleString()} - ${new Date(endTimestamp).toLocaleString()}`);
  
  // Buscar todas las partidas del MISMO HORARIO que NO están confirmadas
  const competingMatches = await prisma.matchGame.findMany({
    where: {
      clubId: confirmedMatch.clubId,
      id: { not: confirmedMatchGameId }, // Excluir la partida ganadora
      courtNumber: null, // Solo partidas SIN pista asignada (perdedoras)
      start: { gte: new Date(startTimestamp) },
      end: { lte: new Date(endTimestamp) }
    },
    include: {
      bookings: {
        where: { status: { in: ['PENDING', 'CONFIRMED'] } },
        include: { user: true }
      }
    }
  });
  
  console.log(`🎯 Partidas competidoras encontradas: ${competingMatches.length}`);
  
  // Cancelar cada partida competidora
  for (const match of competingMatches) {
    console.log(`\n❌ Cancelando partida perdedora: ${match.id}`);
    console.log(`   - Jugadores inscritos: ${match.bookings.length}/${match.maxPlayers}`);
    
    // Cancelar todos los bookings de esta partida
    for (const booking of match.bookings) {
      console.log(`   🔄 Reembolsando a ${booking.user.name}`);
      
      // Actualizar estado del booking a CANCELLED
      await prisma.matchGameBooking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' }
      });
      
      // Reembolsar créditos o puntos
      if (booking.paidWithPoints) {
        // Devolver puntos bloqueados
        await prisma.user.update({
          where: { id: booking.userId },
          data: { 
            blockedPoints: { decrement: booking.pointsUsed }
          }
        });
        
        await createTransaction({
          userId: booking.userId,
          type: 'points',
          action: 'unblock',
          amount: booking.pointsUsed,
          concept: `Reembolso por partida perdedora ${match.id} (ganó ${confirmedMatchGameId})`,
          relatedId: booking.id,
          relatedType: 'matchGameBooking'
        });
      } else {
        // Devolver créditos bloqueados
        await prisma.user.update({
          where: { id: booking.userId },
          data: { 
            blockedCredits: { decrement: booking.amountBlocked }
          }
        });
        
        await createTransaction({
          userId: booking.userId,
          type: 'credit',
          action: 'unblock',
          amount: booking.amountBlocked / 100,
          concept: `Reembolso por partida perdedora ${match.id} (ganó ${confirmedMatchGameId})`,
          relatedId: booking.id,
          relatedType: 'matchGameBooking'
        });
      }
    }
    
    console.log(`   ✅ Partida ${match.id} cancelada con ${match.bookings.length} reembolsos`);
  }
  
  console.log(`\n🏆 Carrera completada - ${competingMatches.length} partidas perdedoras canceladas`);
}

export async function POST(request: Request) {
  try {
    const { matchGameId, userId, paymentMethod = 'CREDITS' } = await request.json();
    
    console.log('\n🎾 === BOOKING MATCH GAME ===');
    console.log('📝 Datos recibidos:', { matchGameId, userId, paymentMethod });
    
    if (!matchGameId || !userId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }
    
    // Obtener información del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        name: true, 
        level: true, 
        gender: true,
        credits: true,
        blockedCredits: true,
        points: true,
        blockedPoints: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    
    console.log(`👤 Usuario: ${user.name} - Nivel: ${user.level} - Género: ${user.gender || 'no definido'}`);
    
    // Obtener información de la partida
    const matchGame = await prisma.matchGame.findUnique({
      where: { id: matchGameId },
      include: {
        bookings: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            user: {
              select: { id: true, name: true, level: true, gender: true }
            }
          }
        }
      }
    });
    
    if (!matchGame) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 });
    }
    
    // 🔢 GUARDAR el número de jugadores ANTES de añadir el nuevo
    const previousBookingsCount = matchGame.bookings.length;
    const isFirstPlayer = matchGame.isOpen && previousBookingsCount === 0;
    
    console.log(`🎾 Partida: ${matchGame.id}`);
    console.log(`   - isOpen: ${matchGame.isOpen}`);
    console.log(`   - level: ${matchGame.level || 'sin definir'}`);
    console.log(`   - genderCategory: ${matchGame.genderCategory || 'sin definir'}`);
    console.log(`   - Jugadores inscritos: ${previousBookingsCount}/${matchGame.maxPlayers}`);
    console.log(`   - Es primer jugador: ${isFirstPlayer}`);
    
    // Verificar si ya está inscrito
    const existingBooking = matchGame.bookings.find(b => b.userId === userId);
    if (existingBooking) {
      return NextResponse.json(
        { error: 'Ya estás inscrito en esta partida' },
        { status: 400 }
      );
    }
    
    // Verificar si la partida ya está completa
    if (previousBookingsCount >= matchGame.maxPlayers) {
      return NextResponse.json(
        { error: 'Partida completa' },
        { status: 400 }
      );
    }
    
    // Si la partida NO es abierta, verificar compatibilidad de nivel y género
    if (!matchGame.isOpen) {
      // Verificar nivel
      if (matchGame.level) {
        const userLevelNum = parseFloat(user.level);
        const [minLevel, maxLevel] = matchGame.level.split('-').map(Number);
        
        if (userLevelNum < minLevel || userLevelNum > maxLevel) {
          return NextResponse.json(
            { error: `Tu nivel (${user.level}) no es compatible con esta partida (${matchGame.level})` },
            { status: 400 }
          );
        }
      }
      
      // Verificar género
      if (matchGame.genderCategory && matchGame.genderCategory !== 'mixto') {
        if (!user.gender || user.gender !== matchGame.genderCategory) {
          return NextResponse.json(
            { error: `Tu género no es compatible con esta partida (${matchGame.genderCategory})` },
            { status: 400 }
          );
        }
      }
    }
    
    // Calcular precio a bloquear
    const priceToBlock = Math.round(matchGame.pricePerPlayer * 100); // En céntimos
    
    // Verificar fondos según método de pago
    if (paymentMethod === 'CREDITS') {
      const availableCredits = user.credits - user.blockedCredits;
      if (availableCredits < priceToBlock) {
        return NextResponse.json(
          { error: 'Créditos insuficientes' },
          { status: 400 }
        );
      }
    } else if (paymentMethod === 'POINTS') {
      const availablePoints = user.points - user.blockedPoints;
      if (availablePoints < matchGame.creditsCost) {
        return NextResponse.json(
          { error: 'Puntos insuficientes' },
          { status: 400 }
        );
      }
    }
    
    // Crear booking
    const booking = await prisma.matchGameBooking.create({
      data: {
        matchGameId,
        userId,
        status: 'PENDING',
        paidWithPoints: paymentMethod === 'POINTS',
        paymentMethod,
        pointsUsed: paymentMethod === 'POINTS' ? matchGame.creditsCost : 0,
        amountBlocked: paymentMethod === 'CREDITS' ? priceToBlock : 0
      }
    });
    
    console.log(`✅ Booking creado: ${booking.id}`);
    
    // Bloquear fondos
    if (paymentMethod === 'CREDITS') {
      await prisma.user.update({
        where: { id: userId },
        data: { blockedCredits: { increment: priceToBlock } }
      });
      
      await createTransaction({
        userId,
        type: 'credit',
        action: 'block',
        amount: priceToBlock / 100,
        concept: `Reserva de partida ${matchGameId}`,
        relatedId: booking.id,
        relatedType: 'matchGameBooking'
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { blockedPoints: { increment: matchGame.creditsCost } }
      });
      
      await createTransaction({
        userId,
        type: 'points',
        action: 'block',
        amount: matchGame.creditsCost,
        concept: `Reserva de partida ${matchGameId}`,
        relatedId: booking.id,
        relatedType: 'matchGameBooking'
      });
    }
    
    // Si es el primer jugador de una partida abierta, clasificar la partida
    if (isFirstPlayer) {
      console.log(`\n🎯 PRIMER JUGADOR - CLASIFICANDO PARTIDA`);
      
      const userLevelNum = parseFloat(user.level);
      let levelRange = '0-7'; // Por defecto abierto a todos
      
      // Determinar rango de nivel (0.5 arriba y abajo del nivel del usuario)
      const minLevel = Math.max(0, userLevelNum - 0.5);
      const maxLevel = Math.min(7, userLevelNum + 0.5);
      levelRange = `${minLevel}-${maxLevel}`;
      
      await prisma.matchGame.update({
        where: { id: matchGameId },
        data: {
          isOpen: false,
          level: levelRange,
          genderCategory: user.gender || 'mixto'
        }
      });
      
      console.log(`   ✅ Partida clasificada: Nivel ${levelRange}, Género ${user.gender || 'mixto'}`);
      
      // Generar nueva partida abierta
      await generateNewOpenMatchGame(matchGame, prisma);
    }
    
    // Verificar si la partida se completó
    const updatedBookings = await prisma.matchGameBooking.count({
      where: {
        matchGameId,
        status: { not: 'CANCELLED' }
      }
    });
    
    if (updatedBookings >= matchGame.maxPlayers) {
      console.log(`\n🎉 PARTIDA COMPLETA - ASIGNANDO PISTA`);
      
      // Buscar pista disponible
      const club = await prisma.club.findUnique({
        where: { id: matchGame.clubId },
        include: { courts: { where: { isActive: true } } }
      });
      
      if (!club || club.courts.length === 0) {
        console.log('❌ No hay pistas disponibles');
        return NextResponse.json({ success: true, booking, message: 'Partida completa pero sin pista disponible' });
      }
      
      // Verificar disponibilidad de pistas (considerar TimeSlots Y MatchGames)
      const startTimestamp = new Date(matchGame.start).getTime();
      const endTimestamp = new Date(matchGame.end).getTime();
      
      // Pistas ocupadas por clases (TimeSlots)
      const occupiedCourtsByClasses = await prisma.$queryRaw`
        SELECT DISTINCT courtNumber FROM TimeSlot
        WHERE clubId = ${matchGame.clubId}
        AND courtNumber IS NOT NULL
        AND start >= ${startTimestamp}
        AND end <= ${endTimestamp}
      ` as Array<{ courtNumber: number }>;
      
      // Pistas ocupadas por partidas (MatchGames)
      const occupiedCourtsByMatches = await prisma.matchGame.findMany({
        where: {
          clubId: matchGame.clubId,
          courtNumber: { not: null },
          id: { not: matchGameId }, // Excluir la partida actual
          start: { gte: new Date(startTimestamp) },
          end: { lte: new Date(endTimestamp) }
        },
        select: { courtNumber: true }
      });
      
      const occupiedCourtNumbers = [
        ...occupiedCourtsByClasses.map(c => c.courtNumber),
        ...occupiedCourtsByMatches.map(c => c.courtNumber).filter(n => n !== null)
      ];
      
      const availableCourt = club.courts.find(c => !occupiedCourtNumbers.includes(c.number));
      
      if (!availableCourt) {
        console.log('❌ No hay pistas libres en este horario');
        
        // 🚨 NO HAY PISTAS DISPONIBLES - Cancelar TODAS las partidas incompletas de este horario
        console.log(`\n🚫 CANCELANDO TODAS LAS PARTIDAS INCOMPLETAS - Sin pistas disponibles`);
        
        const incompleteMatches = await prisma.matchGame.findMany({
          where: {
            clubId: matchGame.clubId,
            courtNumber: null, // Sin pista asignada
            start: { gte: new Date(startTimestamp) },
            end: { lte: new Date(endTimestamp) }
          },
          include: {
            bookings: {
              where: { status: { in: ['PENDING', 'CONFIRMED'] } },
              include: { user: true }
            }
          }
        });
        
        console.log(`📊 Partidas incompletas a cancelar: ${incompleteMatches.length}`);
        
        for (const match of incompleteMatches) {
          console.log(`\n❌ Cancelando partida ${match.id} (${match.bookings.length}/${match.maxPlayers} jugadores)`);
          
          for (const booking of match.bookings) {
            await prisma.matchGameBooking.update({
              where: { id: booking.id },
              data: { status: 'CANCELLED' }
            });
            
            // Reembolsar
            if (booking.paidWithPoints) {
              await prisma.user.update({
                where: { id: booking.userId },
                data: { blockedPoints: { decrement: booking.pointsUsed } }
              });
              
              await createTransaction({
                userId: booking.userId,
                type: 'points',
                action: 'unblock',
                amount: booking.pointsUsed,
                concept: `Reembolso - Sin pistas disponibles para ${new Date(match.start).toLocaleTimeString()}`,
                relatedId: booking.id,
                relatedType: 'matchGameBooking'
              });
            } else {
              await prisma.user.update({
                where: { id: booking.userId },
                data: { blockedCredits: { decrement: booking.amountBlocked } }
              });
              
              await createTransaction({
                userId: booking.userId,
                type: 'credit',
                action: 'unblock',
                amount: booking.amountBlocked / 100,
                concept: `Reembolso - Sin pistas disponibles para ${new Date(match.start).toLocaleTimeString()}`,
                relatedId: booking.id,
                relatedType: 'matchGameBooking'
              });
            }
          }
        }
        
        console.log(`✅ ${incompleteMatches.length} partidas canceladas por falta de pistas`);
        
        return NextResponse.json({ 
          success: false, 
          error: 'No hay pistas disponibles. Todas las partidas incompletas han sido canceladas con reembolso.',
          refunded: true
        }, { status: 400 });
      }
      
      // Asignar pista
      await prisma.matchGame.update({
        where: { id: matchGameId },
        data: {
          courtId: availableCourt.id,
          courtNumber: availableCourt.number
        }
      });
      
      // Confirmar todos los bookings
      await prisma.matchGameBooking.updateMany({
        where: {
          matchGameId,
          status: 'PENDING'
        },
        data: {
          status: 'CONFIRMED',
          wasConfirmed: true
        }
      });
      
      // Desbloquear y cobrar créditos/puntos
      const allBookings = await prisma.matchGameBooking.findMany({
        where: { matchGameId, status: 'CONFIRMED' }
      });
      
      for (const b of allBookings) {
        if (b.paidWithPoints) {
          await prisma.user.update({
            where: { id: b.userId },
            data: {
              blockedPoints: { decrement: b.pointsUsed },
              points: { decrement: b.pointsUsed }
            }
          });
          
          await createTransaction({
            userId: b.userId,
            type: 'points',
            action: 'subtract',
            amount: b.pointsUsed,
            concept: `Pago partida confirmada ${matchGameId}`,
            relatedId: b.id,
            relatedType: 'matchGameBooking'
          });
        } else {
          await prisma.user.update({
            where: { id: b.userId },
            data: {
              blockedCredits: { decrement: b.amountBlocked },
              credits: { decrement: b.amountBlocked }
            }
          });
          
          await createTransaction({
            userId: b.userId,
            type: 'credit',
            action: 'subtract',
            amount: b.amountBlocked / 100,
            concept: `Pago partida confirmada ${matchGameId}`,
            relatedId: b.id,
            relatedType: 'matchGameBooking'
          });
        }
        
        // Cancelar otras actividades del mismo día
        await cancelOtherActivitiesOnSameDay(b.userId, matchGameId, prisma);
      }
      
      // 🏁 CANCELAR PARTIDAS COMPETIDORAS DEL MISMO HORARIO (Sistema de Carrera)
      await cancelCompetingMatches(matchGameId, prisma);
      
      console.log(`✅ Partida confirmada en pista ${availableCourt.number}`);
      
      return NextResponse.json({
        success: true,
        booking,
        confirmed: true,
        courtNumber: availableCourt.number,
        message: '¡Partida confirmada! Pista asignada'
      });
    }
    
    return NextResponse.json({
      success: true,
      booking,
      confirmed: false,
      message: 'Inscripción realizada correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error en POST /api/matchgames/book:', error);
    return NextResponse.json(
      { error: 'Error al procesar la reserva', details: (error as Error).message },
      { status: 500 }
    );
  }
}
