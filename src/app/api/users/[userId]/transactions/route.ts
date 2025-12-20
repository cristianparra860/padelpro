import { NextRequest, NextResponse } from 'next/server';
import { getUserTransactions } from '@/lib/transactionLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const transactions = await getUserTransactions(userId, limit);
    
    // Parsear metadata de JSON string a object
    const parsedTransactions = transactions.map(tx => ({
      ...tx,
      metadata: tx.metadata ? JSON.parse(tx.metadata) : null,
      createdAt: tx.createdAt.toISOString()
    }));

    return NextResponse.json({ 
      success: true, 
      transactions: parsedTransactions 
    });
    
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    return NextResponse.json({ 
      error: 'Error fetching transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
