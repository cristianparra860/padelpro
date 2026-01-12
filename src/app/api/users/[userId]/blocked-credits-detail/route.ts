import { NextRequest, NextResponse } from 'next/server';
import { getBlockedCreditsBreakdown, updateUserBlockedCredits } from '@/lib/blockedCredits';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> } // Params must now be awaited in Next.js 15+
) {
    try {
        const { userId } = await params;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // ✅ FORCE SYNC: Ensure DB value matches new "Sum of Max" logic
        await updateUserBlockedCredits(userId);

        const breakdown = await getBlockedCreditsBreakdown(userId);

        return NextResponse.json({
            success: true,
            breakdown
        });

    } catch (error) {
        console.error('Error fetching blocked credits breakdown:', error);
        return NextResponse.json({
            error: 'Error interno del servidor',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
