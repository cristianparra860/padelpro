import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');

    // Construir el filtro basado en clubId
    const where = clubId ? { clubId } : {};

    const users = await prisma.user.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, role = 'PLAYER', level = 'principiante', clubId } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Si no se proporciona clubId, usar el primer club disponible
    let finalClubId = clubId;
    if (!finalClubId) {
      const firstClub = await prisma.club.findFirst();
      if (!firstClub) {
        return NextResponse.json(
          { error: 'No clubs available. Please create a club first.' },
          { status: 400 }
        );
      }
      finalClubId = firstClub.id;
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        level,
        clubId: finalClubId
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Manejar errores específicos
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, amount, concept } = body;

    console.log('📝 PATCH request received:', { userId, action, amount, concept });

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Si la acción es añadir crédito
    if (action === 'addCredit') {
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a positive number' },
          { status: 400 }
        );
      }

      console.log('🔍 Looking for user:', userId);

      // Buscar el usuario
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        console.error('❌ User not found:', userId);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      console.log('✅ User found:', { id: user.id, name: user.name, currentCredit: user.credits });

      // Calcular el nuevo balance
      const currentCredit = user.credits || 0;
      const newBalance = currentCredit + amount;

      console.log('💰 Updating credit:', { currentCredit, amount, newBalance });

      // Actualizar el crédito del usuario
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          credits: newBalance
        }
      });

      console.log('✅ Credit updated successfully:', {
        userId,
        userName: user.name,
        previousCredit: currentCredit,
        amountAdded: amount,
        newBalance: updatedUser.credits
      });

      return NextResponse.json({
        success: true,
        newBalance: updatedUser.credits,
        previousBalance: currentCredit,
        amountAdded: amount,
        user: updatedUser
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('❌ Error updating user:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to update user',
        details: error.message,
        code: error.code 
      },
      { status: 500 }
    );
  }
}