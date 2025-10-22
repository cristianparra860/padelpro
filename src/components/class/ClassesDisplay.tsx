import React, { useState, useEffect } from 'react';
import { ClassesApi, TimeSlot as ApiTimeSlot } from '@/lib/classesApi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ClassCardReal from './ClassCardReal'; // Usar ClassCardReal con funcionalidad simplificada
import type { User, TimeSlot, TimeOfDayFilterType } from '@/types';

interface ClassesDisplayProps {
  selectedDate: Date;
  clubId?: string;
  currentUser?: User | null;
  onBookingSuccess?: () => void;
  timeSlotFilter?: TimeOfDayFilterType;
  selectedPlayerCounts?: number[];
  viewPreference?: 'withBookings' | 'all' | 'myConfirmed';
}

export function ClassesDisplay({ selectedDate, clubId = 'club-1', currentUser, onBookingSuccess, timeSlotFilter = 'all', selectedPlayerCounts = [1, 2, 3, 4], viewPreference = 'all' }: ClassesDisplayProps) {
  const [timeSlots, setTimeSlots] = useState<ApiTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadTimeSlots();
  }, [selectedDate, clubId]);

  const loadTimeSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      console.log('🔍 Loading slots for date:', dateString);
      console.log('👤 User level for filtering:', currentUser?.level);
      console.log('🚹🚺 User gender for filtering:', (currentUser as any)?.genderCategory);
      
      let slots = await ClassesApi.getTimeSlots({
        clubId,
        date: dateString,
        userLevel: currentUser?.level, // Pass user level for automatic filtering
        userGender: (currentUser as any)?.genderCategory // Pass user gender for filtering
      });
      
      console.log('📥 API returned slots:', slots.length);
      console.log('📝 First few slots:', slots.slice(0, 3));
      
      setTimeSlots(slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando clases');
      console.error('Error loading time slots:', err);
    } finally {
      setLoading(false);
    }
  };

  // No filtramos las tarjetas, solo las opciones de inscripción dentro de cada tarjeta
  const getFilteredSlots = () => {
    let filtered = timeSlots;
    
    // Aplicar filtro de horarios
    if (timeSlotFilter && timeSlotFilter !== 'all') {
      filtered = filtered.filter(slot => {
        const startTime = new Date(slot.start);
        const hour = startTime.getHours();
        
        switch (timeSlotFilter) {
          case 'morning': // Mañanas (8-13h)
            return hour >= 8 && hour < 13;
          case 'midday': // Mediodía (13-18h)
            return hour >= 13 && hour < 18;
          case 'evening': // Tardes (18-22h)
            return hour >= 18 && hour < 22;
          default:
            return true;
        }
      });
    }

    // Filtro de vista (Con Usuarios / Todas / Confirmadas)
    if (viewPreference === 'withBookings') {
      console.log('🔍 Aplicando filtro "Con Usuarios"...');
      console.log('📋 Clases antes del filtro:', filtered.length);
      
      filtered = filtered.filter((slot) => {
        const hasBookings = slot.bookings && slot.bookings.length > 0;
        const hasCourtAssigned = slot.courtNumber != null && slot.courtNumber > 0;
        const bookingsCount = slot.bookings?.length || 0;
        
        console.log(`   🔍 Clase ${slot.id?.substring(0, 8)}:`, {
          courtNumber: slot.courtNumber,
          courtNumberType: typeof slot.courtNumber,
          hasCourtAssigned,
          hasBookings,
          bookingsCount
        });
        
        // Mostrar solo clases CON reservas pero SIN pista asignada
        const shouldShow = hasBookings && !hasCourtAssigned;
        
        console.log(`   → ${shouldShow ? '✅ INCLUIR' : '❌ EXCLUIR'} - Tiene ${bookingsCount} reservas, pista: ${slot.courtNumber || 'null/undefined'}`);
        return shouldShow;
      });
      
      console.log('📋 Clases después del filtro:', filtered.length);
    }

    // Filtro "Confirmadas": Clases que tienen pista asignada
    if (viewPreference === 'myConfirmed') {
      console.log('🔍 Aplicando filtro "Confirmadas"...');
      console.log('📋 Clases antes del filtro:', filtered.length);
      
      filtered = filtered.filter((slot) => {
        const hasCourtAssigned = slot.courtNumber != null && slot.courtNumber > 0;
        
        console.log(`   Clase ${slot.id?.substring(0, 8)}: ${hasCourtAssigned ? '✅ Pista asignada' : '❌ Sin pista'} (pista: ${slot.courtNumber || 'N/A'})`);
        
        return hasCourtAssigned;
      });
      
      console.log('📋 Clases después del filtro:', filtered.length);
    }

    // "Todas": No aplicar ningún filtro adicional, mostrar todo
    // (Los filtros de fecha, hora y jugadores ya se aplicaron arriba)
    
    console.log(`⏰ Time filter: ${timeSlotFilter} - ${timeSlots.length} slots → ${filtered.length} slots`);
    return filtered;
  };

  // Convertir API TimeSlot al formato que espera ClassCard original
  const convertApiSlotToClassCard = (apiSlot: ApiTimeSlot): TimeSlot => {
    // Convertir bookings del API al formato que espera ClassCardReal
    const bookings = (apiSlot.bookings || []).map((b: any) => ({
      userId: b.userId,
      groupSize: b.groupSize,
      status: b.status || 'CONFIRMED', // Asegurar que siempre haya un status válido
      name: b.name || b.userName || 'Usuario',
      profilePictureUrl: b.profilePictureUrl, // ✅ FIX: Usar profilePictureUrl del API
      userLevel: b.userLevel,
      userGender: b.userGender,
      createdAt: b.createdAt,
    }));

    return {
      id: apiSlot.id,
      clubId: apiSlot.clubId,
      instructorId: apiSlot.instructorId || `instructor-${apiSlot.id.substring(0, 8)}`,
      instructorName: apiSlot.instructorName || 'Instructor',
      instructorProfilePicture: apiSlot.instructorProfilePicture,
      startTime: new Date(apiSlot.start),
      endTime: new Date(apiSlot.end),
      durationMinutes: 90,
      level: 'abierto' as const, // Simplificado por ahora
      category: 'abierta' as const, // Simplificado por ahora
      genderCategory: apiSlot.genderCategory, // AGREGADO: Pasar la categoría de género desde el API
      maxPlayers: apiSlot.maxPlayers || 4,
      status: 'forming' as const,
      bookedPlayers: bookings, // Pasar las reservas reales del API
      courtNumber: apiSlot.courtNumber,
      totalPrice: apiSlot.totalPrice,
      designatedGratisSpotPlaceholderIndexForOption: undefined,
      privateShareCode: undefined,
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando clases...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Error: {error}</p>
        <button 
          onClick={loadTimeSlots}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No hay clases disponibles para {format(selectedDate, 'dd/MM/yyyy', { locale: es })}</p>
        <p className="text-sm mt-2">Las clases de la base de datos pueden estar en fechas diferentes al día seleccionado.</p>
      </div>
    );
  }

  // Procesar las clases de la API
  const filteredSlots = getFilteredSlots();
  const processedSlots = filteredSlots.map((apiSlot) => {
    try {
      // Convertir a TimeSlot
      const timeSlotFormat = convertApiSlotToClassCard(apiSlot);
      return timeSlotFormat;
    } catch (error) {
      console.error(`❌ Error procesando slot ${apiSlot.id}:`, error);
      return null;
    }
  }).filter((slot): slot is TimeSlot => slot !== null);

  console.log(`🎯 Processed ${processedSlots.length} slots successfully`);

  // Obtener el nombre del filtro activo para mostrar
  const getTimeFilterLabel = () => {
    switch (timeSlotFilter) {
      case 'morning': return 'Mañanas (8-13h)';
      case 'midday': return 'Mediodía (13-18h)';
      case 'evening': return 'Tardes (18-22h)';
      default: return null;
    }
  };

  const timeFilterLabel = getTimeFilterLabel();

  return (
    <div className="space-y-4">
      {/* Mensaje de filtro de horarios activo */}
      {timeFilterLabel && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 flex items-center gap-2">
            <span>⏰</span>
            <span>
              <strong>Filtro de horario activo:</strong> {timeFilterLabel} • Mostrando {processedSlots.length} {processedSlots.length === 1 ? 'clase' : 'clases'}
            </span>
          </p>
        </div>
      )}

      {/* Mensaje si no hay clases después de los filtros */}
      {processedSlots.length === 0 && timeSlots.length > 0 && (
        <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 font-medium">
            {viewPreference === 'withBookings' 
              ? '👥 No hay clases con usuarios inscritos' 
              : viewPreference === 'myConfirmed'
              ? '✅ No tienes clases confirmadas'
              : '⏰ No hay clases en el horario seleccionado'}
          </p>
          <p className="text-sm text-amber-700 mt-2">
            {viewPreference === 'withBookings' 
              ? `Hay ${timeSlots.length} ${timeSlots.length === 1 ? 'clase disponible' : 'clases disponibles'} en total. Cambia a "Todas" para verlas.`
              : viewPreference === 'myConfirmed'
              ? 'No tienes ninguna reserva confirmada para este día. Reserva una clase para verla aquí.'
              : `Hay ${timeSlots.length} ${timeSlots.length === 1 ? 'clase disponible' : 'clases disponibles'} en otros horarios. Cambia el filtro de horarios para verlas.`
            }
          </p>
        </div>
      )}
      
      {/* Grid de tarjetas de clases */}
      {processedSlots.length > 0 && (
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {processedSlots.map((slot) => (
              <div key={slot.id} className="flex justify-center">
                <ClassCardReal
                  classData={slot}
                  currentUser={currentUser || null}
                  onBookingSuccess={() => {
                    loadTimeSlots(); // Recargar datos después de una reserva
                    onBookingSuccess?.();
                  }}
                  showPointsBonus={true}
                  allowedPlayerCounts={selectedPlayerCounts}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
