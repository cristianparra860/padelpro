// src/app/(app)/instructor/components/InstructorClassCards.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { ClassesApi, TimeSlot as ApiTimeSlot } from '@/lib/classesApi';
import ClassCardReal from '@/components/class/ClassCardReal';
import InstructorCreditsSlotManager from '@/components/class/InstructorCreditsSlotManager';
import type { Instructor as InstructorType } from '@/types';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DateSelector from '@/components/admin/DateSelector';

interface InstructorClassCardsProps {
  instructor: InstructorType;
}

export default function InstructorClassCards({ instructor }: InstructorClassCardsProps) {
  const [timeSlots, setTimeSlots] = useState<ApiTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [instructorBookings, setInstructorBookings] = useState<any[]>([]); // 📊 Reservas del instructor para calendario

  // 📊 Cargar todas las reservas del instructor para los próximos 30 días
  useEffect(() => {
    const loadInstructorBookings = async () => {
      try {
        const today = new Date();
        const endDate = addDays(today, 30);
        
        // Consultar todas las clases del instructor en el rango de fechas
        const clubId = instructor.assignedClubId || 'padel-estrella-madrid';
        
        const response = await fetch(
          `/api/timeslots?clubId=${clubId}&instructorId=${instructor.id}`
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        const slotsArray = Array.isArray(data) ? data : data.slots || [];
        
        // Extraer bookings confirmados de todas las clases
        const allBookings = slotsArray
          .filter((slot: ApiTimeSlot) => 
            slot.bookings && 
            slot.bookings.length > 0 &&
            slot.bookings.some((booking: any) => booking.status === 'CONFIRMED')
          )
          .map((slot: ApiTimeSlot) => ({
            timeSlotId: slot.id,
            date: new Date(slot.start),
            status: 'CONFIRMED' as const
          }));
        
        console.log('📊 Instructor bookings loaded:', allBookings.length);
        setInstructorBookings(allBookings);
      } catch (error) {
        console.error('Error loading instructor bookings:', error);
      }
    };

    loadInstructorBookings();
  }, [instructor.id, instructor.assignedClubId, refreshKey]);

  useEffect(() => {
    const loadInstructorClasses = async () => {
      setLoading(true);
      try {
        // Cargar slots del día seleccionado donde el instructor está asignado
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // Buscar en todos los clubs si no tiene uno asignado
        const clubId = instructor.assignedClubId || 'padel-estrella-madrid';
        
        // Usar el endpoint de timeslots con instructorId para obtener todas las clases
        // El instructorId en TimeSlots es una referencia a la tabla Instructor
        const response = await fetch(
          `/api/timeslots?date=${dateStr}&clubId=${clubId}&instructorId=${instructor.id}`
        );
        
        if (!response.ok) {
          throw new Error('Error al cargar las clases');
        }
        
        const data = await response.json();
        
        // La API puede devolver un array directamente o un objeto con paginación
        const slotsArray = Array.isArray(data) ? data : data.slots || [];
        
        console.log('📊 InstructorClassCards - Data received:', {
          totalSlots: slotsArray.length,
          instructorId: instructor.id,
          date: dateStr
        });
        
        // Filtrar solo las clases con bookings confirmados (alumnos inscritos)
        const classesWithStudents = slotsArray.filter(
          (slot: ApiTimeSlot) => 
            slot.instructorId === instructor.id && 
            slot.bookings && 
            slot.bookings.length > 0 &&
            slot.bookings.some((booking: any) => booking.status === 'CONFIRMED')
        );
        
        console.log('📊 Classes with students:', classesWithStudents.length);
        
        // Debug: verificar las fechas de cada slot
        console.table(classesWithStudents.map(slot => ({
          id: slot.id.substring(0, 20),
          start: slot.start,
          startType: typeof slot.start,
          startValid: slot.start && !isNaN(new Date(slot.start).getTime()),
          bookings: slot.bookings?.length || 0
        })));
        
        setTimeSlots(classesWithStudents);
      } catch (error) {
        console.error('Error loading instructor classes:', error);
        setTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    loadInstructorClasses();
  }, [instructor.id, instructor.assignedClubId, selectedDate, refreshKey]);

  const handleBookingSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Filtrar clases según la pestaña activa
  const filteredSlots = timeSlots.filter((slot) => {
    const slotDate = new Date(slot.start);
    const now = new Date();
    
    switch (activeTab) {
      case 'upcoming':
        return !isPast(slotDate) || format(slotDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      case 'past':
        return isPast(slotDate) && format(slotDate, 'yyyy-MM-dd') !== format(now, 'yyyy-MM-dd');
      case 'all':
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      {/* Tabs para filtrar clases */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Reservadas</TabsTrigger>
          <TabsTrigger value="past">Pasadas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Selector de fecha horizontal con scroll */}
      <DateSelector
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        daysToShow={30}
        userBookings={instructorBookings} // 📊 Pasar reservas del instructor
      />

      {/* Lista de tarjetas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredSlots.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>
            {activeTab === 'upcoming' && 'No tienes clases reservadas próximas.'}
            {activeTab === 'past' && 'No tienes clases pasadas.'}
            {activeTab === 'all' && 'No tienes clases con alumnos inscritos para este día.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSlots.map((slot) => (
            <div key={slot.id} className="space-y-3">
              {/* Gestor de Plazas con Puntos (solo instructor) */}
              <InstructorCreditsSlotManager
                timeSlotId={slot.id}
                maxPlayers={slot.maxPlayers}
                bookings={slot.bookings || []}
                creditsSlots={slot.creditsSlots}
                creditsCost={slot.creditsCost}
                onUpdate={() => setRefreshKey(prev => prev + 1)}
              />
              
              {/* Tarjeta de Clase */}
              <ClassCardReal
                key={slot.id}
                classData={{
                  ...slot,
                  startTime: new Date(slot.start),
                  endTime: new Date(slot.end),
                  start: new Date(slot.start),
                  end: new Date(slot.end),
                  createdAt: new Date(slot.createdAt),
                  updatedAt: new Date(slot.updatedAt),
                  durationMinutes: 30 // Duración estándar
                }}
                currentUser={null} // El instructor no necesita reservar como usuario
                onBookingSuccess={handleBookingSuccess}
                allowedPlayerCounts={[1, 2, 3, 4]} // Mostrar todas las opciones
                instructorView={true} // Modo vista de instructor (opcional, podrías añadir esta prop)
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
