import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    console.log('🌱 Creating basic infrastructure data...');
    
    // Create club using raw SQL to match actual database schema
    const clubId = 'club-1';
    const clubName = 'Club Padel Pro';
    const clubAddress = 'Avenida del Deporte 123';
    
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO Club (id, name, address, createdAt, updatedAt) 
      VALUES (${clubId}, ${clubName}, ${clubAddress}, datetime('now'), datetime('now'))
    `;
    console.log('✅ Club created');

    // Create courts
    const court1Id = 'court-1';
    const court2Id = 'court-2';
    
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO Court (id, number, clubId, createdAt, updatedAt) 
      VALUES (${court1Id}, 1, ${clubId}, datetime('now'), datetime('now'))
    `;
    
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO Court (id, number, clubId, createdAt, updatedAt) 
      VALUES (${court2Id}, 2, ${clubId}, datetime('now'), datetime('now'))
    `;
    console.log('✅ Courts created');

    // Create instructor users first
    const instructorUser1Id = 'instructor-user-1';
    const instructorUser2Id = 'instructor-user-2';
    
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO User (id, name, email, role, level, credits, createdAt, updatedAt) 
      VALUES (${instructorUser1Id}, 'Carlos Martínez', 'carlos.instructor@test.com', 'INSTRUCTOR', 'avanzado', 0, datetime('now'), datetime('now'))
    `;
    
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO User (id, name, email, role, level, credits, createdAt, updatedAt) 
      VALUES (${instructorUser2Id}, 'Ana López', 'ana.instructor@test.com', 'INSTRUCTOR', 'avanzado', 0, datetime('now'), datetime('now'))
    `;
    
    // Create instructors (requires userId)
    const instructor1Id = 'instructor-1';
    const instructor2Id = 'instructor-2';
    
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO Instructor (id, userId, name, clubId, createdAt, updatedAt) 
      VALUES (${instructor1Id}, ${instructorUser1Id}, 'Carlos Martínez', ${clubId}, datetime('now'), datetime('now'))
    `;
    
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO Instructor (id, userId, name, clubId, createdAt, updatedAt) 
      VALUES (${instructor2Id}, ${instructorUser2Id}, 'Ana López', ${clubId}, datetime('now'), datetime('now'))
    `;
    console.log('✅ Instructors created');

    // Create initial open time slots for testing auto-generation
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startTime1 = `${tomorrow.toISOString().split('T')[0]} 09:00:00`;
    const endTime1 = `${tomorrow.toISOString().split('T')[0]} 10:30:00`;
    const startTime2 = `${tomorrow.toISOString().split('T')[0]} 11:00:00`;
    const endTime2 = `${tomorrow.toISOString().split('T')[0]} 12:30:00`;
    
    const openSlot1Id = 'open-slot-1';
    const openSlot2Id = 'open-slot-2';
    
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO TimeSlot (
        id, clubId, courtId, instructorId, start, end, 
        maxPlayers, totalPrice, level, category, createdAt, updatedAt
      )
      VALUES (
        ${openSlot1Id}, ${clubId}, ${court1Id}, ${instructor1Id}, 
        ${startTime1}, ${endTime1}, 
        4, 25.0, 'ABIERTO', 'ABIERTO', datetime('now'), datetime('now')
      )
    `;

    await prisma.$executeRaw`
      INSERT OR IGNORE INTO TimeSlot (
        id, clubId, courtId, instructorId, start, end, 
        maxPlayers, totalPrice, level, category, createdAt, updatedAt
      )
      VALUES (
        ${openSlot2Id}, ${clubId}, ${court2Id}, ${instructor2Id}, 
        ${startTime2}, ${endTime2}, 
        4, 25.0, 'ABIERTO', 'ABIERTO', datetime('now'), datetime('now')
      )
    `;
    console.log('✅ Open time slots created');

    return NextResponse.json({
      success: true,
      message: 'Infrastructure data created successfully',
      data: {
        club: 'club-1',
        courts: ['court-1', 'court-2'],
        instructors: ['instructor-1', 'instructor-2'],
        openSlots: ['open-slot-1', 'open-slot-2']
      }
    });

  } catch (error) {
    console.error('❌ Error creating infrastructure:', error);
    return NextResponse.json(
      { error: 'Failed to create infrastructure data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );  }
}