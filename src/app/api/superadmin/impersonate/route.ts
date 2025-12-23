// src/app/api/superadmin/impersonate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST - Iniciar impersonation
 * Super Admin puede suplantar la identidad de cualquier usuario
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { superAdminId, targetUserId, reason } = body;

    console.log('🔍 Impersonation request:', { superAdminId, targetUserId, reason });

    // Validaciones
    if (!superAdminId || !targetUserId) {
      return NextResponse.json(
        { error: 'superAdminId y targetUserId son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el superAdmin existe y tiene rol SUPER_ADMIN
    const superAdmin = await prisma.user.findUnique({
      where: { id: String(superAdminId) },
      select: { id: true, email: true, role: true, name: true }
    });

    console.log('👤 Super Admin encontrado:', superAdmin);

    if (!superAdmin || superAdmin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Usuario no autorizado para realizar impersonation' },
        { status: 403 }
      );
    }

    // Verificar que el usuario target existe
    console.log('🎯 Buscando target user con ID:', targetUserId, 'tipo:', typeof targetUserId);
    
    let targetUser = await prisma.user.findUnique({
      where: { id: String(targetUserId) },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    // Si no se encontró por ID, intentar buscar por email (para admins de la tabla Admin)
    if (!targetUser) {
      console.log('🔍 No se encontró por ID, intentando buscar por email en tabla Admin...');
      const adminRecord = await prisma.admin.findUnique({
        where: { id: String(targetUserId) }
      });

      if (adminRecord) {
        console.log(`📧 Admin encontrado: ${adminRecord.email}, buscando User correspondiente...`);
        targetUser = await prisma.user.findFirst({
          where: { 
            email: adminRecord.email,
            role: { in: ['CLUB_ADMIN', 'SUPER_ADMIN'] }
          },
          include: {
            club: {
              select: {
                id: true,
                name: true,
                address: true
              }
            }
          }
        });
      }
    }

    console.log('🎯 Target User encontrado:', targetUser ? `${targetUser.name} (${targetUser.email})` : 'NO ENCONTRADO');

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuario objetivo no encontrado. Asegúrate de que existe un User con el mismo email del Admin.' },
        { status: 404 }
      );
    }

    // Obtener información de la request
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Crear registro en el log de impersonation
    const impersonationLog = await prisma.impersonationLog.create({
      data: {
        superAdminId: superAdmin.id,
        superAdminEmail: superAdmin.email,
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        targetUserRole: targetUser.role,
        ipAddress,
        userAgent,
        reason: reason || 'Sin razón especificada'
      }
    });

    console.log(`🎭 IMPERSONATION INICIADO: ${superAdmin.email} -> ${targetUser.email} (Log ID: ${impersonationLog.id})`);

    // Retornar información completa del usuario target y el log ID
    return NextResponse.json({
      success: true,
      message: `Ahora estás viendo como ${targetUser.name}`,
      impersonationLogId: impersonationLog.id,
      originalUser: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role
      },
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        clubId: targetUser.clubId,
        clubName: targetUser.club?.name,
        profilePictureUrl: targetUser.profilePictureUrl,
        phone: targetUser.phone,
        level: targetUser.level,
        credits: targetUser.credits,
        points: targetUser.points
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌❌❌ Error en impersonation:', error);
    console.error('Stack:', error.stack);
    console.error('Message:', error.message);
    return NextResponse.json(
      { 
        error: 'Error al iniciar impersonation',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Terminar impersonation
 * Restaurar la sesión del super admin original
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('logId');
    const superAdminId = searchParams.get('superAdminId');

    if (!logId) {
      return NextResponse.json(
        { error: 'logId es requerido' },
        { status: 400 }
      );
    }

    // Buscar el log de impersonation
    const log = await prisma.impersonationLog.findUnique({
      where: { id: logId }
    });

    if (!log) {
      return NextResponse.json(
        { error: 'Log de impersonation no encontrado' },
        { status: 404 }
      );
    }

    // Calcular duración en minutos
    const endedAt = new Date();
    const durationMinutes = Math.round(
      (endedAt.getTime() - log.startedAt.getTime()) / 1000 / 60
    );

    // Actualizar el log con la fecha de fin
    await prisma.impersonationLog.update({
      where: { id: logId },
      data: {
        endedAt,
        durationMinutes
      }
    });

    console.log(`🎭 IMPERSONATION TERMINADO: ${log.superAdminEmail} <- ${log.targetUserEmail} (Duración: ${durationMinutes} min)`);

    // Obtener información del super admin para restaurar
    const superAdmin = await prisma.user.findUnique({
      where: { id: log.superAdminId },
      include: {
        club: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!superAdmin) {
      return NextResponse.json(
        { error: 'Super Admin no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Has vuelto a tu sesión como ${superAdmin.name}`,
      duration: `${durationMinutes} minutos`,
      restoredUser: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role,
        clubId: superAdmin.clubId,
        clubName: superAdmin.club?.name,
        profilePictureUrl: superAdmin.profilePictureUrl
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error al terminar impersonation:', error);
    return NextResponse.json(
      { error: 'Error al terminar impersonation' },
      { status: 500 }
    );
  }
}

/**
 * GET - Obtener logs de impersonation (para auditoría)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const superAdminId = searchParams.get('superAdminId');
    const targetUserId = searchParams.get('targetUserId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let whereClause: any = {};

    if (superAdminId) {
      whereClause.superAdminId = superAdminId;
    }

    if (targetUserId) {
      whereClause.targetUserId = targetUserId;
    }

    const logs = await prisma.impersonationLog.findMany({
      where: whereClause,
      orderBy: {
        startedAt: 'desc'
      },
      take: limit
    });

    // Calcular estadísticas
    const totalImpersonations = logs.length;
    const activeImpersonations = logs.filter(log => !log.endedAt).length;
    const avgDuration = logs
      .filter(log => log.durationMinutes)
      .reduce((sum, log) => sum + (log.durationMinutes || 0), 0) / 
      (logs.filter(log => log.durationMinutes).length || 1);

    return NextResponse.json({
      logs,
      stats: {
        total: totalImpersonations,
        active: activeImpersonations,
        avgDurationMinutes: Math.round(avgDuration)
      }
    });

  } catch (error) {
    console.error('Error al obtener logs:', error);
    return NextResponse.json(
      { error: 'Error al obtener logs de impersonation' },
      { status: 500 }
    );
  }
}
