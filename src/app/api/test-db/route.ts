
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        status: 'success',
        message: 'Test route deployed successfully (No Prisma)',
        timestamp: new Date().toISOString()
    });
}
