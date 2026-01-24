
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'success',
        message: 'Test route deployed successfully (No Prisma)',
        timestamp: new Date().toISOString()
    });
}
