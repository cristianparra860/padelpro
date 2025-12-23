// src/app/api/superadmin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener estadísticas globales del sistema
export async function GET(request: NextRequest) {
  try {
    // Ejecutar todas las consultas en paralelo
    const [
      totalClubs,
      totalCourts,
      totalUsers,
      totalInstructors,
      totalBookings,
      totalAdmins,
      activeClubs
    ] = await Promise.all([
      prisma.club.count(),
      prisma.court.count(),
      prisma.user.count(),
      prisma.instructor.count(),
      prisma.booking.count(),
      prisma.admin.count(),
      prisma.club.count({ where: { courts: { some: { isActive: true } } } })
    ]);

    // Contar usuarios por rol
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });

    const roleStats = usersByRole.reduce((acc, curr) => {
      acc[curr.role] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    // Obtener bookings confirmados vs cancelados
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ['status'],
      _count: true
    });

    const bookingStats = bookingsByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    // Calcular créditos totales en el sistema
    const creditsSum = await prisma.user.aggregate({
      _sum: {
        credits: true,
        blockedCredits: true
      }
    });

    return NextResponse.json({
      stats: {
        clubs: {
          total: totalClubs,
          active: activeClubs
        },
        courts: {
          total: totalCourts
        },
        users: {
          total: totalUsers,
          byRole: roleStats
        },
        instructors: {
          total: totalInstructors
        },
        admins: {
          total: totalAdmins
        },
        bookings: {
          total: totalBookings,
          byStatus: bookingStats
        },
        credits: {
          total: creditsSum._sum.credits || 0,
          blocked: creditsSum._sum.blockedCredits || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener las estadísticas' },
      { status: 500 }
    );
  }
}
