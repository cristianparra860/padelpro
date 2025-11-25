// API endpoint para obtener todas las propuestas de un TimeSlot (misma hora/fecha/club)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const start = searchParams.get('start'); // ISO timestamp
    const userLevel = searchParams.get('userLevel'); // Nivel del usuario actual
    const instructorId = searchParams.get('instructorId'); // 🆕 Filtro por instructor específico

    if (!clubId || !start) {
      return NextResponse.json(
        { error: 'Faltan parámetros: clubId y start son requeridos' },
        { status: 400 }
      );
    }

    console.log(`🔍 Buscando propuestas: clubId=${clubId}, start=${start}, userLevel=${userLevel}, instructorId=${instructorId}`);

    // Buscar TODAS las propuestas (courtId = NULL) para esta fecha/hora
    const startDate = new Date(start);
    const startTimestamp = startDate.getTime(); // ✅ CONVERTIR A TIMESTAMP INTEGER

    console.log(`📅 Buscando propuestas con start=${startTimestamp} (${startDate.toISOString()})`);

    // Usar raw SQL con timestamp INTEGER (SQLite almacena start como integer)
    // 🆕 Si hay instructorId, filtrar por ese instructor específico
    const proposals = instructorId 
      ? await prisma.$queryRawUnsafe(`
          SELECT * FROM TimeSlot
          WHERE clubId = '${clubId}'
          AND start = ${startTimestamp}
          AND courtId IS NULL
          AND instructorId = '${instructorId}'
        `)
      : await prisma.$queryRawUnsafe(`
          SELECT * FROM TimeSlot
          WHERE clubId = '${clubId}'
          AND start = ${startTimestamp}
          AND courtId IS NULL
        `);

    console.log(`✅ Encontradas ${proposals.length} propuestas${instructorId ? ` del instructor ${instructorId}` : ''}`);
    
    // Obtener instructores y bookings por separado
    if (proposals.length === 0) {
      return NextResponse.json({
        proposals: [],
        total: 0
      });
    }

    const timeSlotIds = proposals.map(p => p.id);
    const instructorIds = [...new Set(proposals.map(p => p.instructorId).filter(Boolean))];

    // Cargar instructores
    const instructors = await prisma.instructor.findMany({
      where: { id: { in: instructorIds } },
      include: { user: true }
    });

    const instructorMap = new Map(instructors.map(i => [i.id, i]));

    // Cargar bookings
    const bookings = await prisma.booking.findMany({
      where: {
        timeSlotId: { in: timeSlotIds },
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: { user: true },
      orderBy: { createdAt: 'asc' }
    });

    const bookingsBySlot = new Map<string, any[]>();
    bookings.forEach(b => {
      if (!bookingsBySlot.has(b.timeSlotId)) {
        bookingsBySlot.set(b.timeSlotId, []);
      }
      bookingsBySlot.get(b.timeSlotId)!.push(b);
    });

    console.log(`📋 Instructores: ${instructors.length}, Bookings: ${bookings.length}`);

    // Formatear propuestas
    const formattedProposals = proposals.map(timeSlot => {
      const instructor = instructorMap.get(timeSlot.instructorId);
      const slotBookings = bookingsBySlot.get(timeSlot.id) || [];
      
      const startDateObj = new Date(timeSlot.start);
      const endDateObj = new Date(timeSlot.end);
      const createdDate = new Date(timeSlot.createdAt);
      const updatedDate = new Date(timeSlot.updatedAt);

      return {
        id: timeSlot.id,
        clubId: timeSlot.clubId,
        instructorId: timeSlot.instructorId,
        start: startDateObj.toISOString(),
        end: endDateObj.toISOString(),
        startTime: startDateObj.toISOString(),
        endTime: endDateObj.toISOString(),
        maxPlayers: timeSlot.maxPlayers,
        totalPrice: timeSlot.totalPrice,
        instructorPrice: timeSlot.instructorPrice,
        courtRentalPrice: timeSlot.courtRentalPrice,
        level: timeSlot.level,
        category: timeSlot.category || 'general',
        genderCategory: timeSlot.genderCategory,
        createdAt: createdDate.toISOString(),
        updatedAt: updatedDate.toISOString(),
        instructorName: instructor?.user?.name || 'Instructor',
        instructorProfilePicture: instructor?.user?.profilePictureUrl,
        courtNumber: timeSlot.courtNumber,
        bookedPlayers: slotBookings.length,
        bookings: slotBookings.map(booking => {
          const bookingCreatedDate = new Date(booking.createdAt);
          
          return {
            id: booking.id,
            userId: booking.userId,
            name: booking.user?.name, // ✅ Nombre del usuario
            userName: booking.user?.name,
            profilePictureUrl: booking.user?.profilePictureUrl, // ✅ Foto de perfil
            userProfilePicture: booking.user?.profilePictureUrl,
            userLevel: booking.user?.level, // ✅ Nivel del usuario
            userGender: booking.user?.gender, // ✅ Género del usuario
            groupSize: booking.groupSize,
            status: booking.status,
            createdAt: bookingCreatedDate.toISOString()
          };
        }),
        description: ''
      };
    });

    // 🔓 MOSTRAR TODAS LAS PROPUESTAS - El usuario debe ver todas las opciones del horario seleccionado
    // El filtrado de nivel se aplica en la vista principal del calendario, NO en el popup de detalles
    let filteredProposals = formattedProposals;
    
    console.log(`📋 Mostrando todas las propuestas de este horario: ${formattedProposals.length}`)

    // Ordenar: primero las que tienen bookings, luego las vacías
    filteredProposals.sort((a, b) => {
      if (a.bookings.length > 0 && b.bookings.length === 0) return -1;
      if (a.bookings.length === 0 && b.bookings.length > 0) return 1;
      return 0;
    });

    return NextResponse.json({
      proposals: filteredProposals,
      total: filteredProposals.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo propuestas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
