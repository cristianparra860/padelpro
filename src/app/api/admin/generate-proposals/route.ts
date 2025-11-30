import { NextRequest, NextResponse } from 'next/server';
import { generateClassProposals, cleanOldProposals } from '@/lib/classProposalGenerator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/generate-proposals
 * Genera propuestas de clases para los próximos días
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Solicitud de generación de propuestas recibida');

    // Obtener parámetros de la solicitud
    const body = await request.json().catch(() => ({}));
    const daysAhead = body.daysAhead || 7;
    const clubId = body.clubId || 'padel-estrella-madrid';
    const cleanOld = body.cleanOld ?? true;

    // Limpiar propuestas antiguas si se solicita
    if (cleanOld) {
      console.log('🧹 Limpiando propuestas antiguas...');
      await cleanOldProposals();
    }

    // Generar nuevas propuestas
    console.log(`📅 Generando propuestas para ${daysAhead} días...`);
    const result = await generateClassProposals(daysAhead, clubId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        stats: result.stats,
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        stats: result.stats,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Error en generación de propuestas:', error);
    return NextResponse.json({
      success: false,
      message: `Error: ${error}`,
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/generate-proposals
 * Obtiene el estado de las propuestas
 */
export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma');
    
    // Contar propuestas actuales
    const totalProposals = await prisma.timeSlot.count({
      where: {
        courtId: null,
        start: {
          gte: new Date(),
        },
      },
    });

    // Contar por día
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);

    const proposalsByDay = await prisma.$queryRaw<Array<{ day: string; count: number }>>`
      SELECT 
        DATE(start / 1000, 'unixepoch') as day,
        COUNT(*) as count
      FROM TimeSlot
      WHERE courtId IS NULL
        AND start >= ${today.getTime()}
        AND start < ${next7Days.getTime()}
      GROUP BY DATE(start / 1000, 'unixepoch')
      ORDER BY day
    `;

    return NextResponse.json({
      success: true,
      totalProposals,
      proposalsByDay,
    });
  } catch (error) {
    console.error('Error obteniendo estado:', error);
    return NextResponse.json({
      success: false,
      message: `Error: ${error}`,
    }, { status: 500 });
  }
}
