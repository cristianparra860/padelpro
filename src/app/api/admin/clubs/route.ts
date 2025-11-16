import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log('🔍 Fetching clubs from database...');
    
    const clubs = await prisma.club.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        logo: true,
        description: true
      }
    });
    
    console.log('✅ Found clubs:', clubs.length);
    return NextResponse.json(clubs);
    
  } catch (error) {
    console.error('❌ Error fetching clubs:', error.message, error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch clubs', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, address, phone, email, website, description, adminId } = body;

    if (!name || !address || !adminId) {
      return NextResponse.json(
        { error: 'Name, address, and adminId are required' },
        { status: 400 }
      );
    }

    // Verificar que el admin existe
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    const club = await prisma.club.create({
      data: {
        name,
        address,
        phone,
        email,
        website,
        description,
        adminId
      }
    });

    return NextResponse.json(club);
  } catch (error) {
    console.error('Error creating club:', error);
    return NextResponse.json(
      { error: 'Failed to create club' },
      { status: 500 }
    );
  }
}