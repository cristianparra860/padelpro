import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ClassesApi, TimeSlot as ApiTimeSlot } from '@/lib/classesApi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ClassCardReal from './ClassCardReal'; // Usar ClassCardReal con funcionalidad simplificada
import type { User, TimeSlot, TimeOfDayFilterType } from '@/types';
import { Clock, Loader2 } from 'lucide-react';

interface ClassesDisplayProps {
  selectedDate: Date;
  clubId?: string;
  currentUser?: User | null;
  onBookingSuccess?: () => void;
  timeSlotFilter?: TimeOfDayFilterType;
  selectedPlayerCounts?: number[];
  selectedInstructorIds?: string[];
  viewPreference?: 'withBookings' | 'all' | 'myConfirmed';
  externalRefreshKey?: number; // 🆕 Para forzar recarga desde el padre
  onPlayerCountsChange?: (counts: number[]) => void; // 🆕 Callback para cambiar filtro de jugadores
  onTimeSlotFilterChange?: (filter: TimeOfDayFilterType) => void; // 🕐 Callback para cambiar filtro de horarios
  onInstructorIdsChange?: (ids: string[]) => void; // 👨‍🏫 Callback para cambiar filtro de instructores
  onViewPreferenceChange?: (view: 'withBookings' | 'all' | 'myConfirmed') => void; // 👥 Callback para cambiar filtro de vista
}

// ✅ Removido React.memo - los filtros necesitan re-renderizar cuando cambian props
export function ClassesDisplay({ 
  selectedDate, 
  clubId = 'club-1', 
  currentUser, 
  onBookingSuccess, 
  timeSlotFilter = 'all', 
  selectedPlayerCounts = [1, 2, 3, 4],
  selectedInstructorIds = [],
  viewPreference = 'all',
  externalRefreshKey = 0, // 🆕
  onPlayerCountsChange, // 🆕
  onTimeSlotFilterChange, // 🕐
  onInstructorIdsChange, // 👨‍🏫
  onViewPreferenceChange // 👥
}: ClassesDisplayProps) {
  const [timeSlots, setTimeSlots] = useState<ApiTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // ✅ Forzar actualización tras booking
  const [hasReloaded, setHasReloaded] = useState(false); // 🔥 Evitar bucle de recargas
  const [localPlayerCounts, setLocalPlayerCounts] = useState<number[]>(selectedPlayerCounts); // 🆕 Estado local para el filtro
  const [showFilterPanel, setShowFilterPanel] = useState(false); // 🎯 Estado del panel expandido de jugadores
  const [showTimeFilterPanel, setShowTimeFilterPanel] = useState(false); // 🕐 Estado del panel de horarios
  const [showInstructorFilterPanel, setShowInstructorFilterPanel] = useState(false); // 👨‍🏫 Estado del panel de instructores
  const [showViewFilterPanel, setShowViewFilterPanel] = useState(false); // 👥 Estado del panel de vista
  
  // 📄 Estados para paginación infinita
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // 🆕 Sincronizar estado local con props
  useEffect(() => {
    setLocalPlayerCounts(selectedPlayerCounts);
  }, [selectedPlayerCounts]);
  
  // 👨‍🏫 Obtener lista única de instructores de los slots disponibles
  const availableInstructors = useMemo(() => {
    const instructorsMap = new Map<string, { id: string; name: string; picture: string | null }>();
    
    timeSlots.forEach(slot => {
      if (slot.instructorId && !instructorsMap.has(slot.instructorId)) {
        instructorsMap.set(slot.instructorId, {
          id: slot.instructorId,
          name: slot.instructorName || 'Instructor',
          picture: slot.instructorProfilePicture || null
        });
      }
    });
    
    return Array.from(instructorsMap.values());
  }, [timeSlots]);

  // 🆕 Manejar cambio de filtro de jugadores
  const togglePlayerCount = useCallback((count: number) => {
    setLocalPlayerCounts(prev => {
      const newCounts = prev.includes(count)
        ? prev.filter(c => c !== count)
        : [...prev, count].sort();
      
      // Si hay callback del padre, notificar
      if (onPlayerCountsChange) {
        onPlayerCountsChange(newCounts);
      }
      
      return newCounts;
    });
  }, [onPlayerCountsChange]);

  // 👨‍🏫 Manejar toggle de instructor
  const toggleInstructor = useCallback((instructorId: string) => {
    const newIds = selectedInstructorIds.includes(instructorId)
      ? selectedInstructorIds.filter(id => id !== instructorId)
      : [...selectedInstructorIds, instructorId];
    
    if (onInstructorIdsChange) {
      onInstructorIdsChange(newIds);
    }
  }, [selectedInstructorIds, onInstructorIdsChange]);

  // 🎯 Abrir y cerrar panel de filtros
  const openFilterPanel = () => setShowFilterPanel(true);
  const closeFilterPanel = () => setShowFilterPanel(false);
  
  // 🔥 LIMPIAR CACHÉ AL MONTAR EL COMPONENTE
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🗑️ Limpiando caché del navegador...');
      
      // Limpiar caché de fetch API
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      // Marcar que ya se limpió el caché
      sessionStorage.setItem('cacheCleaned', 'true');
      
      console.log('✅ Caché limpiado');
    }
  }, []); // Solo se ejecuta una vez al montar
  
  const loadTimeSlots = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      console.log(`🔍 Loading slots for date: ${dateString}, page: ${page}, limit: 50`);
      console.log('👤 User level for filtering:', currentUser?.level);
      console.log('🚹🚺 User gender for filtering:', (currentUser as any)?.genderCategory);
      
      const response = await ClassesApi.getTimeSlots({
        clubId,
        date: dateString,
        userLevel: currentUser?.level, // Pass user level for automatic filtering
        userGender: (currentUser as any)?.genderCategory, // Pass user gender for filtering
        timeSlotFilter: timeSlotFilter !== 'all' ? timeSlotFilter : undefined, // 🕐 Pasar filtro de horario al API
        page,
        limit: 50 // 📄 Cargar 50 clases por vez para asegurar suficientes opciones en cada horario
      });
      
      const slots = response.slots;
      const pagination = response.pagination;
      
      console.log('📥 API returned slots:', slots.length);
      console.log('📄 Pagination info:', pagination);
      console.log('📝 First slot completo:', slots[0]);
      console.log('🏟️ First slot tiene courtsAvailability?', slots[0]?.courtsAvailability);
      console.log('🏟️ First slot availableCourtsCount:', slots[0]?.availableCourtsCount);
      
      // 🔥 VERIFICAR SI LOS DATOS TIENEN courtsAvailability
      if (slots.length > 0 && !slots[0]?.courtsAvailability && !hasReloaded) {
        const alreadyReloaded = sessionStorage.getItem('dataReloaded');
        
        if (!alreadyReloaded) {
          console.warn('⚠️ Los datos NO tienen courtsAvailability - Forzando recarga en 2 segundos...');
          sessionStorage.setItem('dataReloaded', 'true');
          
          setTimeout(() => {
            console.log('🔄 Recargando página para obtener datos actualizados...');
            window.location.reload();
          }, 2000);
          
          setHasReloaded(true);
          return;
        } else {
          console.error('❌ Los datos siguen sin courtsAvailability después de recargar');
          console.log('💡 Posible solución: Reiniciar el servidor con npm run dev');
        }
      }
      
      // Limpiar flag de recarga si los datos son correctos
      if (slots.length > 0 && slots[0]?.courtsAvailability) {
        sessionStorage.removeItem('dataReloaded');
        console.log('✅ Datos con courtsAvailability recibidos correctamente');
      }
      
      // 📄 Actualizar estado según si es primera carga o paginación
      if (append && page > 1) {
        setTimeSlots(prev => [...prev, ...slots]);
      } else {
        setTimeSlots(slots);
      }
      
      // 📄 Actualizar estado de paginación
      setCurrentPage(page);
      setHasMore(pagination.hasMore);
      
      console.log('📊 Estado de paginación actualizado:', {
        currentPage: page,
        hasMore: pagination.hasMore,
        totalPages: pagination.totalPages,
        totalSlots: pagination.total,
        slotsEnPagina: slots.length
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando clases');
      console.error('Error loading time slots:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedDate, clubId, timeSlotFilter, currentUser?.level, (currentUser as any)?.genderCategory]);

  // 📄 Cargar clases cuando cambien filtros críticos o al montar el componente
  useEffect(() => {
    console.log('🔄 Cargando clases. Filtros:', { 
      date: format(selectedDate, 'yyyy-MM-dd'), 
      clubId, 
      timeSlotFilter, 
      viewPreference,
      instructorIds: selectedInstructorIds.length 
    });
    
    setCurrentPage(1);
    setHasMore(true);
    setTimeSlots([]);
    loadTimeSlots(1, false);
  }, [selectedDate, clubId, timeSlotFilter, viewPreference, selectedInstructorIds, currentUser, loadTimeSlots, externalRefreshKey]);

  // 📄 Función simple para cargar más clases
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      console.log('🔄 Cargando más clases - página', currentPage + 1);
      loadTimeSlots(currentPage + 1, true);
    }
  }, [loadingMore, hasMore, currentPage, loadTimeSlots]);

  // Memoize filtered slots to avoid recalculation on every render
  const filteredSlots = useMemo(() => {
    console.log('🔄 Recalculando filteredSlots con localPlayerCounts:', localPlayerCounts);
    console.log('🕐 Filtro de horario activo:', timeSlotFilter);
    let filtered = timeSlots;
    
    // 🕐 FILTRO DE HORARIOS DESACTIVADO TEMPORALMENTE
    // El filtro ahora muestra todas las clases cargadas para evitar que aparezcan vacías
    // TODO: Implementar filtrado en el servidor (API) para mejor rendimiento
    console.log(`🕐 Filtro de horario seleccionado: ${timeSlotFilter} (mostrando todas las clases cargadas)`);
    console.log(`📊 Total de clases disponibles: ${filtered.length}`);

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
    
    // 🆕 Filtro de instructores
    if (selectedInstructorIds.length > 0) {
      const beforeInstructorFilter = filtered.length;
      filtered = filtered.filter(slot => {
        return selectedInstructorIds.includes(slot.instructorId || '');
      });
      console.log(`👨‍🏫 Instructor filter: ${beforeInstructorFilter} slots → ${filtered.length} slots (${selectedInstructorIds.length} instructors selected)`);
    }
    
    console.log(`⏰ Time filter: ${timeSlotFilter} - ${timeSlots.length} slots → ${filtered.length} slots`);
    console.log(`🔢 Player counts selected: [${localPlayerCounts.join(', ')}] - Will be applied in ClassCardReal`);
    return filtered;
  }, [timeSlots, timeSlotFilter, viewPreference, selectedInstructorIds, localPlayerCounts]);

  // Memoize slot conversion to avoid recalculating on every render
  const convertApiSlotToClassCard = useCallback((apiSlot: ApiTimeSlot): TimeSlot => {
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
      courtsAvailability: apiSlot.courtsAvailability, // 🏟️ PASAR DISPONIBILIDAD DE PISTAS
      availableCourtsCount: apiSlot.availableCourtsCount, // 🏟️ PASAR CONTADOR
      designatedGratisSpotPlaceholderIndexForOption: undefined,
      privateShareCode: undefined,
    };
  }, []);

  // Memoize processed slots to avoid recalculation
  const processedSlots = useMemo(() => {
    return filteredSlots.map((apiSlot) => {
      try {
        return convertApiSlotToClassCard(apiSlot);
      } catch (error) {
        console.error(`❌ Error procesando slot ${apiSlot.id}:`, error);
        return null;
      }
    }).filter((slot): slot is TimeSlot => slot !== null);
  }, [filteredSlots, convertApiSlotToClassCard]);

  // Memoize time filter label
  const timeFilterLabel = useMemo(() => {
    switch (timeSlotFilter) {
      case 'morning': return 'Mañanas (8-13h)';
      case 'midday': return 'Mediodía (13-18h)';
      case 'evening': return 'Tardes (18-22h)';
      default: return null;
    }
  }, [timeSlotFilter]);

  // Memoize handleBookingSuccess to prevent prop changes
  const handleBookingSuccess = useCallback(() => {
    console.log('🔄 Booking success! Reloading slots...');
    setRefreshKey(prev => prev + 1); // ✅ Forzar re-render
    loadTimeSlots(1, false); // Recargar página 1 después de booking exitoso
    onBookingSuccess?.();
  }, [loadTimeSlots, onBookingSuccess]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4 md:p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando clases...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 md:p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Error: {error}</p>
        <button 
          onClick={() => loadTimeSlots(1, false)}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <div className="p-4 md:p-8 text-center text-gray-500">
        <p>No hay clases disponibles para {format(selectedDate, 'dd/MM/yyyy', { locale: es })}</p>
        <p className="text-sm mt-2">Las clases de la base de datos pueden estar en fechas diferentes al día seleccionado.</p>
      </div>
    );
  }

  // 🔥 DETECTAR SI HAY DATOS OBSOLETOS (sin courtsAvailability)
  const hasObsoleteData = timeSlots.length > 0 && !timeSlots[0]?.courtsAvailability;

  console.log(`🎯 Processed ${processedSlots.length} slots successfully`);
  console.log('🔍 Estado actual antes de render:', {
    timeSlots: timeSlots.length,
    processedSlots: processedSlots.length,
    currentPage,
    hasMore,
    loadingMore,
    loading
  });

  return (
    <div className="relative">
      {/* FILTROS LATERALES - Lateral derecho con diseño de cápsula */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 items-center pr-1">
        {/* Etiqueta "Filtros" */}
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">
          Filtros
        </div>
        
        {/* 👨‍🏫 FILTRO DE INSTRUCTORES - Cápsula con fotos de perfil */}
        {availableInstructors.length > 0 && (
          <div className={`bg-white rounded-full p-1 flex flex-col gap-1 items-center transition-all duration-200 ${
            selectedInstructorIds.length > 0 && selectedInstructorIds.length < availableInstructors.length
              ? 'border border-green-500 shadow-[inset_0_3px_8px_rgba(34,197,94,0.25),inset_0_1px_3px_rgba(0,0,0,0.15)]'
              : 'border border-gray-300 shadow-[inset_0_3px_8px_rgba(0,0,0,0.15),inset_0_1px_3px_rgba(0,0,0,0.1)]'
          }`}>
            {availableInstructors.map(instructor => (
              <button
                key={instructor.id}
                onClick={() => setShowInstructorFilterPanel(true)}
                className={`
                  w-7 h-7 rounded-full transition-all duration-200 cursor-pointer overflow-hidden
                  ${selectedInstructorIds.length === 0 || selectedInstructorIds.includes(instructor.id)
                    ? 'border border-green-500 shadow-[inset_0_1px_3px_rgba(34,197,94,0.2)]'
                    : 'border border-gray-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] opacity-40 hover:opacity-70 hover:border-gray-400'
                  }
                `}
                title={`Filtrar por ${instructor.name}`}
              >
                {instructor.picture ? (
                  <img 
                    src={instructor.picture} 
                    alt={instructor.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                    {instructor.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* 🕐 Círculo de reloj */}
        <button
          onClick={() => setShowTimeFilterPanel(true)}
          className={`
            w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
            ${timeSlotFilter !== 'all'
              ? 'bg-white border border-green-500 shadow-[inset_0_1px_3px_rgba(34,197,94,0.2)]'
              : 'bg-white border border-gray-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] hover:border-gray-400'
            }
          `}
          title="Click para filtrar por horario"
        >
          <svg 
            className="w-full h-full" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Fondo blanco del reloj */}
            <circle cx="12" cy="12" r="10" fill="white" />
            
            {/* Franja horaria según filtro activo */}
            {timeSlotFilter === 'morning' && (
              <path d="M12 12 L12 2 A10 10 0 0 1 20.66 7.34 Z" fill="#22c55e" opacity="0.7" />
            )}
            {timeSlotFilter === 'midday' && (
              <path d="M12 12 L20.66 7.34 A10 10 0 0 1 20.66 16.66 Z" fill="#22c55e" opacity="0.7" />
            )}
            {timeSlotFilter === 'evening' && (
              <path d="M12 12 L20.66 16.66 A10 10 0 0 1 12 22 Z" fill="#22c55e" opacity="0.7" />
            )}
            {timeSlotFilter === 'all' && (
              <circle cx="12" cy="12" r="10" fill="none" />
            )}
            
            {/* Borde del reloj */}
            <circle cx="12" cy="12" r="10" stroke={timeSlotFilter !== 'all' ? '#22c55e' : '#9ca3af'} strokeWidth="1.5" fill="none" />
            
            {/* Manecillas */}
            <line x1="12" y1="12" x2="12" y2="6" stroke={timeSlotFilter !== 'all' ? '#22c55e' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="12" x2="16" y2="12" stroke={timeSlotFilter !== 'all' ? '#22c55e' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" />
            
            {/* Centro del reloj */}
            <circle cx="12" cy="12" r="1.5" fill={timeSlotFilter !== 'all' ? '#22c55e' : '#9ca3af'} />
          </svg>
        </button>

        {/* 👥 Círculo de filtro de vista (Todas/Pendientes/Confirmadas) */}
        <button
          onClick={() => setShowViewFilterPanel(true)}
          className={`
            w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
            ${viewPreference === 'withBookings'
              ? 'bg-white border border-blue-500 shadow-[inset_0_1px_3px_rgba(59,130,246,0.2)]'
              : viewPreference === 'myConfirmed'
              ? 'bg-white border border-red-500 shadow-[inset_0_1px_3px_rgba(239,68,68,0.2)]'
              : 'bg-white border border-gray-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] hover:border-gray-400'
            }
          `}
          title="Filtrar por tipo de clase"
        >
          <svg 
            className="w-full h-full" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Fondo blanco */}
            <circle cx="12" cy="12" r="10" fill="white" />
            
            {/* Doble círculo exterior - igual que el reloj */}
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#ef4444' : '#9ca3af'} 
              strokeWidth="1.5" 
              fill="none"
            />
            
            {/* Dos usuarios - icono representando "todas las clases" */}
            <circle 
              cx="9" 
              cy="10" 
              r="2.5" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#ef4444' : '#9ca3af'} 
              strokeWidth="1.2" 
              fill="none"
            />
            <circle 
              cx="15" 
              cy="10" 
              r="2.5" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#ef4444' : '#9ca3af'} 
              strokeWidth="1.2" 
              fill="none"
            />
            <path 
              d="M5 18c0-2.5 1.8-4 4-4s4 1.5 4 4M11 18c0-2.5 1.8-4 4-4s4 1.5 4 4" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#ef4444' : '#9ca3af'} 
              strokeWidth="1.2" 
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Contenedor redondeado (cápsula) para los números */}
        <div className={`bg-white rounded-full p-1 flex flex-col gap-1 items-center transition-all duration-200 ${
          localPlayerCounts.length < 4
            ? 'border border-green-500 shadow-[inset_0_3px_8px_rgba(34,197,94,0.25),inset_0_1px_3px_rgba(0,0,0,0.15)]'
            : 'border border-gray-300 shadow-[inset_0_3px_8px_rgba(0,0,0,0.15),inset_0_1px_3px_rgba(0,0,0,0.1)]'
        }`}>
          {[1, 2, 3, 4].map(count => (
            <button
              key={count}
              onClick={openFilterPanel}
              className={`
                w-7 h-7 rounded-full font-bold text-xs transition-all duration-200 cursor-pointer bg-white
                ${localPlayerCounts.includes(count)
                  ? 'border border-green-600 text-green-600 shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]'
                  : 'border border-gray-300 text-gray-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] hover:border-gray-400 hover:text-gray-500'
                }
              `}
              title="Click para abrir filtro de jugadores"
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* 🎯 PANEL CENTRAL EXPANDIDO - Modal con animación de crecimiento */}
      {showFilterPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
            onClick={closeFilterPanel}
          />
          
          {/* Panel Central */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 animate-in zoom-in-95 duration-300">
              <div className="text-center mb-4 md:mb-6">
                <h3 className="text-base md:text-xl font-bold text-gray-900 mb-1 md:mb-2">
                  Filtrar por número de jugadores
                </h3>
                <p className="text-xs md:text-sm text-gray-500">
                  Selecciona los tipos de clase que quieres ver
                </p>
              </div>
              
              {/* Círculos grandes tipo avatar */}
              <div className="flex gap-3 md:gap-6 justify-center mb-4 md:mb-6">
                {[1, 2, 3, 4].map(count => (
                  <button
                    key={count}
                    onClick={() => togglePlayerCount(count)}
                    className={`
                      w-16 h-16 md:w-20 md:h-20 rounded-full font-bold text-2xl md:text-3xl
                      transition-all duration-200 cursor-pointer
                      ${localPlayerCounts.includes(count)
                        ? 'bg-white border-4 border-green-500 text-green-600 shadow-[inset_0_2px_8px_rgba(34,197,94,0.3)] scale-110'
                        : 'bg-white border-4 border-gray-300 text-gray-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] hover:border-green-400 hover:text-green-500 hover:scale-105'
                      }
                    `}
                  >
                    {count}
                  </button>
                ))}
              </div>

              {/* Descripción */}
              <div className="text-center text-xs md:text-sm text-gray-600 mb-4">
                {localPlayerCounts.length === 0 && (
                  <p>⚠️ Selecciona al menos un tipo de clase</p>
                )}
                {localPlayerCounts.length > 0 && (
                  <p>
                    ✓ Mostrando clases de: <span className="font-semibold">{localPlayerCounts.sort().join(', ')} jugador{localPlayerCounts.length > 1 ? 'es' : ''}</span>
                  </p>
                )}
              </div>

              {/* Botón cerrar */}
              <button
                onClick={closeFilterPanel}
                className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold transition-colors duration-200"
              >
                Aplicar filtro
              </button>
            </div>
          </div>
        </>
      )}

      {/* 🕐 PANEL FILTRO DE HORARIOS */}
      {showTimeFilterPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
            onClick={() => setShowTimeFilterPanel(false)}
          />
          
          {/* Panel Central */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 animate-in zoom-in-95 duration-300 max-w-md w-full">
              <div className="text-center mb-4 md:mb-6">
                <h3 className="text-base md:text-xl font-bold text-gray-900 mb-1 md:mb-2">
                  Filtrar por franja horaria
                </h3>
                <p className="text-xs md:text-sm text-gray-500">
                  Selecciona el horario que prefieres
                </p>
              </div>
              
              {/* Opciones de horario */}
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                <button
                  onClick={() => {
                    if (onTimeSlotFilterChange) {
                      onTimeSlotFilterChange('all');
                    }
                    setShowTimeFilterPanel(false);
                  }}
                  className={`
                    w-full py-3 md:py-4 px-4 md:px-6 rounded-xl font-semibold transition-all duration-200 text-left
                    ${timeSlotFilter === 'all'
                      ? 'bg-green-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>🌅 Todas las horas</span>
                    {timeSlotFilter === 'all' && <span className="text-xl">✓</span>}
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (onTimeSlotFilterChange) {
                      onTimeSlotFilterChange('morning');
                    }
                    setShowTimeFilterPanel(false);
                  }}
                  className={`
                    w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 text-left
                    ${timeSlotFilter === 'morning'
                      ? 'bg-green-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div>☀️ Mañana</div>
                      <div className="text-sm opacity-80">08:00 - 12:00</div>
                    </div>
                    {timeSlotFilter === 'morning' && <span className="text-xl">✓</span>}
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (onTimeSlotFilterChange) {
                      onTimeSlotFilterChange('midday');
                    }
                    setShowTimeFilterPanel(false);
                  }}
                  className={`
                    w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 text-left
                    ${timeSlotFilter === 'midday'
                      ? 'bg-green-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div>🌞 Mediodía</div>
                      <div className="text-sm opacity-80">12:00 - 17:00</div>
                    </div>
                    {timeSlotFilter === 'midday' && <span className="text-xl">✓</span>}
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (onTimeSlotFilterChange) {
                      onTimeSlotFilterChange('evening');
                    }
                    setShowTimeFilterPanel(false);
                  }}
                  className={`
                    w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 text-left
                    ${timeSlotFilter === 'evening'
                      ? 'bg-green-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div>🌙 Tarde/Noche</div>
                      <div className="text-sm opacity-80">17:00 - 23:00</div>
                    </div>
                    {timeSlotFilter === 'evening' && <span className="text-xl">✓</span>}
                  </div>
                </button>
              </div>

              {/* Botón cerrar */}
              <button
                onClick={() => setShowTimeFilterPanel(false)}
                className="w-full py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-semibold transition-colors duration-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      {/* 👨‍🏫 PANEL FILTRO DE INSTRUCTORES */}
      {showInstructorFilterPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
            onClick={() => setShowInstructorFilterPanel(false)}
          />
          
          {/* Panel Central */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 animate-in zoom-in-95 duration-300 max-w-md w-full">
              <div className="text-center mb-4 md:mb-6">
                <h3 className="text-base md:text-xl font-bold text-gray-900 mb-1 md:mb-2">
                  Filtrar por instructor
                </h3>
                <p className="text-xs md:text-sm text-gray-500">
                  Selecciona los instructores cuyas clases quieres ver
                </p>
              </div>
              
              {/* Lista de instructores */}
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6 max-h-96 overflow-y-auto">
                {availableInstructors.map(instructor => {
                  const isSelected = selectedInstructorIds.length === 0 || selectedInstructorIds.includes(instructor.id);
                  
                  return (
                    <button
                      key={instructor.id}
                      onClick={() => toggleInstructor(instructor.id)}
                      className={`
                        w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center gap-4
                        ${isSelected
                          ? 'bg-green-500 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {/* Foto de perfil */}
                      <div className={`
                        w-12 h-12 rounded-full overflow-hidden flex-shrink-0
                        ${isSelected ? 'border-2 border-white' : 'border-2 border-gray-300'}
                      `}>
                        {instructor.picture ? (
                          <img 
                            src={instructor.picture} 
                            alt={instructor.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-lg font-bold">
                            {instructor.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      {/* Nombre */}
                      <span className="flex-1 text-left">{instructor.name}</span>
                      
                      {/* Check */}
                      {isSelected && <span className="text-xl">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (onInstructorIdsChange) {
                      onInstructorIdsChange([]);
                    }
                  }}
                  className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-semibold transition-colors duration-200 text-sm"
                >
                  Ver todos
                </button>
                <button
                  onClick={() => setShowInstructorFilterPanel(false)}
                  className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold transition-colors duration-200"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 👥 PANEL FILTRO DE VISTA (Todas/Pendientes/Confirmadas) */}
      {showViewFilterPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
            onClick={() => setShowViewFilterPanel(false)}
          />
          
          {/* Panel Central */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 animate-in zoom-in-95 duration-300 max-w-md w-full">
              <div className="text-center mb-4 md:mb-6">
                <h3 className="text-base md:text-xl font-bold text-gray-900 mb-1 md:mb-2">
                  Filtrar por tipo de clase
                </h3>
                <p className="text-xs md:text-sm text-gray-500">
                  Selecciona qué clases quieres ver
                </p>
              </div>
              
              {/* Opciones de vista */}
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                <button
                  onClick={() => {
                    if (onViewPreferenceChange) {
                      onViewPreferenceChange('all');
                    }
                    setShowViewFilterPanel(false);
                  }}
                  className={`
                    w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3
                    ${viewPreference === 'all'
                      ? 'bg-green-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <circle cx="15" cy="8" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5M10 20c0-3 2.5-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <div className="flex-1 text-left">
                    <div>Todas las clases</div>
                    <div className="text-sm opacity-80">Ver todas las opciones disponibles</div>
                  </div>
                  {viewPreference === 'all' && <span className="text-xl">✓</span>}
                </button>

                <button
                  onClick={() => {
                    if (onViewPreferenceChange) {
                      onViewPreferenceChange('withBookings');
                    }
                    setShowViewFilterPanel(false);
                  }}
                  className={`
                    w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3
                    ${viewPreference === 'withBookings'
                      ? 'bg-blue-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <div className="flex-1 text-left">
                    <div>Clases pendientes</div>
                    <div className="text-sm opacity-80">Con usuarios pero sin pista asignada</div>
                  </div>
                  {viewPreference === 'withBookings' && <span className="text-xl">✓</span>}
                </button>

                <button
                  onClick={() => {
                    if (onViewPreferenceChange) {
                      onViewPreferenceChange('myConfirmed');
                    }
                    setShowViewFilterPanel(false);
                  }}
                  className={`
                    w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3
                    ${viewPreference === 'myConfirmed'
                      ? 'bg-red-500 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                  <div className="flex-1 text-left">
                    <div>Clases confirmadas</div>
                    <div className="text-sm opacity-80">Con pista asignada</div>
                  </div>
                  {viewPreference === 'myConfirmed' && <span className="text-xl">✓</span>}
                </button>
              </div>

              {/* Botón cerrar */}
              <button
                onClick={() => setShowViewFilterPanel(false)}
                className="w-full py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-semibold transition-colors duration-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      <div className="space-y-4">
        {/* 🔥 BOTÓN DE ACTUALIZACIÓN SI HAY DATOS OBSOLETOS */}
        {hasObsoleteData && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-yellow-900 font-semibold">Datos desactualizados detectados</p>
                <p className="text-sm text-yellow-700">Los indicadores de pistas no se están mostrando. Haz clic para actualizar.</p>
              </div>
            </div>
            <button
              onClick={() => {
                console.log('🔄 Forzando recarga completa...');
                sessionStorage.clear();
                window.location.reload();
              }}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors shadow-md"
            >
              🔄 Actualizar Ahora
            </button>
          </div>
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
        <div className="w-full px-2 md:px-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 md:gap-0">
            {processedSlots.map((slot) => {
              console.log(`🎴 Renderizando tarjeta ${slot.id.substring(0,8)} con allowedPlayerCounts:`, localPlayerCounts);
              return (
                <div key={`${slot.id}-${refreshKey}-${localPlayerCounts.join(',')}`} className="flex justify-center">
                  <ClassCardReal
                    classData={slot}
                    currentUser={currentUser || null}
                    onBookingSuccess={handleBookingSuccess}
                    showPointsBonus={true}
                    allowedPlayerCounts={localPlayerCounts}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* 📄 Botón para cargar más clases */}
      {timeSlots.length > 0 && (
        <div className="w-full py-8 flex justify-center">
          {loadingMore && (
            <div className="flex items-center gap-3 text-gray-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm font-medium">Cargando más clases...</span>
            </div>
          )}
          {!hasMore && !loadingMore && (
            <div className="text-center text-gray-500 text-sm py-4">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-50 rounded-full border border-gray-200">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-gray-700">
                  Todas las clases cargadas ({timeSlots.length})
                </span>
              </div>
            </div>
          )}
          {hasMore && !loadingMore && (
            <button
              onClick={handleLoadMore}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg shadow-lg transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Cargar más clases
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
