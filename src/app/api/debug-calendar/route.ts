
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to check date overlap
function isOverlap(start1: Date, end1: Date, start2: Date, end2: Date) {
    return start1 < end2 && start2 < end1;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const clubId = searchParams.get('clubId');

        // Check 09:00 Local on 17 Jan 2026.
        // 09:00 Local = 08:00 UTC (assuming UTC+1 winter)
        const checkStart = new Date('2026-01-17T08:00:00.000Z');
        const checkEnd = new Date('2026-01-17T09:00:00.000Z');

        const searchStart = new Date('2026-01-17T00:00:00.000Z');
        const searchEnd = new Date('2026-01-17T23:59:59.999Z');

        const courts = await prisma.court.findMany({
            where: clubId ? { clubId, isActive: true } : { isActive: true },
            select: { id: true, number: true }
        });

        // Blocking Schedules
        const allBlockingSchedules = await prisma.courtSchedule.findMany({
            where: {
                startTime: { gte: searchStart, lte: searchEnd },
                isOccupied: true,
                ...(clubId && { court: { clubId } })
            },
            select: { startTime: true, endTime: true, courtId: true, reason: true }
        });

        const court3 = courts.find(c => c.number === 3);
        const court4 = courts.find(c => c.number === 4);

        const result: any = {
            checkInterval: { start: checkStart.toISOString(), end: checkEnd.toISOString() },
            schedulesCount: allBlockingSchedules.length,
            court3: { found: !!court3, conflicts: [] },
            court4: { found: !!court4, conflicts: [] }
        };

        if (court3) {
            const conflicts = allBlockingSchedules.filter(s =>
                s.courtId === court3.id && isOverlap(s.startTime, s.endTime, checkStart, checkEnd)
            );
            result.court3.conflicts = conflicts;
        }

        if (court4) {
            const conflicts = allBlockingSchedules.filter(s =>
                s.courtId === court4.id && isOverlap(s.startTime, s.endTime, checkStart, checkEnd)
            );
            result.court4.conflicts = conflicts;
        }

        return NextResponse.json(result);

    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
