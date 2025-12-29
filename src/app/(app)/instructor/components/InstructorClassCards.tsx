// src/app/(app)/instructor/components/InstructorClassCards.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { ClassesApi, TimeSlot as ApiTimeSlot } from '@/lib/classesApi';
import ClassCardReal from '@/components/class/ClassCardReal';
import type { Instructor as InstructorType } from '@/types';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DateSelector from '@/components/admin/DateSelector';

interface InstructorClassCardsProps {
  instructor: InstructorType;
  onlyWithBookings?: boolean;
}

export default function InstructorClassCards({ instructor, onlyWithBookings = false }: InstructorClassCardsProps) {
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
        
        // Extraer bookings confirmados y cancelados de todas las clases
        const allBookings = slotsArray
          .filter((slot: ApiTimeSlot) => 
            slot.bookings && 
            slot.bookings.length > 0 &&
            slot.bookings.some((booking: any) => 
              booking.status === 'CONFIRMED' || booking.status === 'CANCELLED'
            )
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
        const clubId = instructor.assignedClubId || 'club-1';
        
        console.log('🔍 InstructorClassCards - Loading classes:', {
          instructorId: instructor.id,
          instructorName: instructor.name,
          clubId,
          date: dateStr,
          onlyWithBookings
        });
        
        // Usar el endpoint de timeslots con instructorId para obtener todas las clases
        // El instructorId en TimeSlots es una referencia a la tabla Instructor
        const response = await fetch(
          `/api/timeslots?date=${dateStr}&clubId=${clubId}&instructorId=${instructor.id}&limit=1000`
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
          date: dateStr,
          onlyWithBookings,
          sampleSlot: slotsArray[0] ? {
            id: slotsArray[0].id?.substring(0, 20),
            instructorId: slotsArray[0].instructorId,
            instructorName: slotsArray[0].instructorName,
            start: slotsArray[0].start,
            courtId: slotsArray[0].courtId,
            bookings: slotsArray[0].bookings?.length || 0
          } : null
        });
        
        // Filtrar según el modo
        let filteredClasses;
        if (onlyWithBookings) {
          // Solo clases con bookings (PENDING, CONFIRMED o CANCELLED)
          filteredClasses = slotsArray.filter(
            (slot: ApiTimeSlot) => 
              slot.instructorId === instructor.id && 
              slot.bookings && 
              slot.bookings.length > 0 &&
              slot.bookings.some((booking: any) => 
                booking.status === 'PENDING' || booking.status === 'CONFIRMED' || booking.status === 'CANCELLED'
              )
          );
        } else {
          // Todas las clases del instructor:
          // - Propuestas (courtId null)
          // - Confirmadas (courtId not null)
          // - Con o sin inscripciones
          filteredClasses = slotsArray.filter(
            (slot: ApiTimeSlot) => slot.instructorId === instructor.id
          );
        }
        
        console.log('📊 Filtered classes:', {
          total: filteredClasses.length,
          proposals: filteredClasses.filter((s: ApiTimeSlot) => !s.courtId).length,
          confirmed: filteredClasses.filter((s: ApiTimeSlot) => s.courtId).length,
          withBookings: filteredClasses.filter((s: ApiTimeSlot) => s.bookings && s.bookings.length > 0).length,
          withoutBookings: filteredClasses.filter((s: ApiTimeSlot) => !s.bookings || s.bookings.length === 0).length
        });
        
        // Debug: verificar las fechas de cada slot
        console.table(filteredClasses.map(slot => ({
          id: slot.id.substring(0, 20),
          start: slot.start,
          startType: typeof slot.start,
          startValid: slot.start && !isNaN(new Date(slot.start).getTime()),
          bookings: slot.bookings?.length || 0
        })));
        
        setTimeSlots(filteredClasses);
      } catch (error) {
        console.error('Error loading instructor classes:', error);
        setTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    loadInstructorClasses();
  }, [instructor.id, instructor.assignedClubId, selectedDate, refreshKey, onlyWithBookings]);

  const handleBookingSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Filtrar clases según la pestaña activa (solo si no está en modo "solo con bookings")
  const filteredSlots = onlyWithBookings ? timeSlots : timeSlots.filter((slot) => {
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

  // Calcular contadores para cada pestaña
  const upcomingCount = timeSlots.filter((slot) => {
    const slotDate = new Date(slot.start);
    const now = new Date();
    return !isPast(slotDate) || format(slotDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  }).length;

  const pastCount = timeSlots.filter((slot) => {
    const slotDate = new Date(slot.start);
    const now = new Date();
    return isPast(slotDate) && format(slotDate, 'yyyy-MM-dd') !== format(now, 'yyyy-MM-dd');
  }).length;

  const allCount = timeSlots.length;

  return (
    <div className="space-y-6">
      {/* Tabs para filtrar clases - Solo mostrar si NO está en modo "solo con bookings" */}
      {!onlyWithBookings && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">
              Próximas <span className="ml-1.5 text-xs opacity-70">({upcomingCount})</span>
            </TabsTrigger>
            <TabsTrigger value="past">
              Pasadas <span className="ml-1.5 text-xs opacity-70">({pastCount})</span>
            </TabsTrigger>
            <TabsTrigger value="all">
              Todas <span className="ml-1.5 text-xs opacity-70">({allCount})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

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
          <p className="text-lg font-medium mb-2">
            {onlyWithBookings ? (
              <>No tienes clases con alumnos inscritos para este día.</>
            ) : (
              <>
                {activeTab === 'upcoming' && 'No tienes clases próximas programadas.'}
                {activeTab === 'past' && 'No tienes clases pasadas.'}
                {activeTab === 'all' && 'No tienes clases programadas para este día.'}
              </>
            )}
          </p>
          {!onlyWithBookings && (
            <p className="text-sm text-gray-500 mt-2">
              Las clases se generan automáticamente según tu disponibilidad y rangos de nivel configurados.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Resumen de clases */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-600 font-medium">Propuestas</div>
              <div className="text-2xl font-bold text-blue-700">
                {filteredSlots.filter(s => !s.courtId).length}
              </div>
              <div className="text-xs text-blue-500">Sin pista asignada</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm text-green-600 font-medium">Confirmadas</div>
              <div className="text-2xl font-bold text-green-700">
                {filteredSlots.filter(s => s.courtId).length}
              </div>
              <div className="text-xs text-green-500">Con pista asignada</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-sm text-purple-600 font-medium">Con Alumnos</div>
              <div className="text-2xl font-bold text-purple-700">
                {filteredSlots.filter(s => s.bookings && s.bookings.length > 0).length}
              </div>
              <div className="text-xs text-purple-500">
                {filteredSlots.reduce((sum, s) => sum + (s.bookings?.length || 0), 0)} inscripciones
              </div>
            </div>
          </div>
          
          {/* Tarjetas de clases */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSlots.map((slot) => (
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
                instructorView={true} // ✅ Modo vista de instructor con opciones de gestión
                isInstructor={true} // 🎓 Habilitar botones de conversión € → 🎁
                instructorId={instructor.id} // 🎓 ID del instructor para validación
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
