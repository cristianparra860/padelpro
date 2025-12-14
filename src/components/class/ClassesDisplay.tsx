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
  externalRefreshKey?: number; // ðŸ†• Para forzar recarga desde el padre
  onPlayerCountsChange?: (counts: number[]) => void; // ðŸ†• Callback para cambiar filtro de jugadores
  onTimeSlotFilterChange?: (filter: TimeOfDayFilterType) => void; // ðŸ• Callback para cambiar filtro de horarios
  onInstructorIdsChange?: (ids: string[]) => void; // ðŸ‘¨â€ðŸ« Callback para cambiar filtro de instructores
  onViewPreferenceChange?: (view: 'withBookings' | 'all' | 'myConfirmed') => void; // ðŸ‘¥ Callback para cambiar filtro de vista
  creditsEditMode?: boolean; // ðŸŽ Modo ediciÃ³n de plazas con puntos (solo instructores)
}

// âœ… Removido React.memo - los filtros necesitan re-renderizar cuando cambian props
export function ClassesDisplay({ 
  selectedDate, 
  clubId = 'club-1', 
  currentUser, 
  onBookingSuccess, 
  timeSlotFilter = 'all', 
  selectedPlayerCounts = [1, 2, 3, 4],
  selectedInstructorIds = [],
  viewPreference = 'all',
  externalRefreshKey = 0, // ðŸ†•
  onPlayerCountsChange, // ðŸ†•
  onTimeSlotFilterChange, // ðŸ•
  onInstructorIdsChange, // ðŸ‘¨â€ðŸ«
  onViewPreferenceChange, // ðŸ‘¥
  creditsEditMode = false // ðŸŽ
}: ClassesDisplayProps) {
  const [timeSlots, setTimeSlots] = useState<ApiTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInscriptionSlotIds, setSelectedInscriptionSlotIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); // âœ… Forzar actualizaciÃ³n tras booking
  const [hasReloaded, setHasReloaded] = useState(false); // ðŸ”¥ Evitar bucle de recargas
  const [localPlayerCounts, setLocalPlayerCounts] = useState<number[]>(selectedPlayerCounts); // ðŸ†• Estado local para el filtro
  const [showFilterPanel, setShowFilterPanel] = useState(false); // ðŸŽ¯ Estado del panel expandido de jugadores
  const [showTimeFilterPanel, setShowTimeFilterPanel] = useState(false); // ðŸ• Estado del panel de horarios
  const [showInstructorFilterPanel, setShowInstructorFilterPanel] = useState(false); // ðŸ‘¨â€ðŸ« Estado del panel de instructores
  const [showViewFilterPanel, setShowViewFilterPanel] = useState(false); // ðŸ‘¥ Estado del panel de vista
  
  // ðŸ“„ Estados para paginaciÃ³n infinita
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // ðŸŽ Estados para optimizaciÃ³n de botones de puntos
  const [isInstructor, setIsInstructor] = useState(false);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [creditsSlotsMap, setCreditsSlotsMap] = useState<Record<string, number[]>>({});
  
  // ðŸ†• Sincronizar estado local con props
  useEffect(() => {
    setLocalPlayerCounts(selectedPlayerCounts);
  }, [selectedPlayerCounts]);
  
  // ðŸ’¾ Cargar preferencias guardadas del usuario al iniciar
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token || !currentUser) return;
        
        const response = await fetch('/api/user/preferences', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const prefs = await response.json();
          console.log('âœ… Preferencias cargadas:', prefs);
          
          // Aplicar prefPlayerCounts si existe
          if (prefs.prefPlayerCounts) {
            const counts = prefs.prefPlayerCounts
              .split(',')
              .map((n: string) => parseInt(n.trim()))
              .filter((n: number) => !isNaN(n) && n >= 1 && n <= 4);
            
            if (counts.length > 0) {
              setLocalPlayerCounts(counts);
              if (onPlayerCountsChange) {
                onPlayerCountsChange(counts);
              }
              console.log('ðŸ”¢ Filtro de jugadores aplicado desde preferencias:', counts);
            }
          }
          
          // Aplicar otras preferencias si existen callbacks
          if (prefs.prefTimeSlot && prefs.prefTimeSlot !== 'all' && onTimeSlotFilterChange) {
            onTimeSlotFilterChange(prefs.prefTimeSlot as TimeOfDayFilterType);
          }
          
          if (prefs.prefViewType && prefs.prefViewType !== 'all' && onViewPreferenceChange) {
            onViewPreferenceChange(prefs.prefViewType as 'withBookings' | 'all' | 'myConfirmed');
          }
          
          if (prefs.prefInstructorIds && onInstructorIdsChange) {
            const ids = prefs.prefInstructorIds.split(',').filter((id: string) => id.trim());
            if (ids.length > 0) {
              onInstructorIdsChange(ids);
            }
          }
        }
      } catch (error) {
        console.error('âŒ Error cargando preferencias del usuario:', error);
      }
    };
    
    loadUserPreferences();
  }, [currentUser]); // Solo cargar una vez cuando currentUser estÃ¡ disponible
  
  // ðŸ‘¨â€ðŸ« Obtener lista Ãºnica de instructores de los slots disponibles
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

  // ðŸ†• Manejar cambio de filtro de jugadores
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

  // ðŸ‘¨â€ðŸ« Manejar toggle de instructor
  const toggleInstructor = useCallback((instructorId: string) => {
    const newIds = selectedInstructorIds.includes(instructorId)
      ? selectedInstructorIds.filter(id => id !== instructorId)
      : [...selectedInstructorIds, instructorId];
    
    if (onInstructorIdsChange) {
      onInstructorIdsChange(newIds);
    }
  }, [selectedInstructorIds, onInstructorIdsChange]);

  // ðŸŽ¯ Abrir y cerrar panel de filtros
  const openFilterPanel = () => setShowFilterPanel(true);
  const closeFilterPanel = () => setShowFilterPanel(false);
  
  // ðŸŽ“ Detectar si usuario es instructor (una sola vez)
  useEffect(() => {
    const checkInstructor = async () => {
      if (!currentUser?.id) return;
      
      try {
        const response = await fetch(`/api/instructors/by-user/${currentUser.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.isInstructor && data.instructor) {
            setIsInstructor(true);
            setInstructorId(data.instructor.id);
            console.log('ðŸŽ“ Usuario es instructor - habilitando ediciÃ³n de plazas');
          } else {
            console.log('ðŸ‘¤ Usuario no es instructor');
          }
        }
      } catch (error) {
        console.error('Error checking instructor status:', error);
      }
    };
    
    checkInstructor();
  }, [currentUser?.id]);
  
  // ðŸ”¥ LIMPIAR CACHÃ‰ AL MONTAR EL COMPONENTE
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('ðŸ—‘ï¸ Limpiando cachÃ© del navegador...');
      
      // Limpiar cachÃ© de fetch API
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      // Marcar que ya se limpiÃ³ el cachÃ©
      sessionStorage.setItem('cacheCleaned', 'true');
      
      console.log('âœ… CachÃ© limpiado');
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
      console.log(`ðŸ” Loading slots for date: ${dateString}, page: ${page}, limit: 50`);
      console.log('ðŸ‘¤ User level for filtering:', currentUser?.level);
      console.log('ðŸš¹ðŸšº User gender for filtering:', (currentUser as any)?.genderCategory);
      
      const response = await ClassesApi.getTimeSlots({
        clubId,
        date: dateString,
        userId: currentUser?.id, // ðŸŽ¯ Pasar userId para mostrar clases donde tiene reservas
        userLevel: currentUser?.level, // Pass user level for automatic filtering
        userGender: (currentUser as any)?.genderCategory, // Pass user gender for filtering
        timeSlotFilter: timeSlotFilter !== 'all' ? timeSlotFilter : undefined, // ðŸ• Pasar filtro de horario al API
        page,
        limit: 50 // ðŸ“„ Cargar 50 clases por vez para asegurar suficientes opciones en cada horario
      });
      
      const slots = response.slots;
      const pagination = response.pagination;
      
      console.log('ðŸ“¥ API returned slots:', slots.length);
      console.log('ðŸ“„ Pagination info:', pagination);
      console.log('ðŸ“ First slot completo:', slots[0]);
      
      // â™»ï¸ VERIFICAR DATOS DE RECICLAJE
      const recycledSlots = slots.filter(s => s.hasRecycledSlots === true || s.availableRecycledSlots > 0);
      if (recycledSlots.length > 0) {
        console.log('â™»ï¸â™»ï¸â™»ï¸ SLOTS CON RECICLAJE ENCONTRADOS:', recycledSlots.length);
        recycledSlots.forEach(slot => {
          console.log('â™»ï¸ SLOT RECICLADO:', {
            id: slot.id?.substring(0, 20),
            instructor: slot.instructorName,
            court: slot.courtNumber,
            hasRecycledSlots: slot.hasRecycledSlots,
            availableRecycledSlots: slot.availableRecycledSlots,
            recycledSlotsOnlyPoints: slot.recycledSlotsOnlyPoints,
            bookingsCount: slot.bookings?.length
          });
        });
      }
      
      console.log('ðŸŸï¸ First slot tiene courtsAvailability?', slots[0]?.courtsAvailability);
      console.log('ðŸŸï¸ First slot availableCourtsCount:', slots[0]?.availableCourtsCount);
      
      // ðŸ”¥ VERIFICAR SI LOS DATOS TIENEN courtsAvailability
      if (slots.length > 0 && !slots[0]?.courtsAvailability && !hasReloaded) {
        const alreadyReloaded = sessionStorage.getItem('dataReloaded');
        
        if (!alreadyReloaded) {
          console.warn('âš ï¸ Los datos NO tienen courtsAvailability - Forzando recarga en 2 segundos...');
          sessionStorage.setItem('dataReloaded', 'true');
          
          setTimeout(() => {
            console.log('ðŸ”„ Recargando pÃ¡gina para obtener datos actualizados...');
            window.location.reload();
          }, 2000);
          
          setHasReloaded(true);
          return;
        } else {
          console.error('âŒ Los datos siguen sin courtsAvailability despuÃ©s de recargar');
          console.log('ðŸ’¡ Posible soluciÃ³n: Reiniciar el servidor con npm run dev');
        }
      }
      
      // Limpiar flag de recarga si los datos son correctos
      if (slots.length > 0 && slots[0]?.courtsAvailability) {
        sessionStorage.removeItem('dataReloaded');
        console.log('âœ… Datos con courtsAvailability recibidos correctamente');
      }
      
      // ðŸ“„ Actualizar estado segÃºn si es primera carga o paginaciÃ³n
      if (append && page > 1) {
        setTimeSlots(prev => [...prev, ...slots]);
      } else {
        setTimeSlots(slots);
      }
      
      // ðŸŽ Cargar creditsSlots en batch para TODOS los usuarios (ver plazas con puntos)
      if (slots.length > 0) {
        const slotIds = slots.map(s => s.id);
        try {
          const creditsResponse = await fetch(`/api/timeslots/credits-slots-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slotIds })
          });
          
          if (creditsResponse.ok) {
            const creditsData = await creditsResponse.json();
            setCreditsSlotsMap(prev => ({ ...prev, ...creditsData }));
            console.log(`ðŸŽ Cargados creditsSlots para ${Object.keys(creditsData).length} slots:`, creditsData);
            // DEBUG: Mostrar especÃ­ficamente el slot de Cristian
            const cristianSlot = Object.keys(creditsData).find(k => k.includes('z9y4veby1rd'));
            if (cristianSlot) {
              console.log(`   âœ¨ Slot Cristian Parra encontrado:`, {
                id: cristianSlot,
                creditsSlots: creditsData[cristianSlot]
              });
            }
          } else {
            console.error('âŒ Error en batch response:', creditsResponse.status);
          }
        } catch (error) {
          console.error('Error cargando creditsSlots batch:', error);
        }
      }
      
      // ðŸ“„ Actualizar estado de paginaciÃ³n
      setCurrentPage(page);
      setHasMore(pagination.hasMore);
      
      console.log('ðŸ“Š Estado de paginaciÃ³n actualizado:', {
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

  // ðŸ“„ Cargar clases cuando cambien filtros crÃ­ticos o al montar el componente
  useEffect(() => {
    console.log('ðŸ”„ Cargando clases. Filtros:', { 
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
  }, [selectedDate, clubId, timeSlotFilter, viewPreference, selectedInstructorIds, currentUser, loadTimeSlots, externalRefreshKey, refreshKey]); // âœ… AGREGAR refreshKey como dependencia

  // ðŸ“„ FunciÃ³n simple para cargar mÃ¡s clases
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      console.log('ðŸ”„ Cargando mÃ¡s clases - pÃ¡gina', currentPage + 1);
      loadTimeSlots(currentPage + 1, true);
    }
  }, [loadingMore, hasMore, currentPage, loadTimeSlots]);

  // Memoize filtered slots to avoid recalculation on every render
  const filteredSlots = useMemo(() => {
    console.log('ðŸ”„ Recalculando filteredSlots con localPlayerCounts:', localPlayerCounts);
    console.log('ðŸ• Filtro de horario activo:', timeSlotFilter);
    let filtered = timeSlots;
    
    // ðŸ• FILTRO DE HORARIOS DESACTIVADO TEMPORALMENTE
    // El filtro ahora muestra todas las clases cargadas para evitar que aparezcan vacÃ­as
    // TODO: Implementar filtrado en el servidor (API) para mejor rendimiento
    console.log(`ðŸ• Filtro de horario seleccionado: ${timeSlotFilter} (mostrando todas las clases cargadas)`);
    console.log(`ðŸ“Š Total de clases disponibles: ${filtered.length}`);

    // Filtro de vista (Con Usuarios / Todas / Confirmadas)
    if (viewPreference === 'withBookings') {
      console.log('ðŸ” Aplicando filtro "Con Usuarios"...');
      console.log('ðŸ“‹ Clases antes del filtro:', filtered.length);
      
      filtered = filtered.filter((slot) => {
        const hasBookings = slot.bookings && slot.bookings.length > 0;
        const hasCourtAssigned = slot.courtNumber != null && slot.courtNumber > 0;
        const bookingsCount = slot.bookings?.length || 0;
        const hasRecycledSlots = slot.hasRecycledSlots === true || slot.hasRecycledSlots === 1;
        
        // Contar bookings activos (no cancelados)
        const activeBookings = (slot.bookings || []).filter(b => b.status !== 'CANCELLED');
        const hasActiveBookings = activeBookings.length > 0;
        
        console.log(`   ðŸ” Clase ${slot.id?.substring(0, 8)}:`, {
          courtNumber: slot.courtNumber,
          courtNumberType: typeof slot.courtNumber,
          hasCourtAssigned,
          hasBookings,
          bookingsCount,
          hasRecycledSlots,
          activeBookingsCount: activeBookings.length
        });
        
        // REGLAS:
        // 1. Clases SIN pista asignada CON reservas (PENDIENTES con usuarios)
        // 2. Clases CON pista asignada que tienen plazas recicladas disponibles (CONFIRMADAS con cancelaciones)
        const isPendingWithBookings = hasActiveBookings && !hasCourtAssigned;
        const isConfirmedWithRecycled = hasCourtAssigned && hasRecycledSlots;
        const shouldShow = isPendingWithBookings || isConfirmedWithRecycled;
        
        console.log(`   â†’ ${shouldShow ? 'âœ… INCLUIR' : 'âŒ EXCLUIR'} - Activas: ${activeBookings.length} reservas, pista: ${slot.courtNumber || 'null/undefined'}, recicladas: ${hasRecycledSlots}`);
        return shouldShow;
      });
      
      console.log('ðŸ“‹ Clases despuÃ©s del filtro:', filtered.length);
    }

    // Filtro "Confirmadas": Clases donde el usuario tiene una reserva confirmada
    if (viewPreference === 'myConfirmed') {
      console.log('ðŸ” Aplicando filtro "Confirmadas"...');
      console.log('ðŸ“‹ Clases antes del filtro:', filtered.length);
      console.log('ðŸ‘¤ Usuario ID:', currentUser?.id);
      
      filtered = filtered.filter((slot) => {
        const hasCourtAssigned = slot.courtNumber != null && slot.courtNumber > 0;
        
        // Verificar si el usuario actual tiene una reserva en esta clase
        const userHasBooking = currentUser?.id && (slot.bookings || []).some(
          booking => booking.userId === currentUser.id && booking.status !== 'CANCELLED'
        );
        
        console.log(`   Clase ${slot.id?.substring(0, 8)}: pista=${slot.courtNumber || 'N/A'}, usuario tiene reserva=${userHasBooking ? 'âœ…' : 'âŒ'}`);
        
        // Solo mostrar si tiene pista Y el usuario tiene reserva
        return hasCourtAssigned && userHasBooking;
      });
      
      console.log('ðŸ“‹ Clases despuÃ©s del filtro:', filtered.length);
    }

    // Filtro "Pasadas": Clases con fecha anterior a hoy
    if (viewPreference === 'past') {
      console.log('ðŸ” Aplicando filtro "Pasadas"...');
      const now = Date.now();
      
      filtered = filtered.filter((slot) => {
        const slotTime = typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime();
        const isPast = slotTime < now;
        
        console.log(`   Clase ${slot.id?.substring(0, 8)}: ${isPast ? 'âœ… Pasada' : 'âŒ Futura'}`);
        
        return isPast;
      });
      
      console.log('ðŸ“‹ Clases pasadas:', filtered.length);
    }

    // "Todas": No aplicar ningÃºn filtro adicional, mostrar todo
    // (Los filtros de fecha, hora y jugadores ya se aplicaron arriba)
    
    // ðŸ†• Filtro de instructores
    if (selectedInstructorIds.length > 0) {
      const beforeInstructorFilter = filtered.length;
      filtered = filtered.filter(slot => {
        return selectedInstructorIds.includes(slot.instructorId || '');
      });
      console.log(`ðŸ‘¨â€ðŸ« Instructor filter: ${beforeInstructorFilter} slots â†’ ${filtered.length} slots (${selectedInstructorIds.length} instructors selected)`);
    }
    
    // ðŸ”¢ Filtro de nÃºmero de jugadores
    if (localPlayerCounts.length > 0) {
      const beforePlayerFilter = filtered.length;
      console.log(`ðŸ”¢ Filtro de jugadores ACTIVO con: [${localPlayerCounts.join(', ')}]`);
      
      filtered = filtered.filter(slot => {
        // â™»ï¸ CLASES RECICLADAS: Si tiene bookings cancelados con isRecycled=true, SIEMPRE mostrarla
        const hasCourtAssigned = slot.courtNumber != null && slot.courtNumber > 0;
        const cancelledRecycled = (slot.bookings || []).filter(b => b.status === 'CANCELLED' && b.isRecycled === true);
        const hasRecycledSlots = hasCourtAssigned && cancelledRecycled.length > 0;
        
        if (hasRecycledSlots) {
          console.log(`   â™»ï¸ Clase RECICLADA ${slot.id?.substring(0, 8)}: Pista ${slot.courtNumber}, ${cancelledRecycled.length} plazas canceladas - SIEMPRE MOSTRAR`);
          return true; // âœ… Las clases con plazas canceladas SIEMPRE se muestran
        }
        
        // Una clase se muestra si tiene al menos UNA modalidad seleccionada con disponibilidad
        // Por ejemplo: si seleccionas [2, 3, 4] (sin 1), la clase debe tener disponible 2, 3 o 4 jugadores
        const hasAvailableOption = localPlayerCounts.some(count => {
          // Contar reservas ACTIVAS (no canceladas) para esta modalidad
          const bookingsForThisMode = (slot.bookings || []).filter(
            b => b.groupSize === count && b.status !== 'CANCELLED'
          );
          
          // Disponible = hay menos reservas que el nÃºmero de jugadores de la modalidad
          // Ejemplo: para 4 jugadores, si hay 3 o menos reservas, estÃ¡ disponible
          const isAvailable = bookingsForThisMode.length < count;
          
          if (isAvailable) {
            console.log(`   âœ… Clase ${slot.id?.substring(0, 8)}: tiene disponible ${count} jugadores (${bookingsForThisMode.length}/${count})`);
          }
          
          return isAvailable;
        });
        
        if (!hasAvailableOption) {
          console.log(`   âŒ Clase ${slot.id?.substring(0, 8)}: NO tiene ninguna opciÃ³n disponible de [${localPlayerCounts.join(', ')}]`);
        }
        
        return hasAvailableOption;
      });
      console.log(`ðŸ”¢ Player counts filter: ${beforePlayerFilter} slots â†’ ${filtered.length} slots (showing only classes with availability in: [${localPlayerCounts.join(', ')}] players)`);
    } else {
      console.log(`ðŸ”¢ Filtro de jugadores DESACTIVADO - mostrando todas las clases`);
    }
    
    console.log(`â° Final filter result: ${filtered.length} slots`);
    console.log(`ðŸ”¢ Player counts selected: [${localPlayerCounts.join(', ')}] - Cards will show only these options`);
    
    // ðŸŽ¯ ORDENAR: Clases con reserva del usuario PRIMERO
    if (currentUser?.id) {
      filtered.sort((a, b) => {
        const userHasBookingA = (a.bookings || []).some(
          booking => booking.userId === currentUser.id && booking.status !== 'CANCELLED'
        );
        const userHasBookingB = (b.bookings || []).some(
          booking => booking.userId === currentUser.id && booking.status !== 'CANCELLED'
        );
        
        // Si A tiene reserva del usuario y B no â†’ A primero (return -1)
        // Si B tiene reserva del usuario y A no â†’ B primero (return 1)
        // Si ambos tienen o ninguno tiene â†’ mantener orden original (return 0)
        if (userHasBookingA && !userHasBookingB) return -1;
        if (!userHasBookingA && userHasBookingB) return 1;
        return 0;
      });
      console.log('ðŸŽ¯ Clases ordenadas: Las clases con tu reserva aparecen primero');
    }
    
    return filtered;
  }, [timeSlots, timeSlotFilter, viewPreference, selectedInstructorIds, localPlayerCounts, currentUser?.id]);

  // Memoize slot conversion to avoid recalculating on every render
  const convertApiSlotToClassCard = useCallback((apiSlot: ApiTimeSlot): TimeSlot | null => {
    // âœ… Validar que el slot tiene datos mÃ­nimos requeridos
    if (!apiSlot || !apiSlot.id || !apiSlot.start || !apiSlot.end) {
      console.error('âŒ convertApiSlotToClassCard: Slot invÃ¡lido o incompleto:', apiSlot);
      return null;
    }
    
    // Convertir bookings del API al formato que espera ClassCardReal
    const bookings = (apiSlot.bookings || []).map((b: any) => ({
      userId: b.userId,
      groupSize: b.groupSize,
      status: b.status || 'CONFIRMED', // Asegurar que siempre haya un status vÃ¡lido
      isRecycled: b.isRecycled || false, // â™»ï¸ CRÃTICO: Incluir isRecycled
      name: b.name || b.userName || 'Usuario',
      profilePictureUrl: b.profilePictureUrl, // âœ… FIX: Usar profilePictureUrl del API
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
      start: apiSlot.start, // âœ… Pasar directamente el timestamp
      end: apiSlot.end, // âœ… Pasar directamente el timestamp
      startTime: new Date(apiSlot.start),
      endTime: new Date(apiSlot.end),
      durationMinutes: 60, // âœ… CORREGIDO: 60 minutos, no 90
      level: apiSlot.level || 'abierto', // âœ… USAR EL NIVEL DEL API, NO HARDCODEAR
      levelRange: apiSlot.levelRange || null, // âœ… PASAR levelRange del API
      category: 'abierta' as const, // Simplificado por ahora
      genderCategory: apiSlot.genderCategory, // AGREGADO: Pasar la categorÃ­a de gÃ©nero desde el API
      maxPlayers: apiSlot.maxPlayers || 4,
      status: 'forming' as const,
      bookedPlayers: bookings, // Pasar las reservas reales del API
      bookings: bookings, // âœ… TambiÃ©n agregar bookings para compatibilidad
      courtNumber: apiSlot.courtNumber,
      totalPrice: apiSlot.totalPrice,
      courtsAvailability: apiSlot.courtsAvailability, // ðŸŸï¸ PASAR DISPONIBILIDAD DE PISTAS
      availableCourtsCount: apiSlot.availableCourtsCount, // ðŸŸï¸ PASAR CONTADOR
      // â™»ï¸ RECICLAJE: Pasar datos de plazas recicladas
      hasRecycledSlots: apiSlot.hasRecycledSlots,
      availableRecycledSlots: apiSlot.availableRecycledSlots,
      recycledSlotsOnlyPoints: apiSlot.recycledSlotsOnlyPoints,
      designatedGratisSpotPlaceholderIndexForOption: undefined,
      privateShareCode: undefined,
    };
  }, []);

  // ðŸ› DEBUG: Log convertedApiSlot DESPUÃ‰S de convertir
  useEffect(() => {
    if (timeSlots && timeSlots.length > 0) {
      const converted = timeSlots.map(convertApiSlotToClassCard);
      const recycledSlots = converted.filter(s => s.hasRecycledSlots);
      if (recycledSlots.length > 0) {
        console.log('ðŸ”¥ ClassesDisplay: Slots con reciclaje DESPUÃ‰S de convertir:', recycledSlots.map(s => ({
          instructor: s.instructorName,
          hasRecycledSlots: s.hasRecycledSlots,
          availableRecycledSlots: s.availableRecycledSlots,
          recycledSlotsOnlyPoints: s.recycledSlotsOnlyPoints,
        })));
      }
    }
  }, [timeSlots, convertApiSlotToClassCard]);

  // Memoize processed slots to avoid recalculation
  const processedSlots = useMemo(() => {
    return filteredSlots.map((apiSlot) => {
      try {
        return convertApiSlotToClassCard(apiSlot);
      } catch (error) {
        console.error(`âŒ Error procesando slot ${apiSlot?.id}:`, error);
        return null;
      }
    }).filter((slot): slot is TimeSlot => slot !== null && slot.start !== undefined && slot.end !== undefined);
  }, [filteredSlots, convertApiSlotToClassCard]);

  // Memoize time filter label
  const timeFilterLabel = useMemo(() => {
    switch (timeSlotFilter) {
      case 'morning': return 'MaÃ±anas (8-13h)';
      case 'midday': return 'MediodÃ­a (13-18h)';
      case 'evening': return 'Tardes (18-22h)';
      default: return null;
    }
  }, [timeSlotFilter]);

  // ðŸŽ FunciÃ³n para recargar creditsSlots en batch (TODOS los usuarios ven plazas con puntos)
  const reloadCreditsSlots = useCallback(async () => {
    if (timeSlots.length === 0) {
      console.log('â­ï¸ Saltando recarga creditsSlots: sin slots');
      return;
    }
    
    console.log('ðŸ”„ Recargando creditsSlots para', timeSlots.length, 'slots...');
    const slotIds = timeSlots.map(s => s.id);
    try {
      const creditsResponse = await fetch(`/api/timeslots/credits-slots-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotIds })
      });
      
      if (creditsResponse.ok) {
        const creditsData = await creditsResponse.json();
        setCreditsSlotsMap(creditsData); // Reemplazar completamente el mapa
        console.log(`âœ… Recargados creditsSlots:`, creditsData);
      }
    } catch (error) {
      console.error('âŒ Error recargando creditsSlots batch:', error);
    }
  }, [timeSlots]);

  // Memoize handleBookingSuccess to prevent prop changes
  const handleBookingSuccess = useCallback(async (updatedSlot?: TimeSlot) => {
    console.log('ðŸ”„ ========================================');
    console.log('ðŸ”„ handleBookingSuccess LLAMADO EN CLASSESDISPLAY');
    console.log('ðŸ”„ updatedSlot recibido:', updatedSlot ? 'SÃ' : 'NO');
    
    // ðŸš€ SOLUCIÃ“N: Siempre recargar desde el API para asegurar datos frescos
    console.log('ðŸ”„ Recargando clases desde el API para asegurar actualizaciÃ³n...');
    
    // Incrementar refreshKey ANTES de recargar para forzar re-render
    setRefreshKey(prev => {
      const newKey = prev + 1;
      console.log(`ðŸ”‘ RefreshKey actualizado: ${prev} â†’ ${newKey}`);
      return newKey;
    });
    
    // Esperar un momento para que el key se actualice
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Recargar datos desde el API
    await loadTimeSlots(1, false);
    
    // ðŸŽ Recargar creditsSlots despuÃ©s de cualquier cambio
    await reloadCreditsSlots();
    
    console.log('âœ… Recarga completa finalizada');
    console.log('ðŸ”„ ========================================');
    
    onBookingSuccess?.();
  }, [loadTimeSlots, onBookingSuccess, reloadCreditsSlots]);

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
        <p className="text-sm mt-2">Las clases de la base de datos pueden estar en fechas diferentes al dÃ­a seleccionado.</p>
      </div>
    );
  }

  // ðŸ”¥ DETECTAR SI HAY DATOS OBSOLETOS (sin courtsAvailability)
  const hasObsoleteData = timeSlots.length > 0 && !timeSlots[0]?.courtsAvailability;

  console.log(`ðŸŽ¯ Processed ${processedSlots.length} slots successfully`);
  console.log('ðŸ” Estado actual antes de render:', {
    timeSlots: timeSlots.length,
    processedSlots: processedSlots.length,
    currentPage,
    hasMore,
    loadingMore,
    loading
  });

  return (
    <div className="relative">
      {/* FILTROS LATERALES - Lateral derecho con diseÃ±o de cÃ¡psula */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 md:gap-3 items-center pr-1">
        {/* TÃ­tulo principal "Filtros" */}
        <div className="bg-white rounded-full px-2 py-1 md:px-3 md:py-1.5 shadow-md border border-gray-200">
          <span className="text-[7px] md:text-[9px] font-bold uppercase tracking-wider text-gray-600">
            Filtros
          </span>
        </div>
        
        {/* ðŸ‘¨â€ðŸ« FILTRO DE INSTRUCTORES - CÃ¡psula con fotos de perfil */}
        {availableInstructors.length > 0 && (
          <div className="flex flex-col items-center gap-0.5 md:gap-1">
            <span className="text-[6px] md:text-[8px] font-semibold uppercase tracking-wide text-gray-500">
              Instructores
            </span>
            <div className={`bg-white rounded-full p-0.5 md:p-1 flex flex-col gap-0.5 md:gap-1 items-center transition-all duration-200 ${
              selectedInstructorIds.length > 0 && selectedInstructorIds.length < availableInstructors.length
                ? 'border border-green-500 shadow-[inset_0_3px_8px_rgba(34,197,94,0.25),inset_0_1px_3px_rgba(0,0,0,0.15)]'
                : 'border border-gray-300 shadow-[inset_0_3px_8px_rgba(0,0,0,0.15),inset_0_1px_3px_rgba(0,0,0,0.1)]'
            }`}>
            {availableInstructors.map(instructor => (
              <button
                key={instructor.id}
                onClick={() => setShowInstructorFilterPanel(true)}
                className={`
                  w-6 h-6 md:w-11 md:h-11 rounded-full transition-all duration-200 cursor-pointer overflow-hidden
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
        </div>
        )}

        {/* ðŸ• CÃ­rculo de reloj */}
        <div className="flex flex-col items-center gap-0.5 md:gap-1">
          <span className="text-[6px] md:text-[8px] font-semibold uppercase tracking-wide text-gray-500">
            Horario
          </span>
          <button
            onClick={() => setShowTimeFilterPanel(true)}
            className={`
              w-6 h-6 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
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
            
            {/* Franja horaria segÃºn filtro activo */}
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
        </div>

        {/* Círculo de filtro de vista (Pendientes/Confirmadas/Pasadas) */}
        <div className="flex flex-col items-center gap-0.5 md:gap-1">
          <span className="text-[6px] md:text-[8px] font-semibold uppercase tracking-wide text-gray-500">
            Vista
          </span>
          <button
            onClick={() => setShowViewFilterPanel(true)}
            className={`
              w-6 h-6 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
              ${viewPreference === 'withBookings'
                ? 'bg-white border border-blue-500 shadow-[inset_0_1px_3px_rgba(59,130,246,0.2)]'
                : viewPreference === 'myConfirmed'
                ? 'bg-white border border-green-500 shadow-[inset_0_1px_3px_rgba(34,197,94,0.2)]'
                : viewPreference === 'past'
                ? 'bg-white border border-gray-500 shadow-[inset_0_1px_3px_rgba(107,114,128,0.2)]'
                : 'bg-white border border-gray-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] hover:border-gray-400'
              }
            `}
            title="Filtrar por estado de clase"
          >
            <svg 
              className="w-5 h-5 md:w-8 md:h-8" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
            
            {/* Doble círculo exterior - igual que el reloj */}
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#22c55e' : viewPreference === 'past' ? '#6b7280' : '#9ca3af'} 
              strokeWidth="1.5" 
              fill="none"
            />
            
            {/* Dos usuarios - icono representando "todas las clases" */}
            <circle 
              cx="9" 
              cy="10" 
              r="2.5" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#22c55e' : viewPreference === 'past' ? '#6b7280' : '#9ca3af'} 
              strokeWidth="1.2" 
              fill="none"
            />
            <circle 
              cx="15" 
              cy="10" 
              r="2.5" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#22c55e' : viewPreference === 'past' ? '#6b7280' : '#9ca3af'} 
              strokeWidth="1.2" 
              fill="none"
            />
            <path 
              d="M5 18c0-2.5 1.8-4 4-4s4 1.5 4 4M11 18c0-2.5 1.8-4 4-4s4 1.5 4 4" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#22c55e' : viewPreference === 'past' ? '#6b7280' : '#9ca3af'} 
              strokeWidth="1.2" 
              strokeLinecap="round"
            />
          </svg>
          </button>
        </div>

        {/* Contenedor redondeado (cÃ¡psula) para los nÃºmeros */}
        <div className="flex flex-col items-center gap-0.5 md:gap-1">
          <span className="text-[6px] md:text-[8px] font-semibold uppercase tracking-wide text-gray-500">
            Jugadores
          </span>
          <div className={`bg-white rounded-full p-0.5 md:p-1 flex flex-col gap-0.5 md:gap-1 items-center transition-all duration-200 ${
            localPlayerCounts.length > 0 && localPlayerCounts.length < 4
              ? 'border border-green-500 shadow-[inset_0_3px_8px_rgba(34,197,94,0.25),inset_0_1px_3px_rgba(0,0,0,0.15)]'
              : 'border border-gray-300 shadow-[inset_0_3px_8px_rgba(0,0,0,0.15),inset_0_1px_3px_rgba(0,0,0,0.1)]'
          }`}>
          {[1, 2, 3, 4].map(count => (
            <button
              key={count}
              onClick={openFilterPanel}
              className={`
                w-6 h-6 md:w-11 md:h-11 rounded-full font-bold text-[10px] md:text-base transition-all duration-200 cursor-pointer bg-white
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
      </div>

      {/* ðŸŽ¯ PANEL CENTRAL EXPANDIDO - Modal con animaciÃ³n de crecimiento */}
      {showFilterPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
            onClick={closeFilterPanel}
          />
          
          {/* Panel Central */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-300 max-w-lg">
              {/* Header con botÃ³n cerrar */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">
                  Filtrar por jugadores
                </h3>
                <button
                  onClick={closeFilterPanel}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Instructions */}
              <p className="text-sm md:text-base text-gray-600 mb-6">
                Selecciona el nÃºmero de jugadores que te interesa. Solo verÃ¡s clases con disponibilidad para esas opciones.
              </p>
              
              {/* CÃ­rculos grandes tipo avatar */}
              <div className="flex gap-4 md:gap-6 justify-center mb-8">
                {[1, 2, 3, 4].map(count => (
                  <button
                    key={count}
                    onClick={() => togglePlayerCount(count)}
                    className={`
                      relative w-16 h-16 md:w-20 md:h-20 rounded-full font-bold text-2xl md:text-3xl
                      transition-all duration-200 cursor-pointer
                      ${localPlayerCounts.includes(count)
                        ? 'bg-green-500 text-white shadow-lg scale-110 ring-4 ring-green-200'
                        : 'bg-white border-4 border-gray-300 text-gray-400 shadow-md hover:border-green-300 hover:text-green-500 hover:scale-105'
                      }
                    `}
                  >
                    {count}
                    {localPlayerCounts.includes(count) && (
                      <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Current selection info */}
              <div className="text-center mb-6 p-3 bg-gray-50 rounded-lg">
                {localPlayerCounts.length === 0 ? (
                  <p className="text-sm text-gray-500">âš ï¸ No hay filtros seleccionados - se mostrarÃ¡n todas las clases</p>
                ) : localPlayerCounts.length === 4 ? (
                  <p className="text-sm text-gray-500">âœ“ Todos los modos seleccionados - se mostrarÃ¡n todas las clases</p>
                ) : (
                  <p className="text-sm text-green-600 font-medium">
                    âœ“ Mostrando clases con {localPlayerCounts.length === 1 ? 'opciÃ³n de' : 'opciones de'} <span className="font-bold">{localPlayerCounts.join(', ')}</span> {localPlayerCounts.length === 1 ? 'jugador' : 'jugadores'}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeFilterPanel}
                  className="flex-1 px-6 py-3 rounded-xl text-white bg-blue-500 hover:bg-blue-600 font-medium transition-colors shadow-lg"
                >
                  âœ“ Aplicar selecciÃ³n
                </button>
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('auth_token');
                      if (!token) {
                        alert('âŒ Debes iniciar sesiÃ³n para guardar preferencias');
                        return;
                      }

                      // Guardar preferencia en la base de datos
                      const response = await fetch('/api/user/preferences', {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          prefPlayerCounts: localPlayerCounts.join(',')
                        })
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error al guardar preferencias');
                      }

                      // Mostrar confirmaciÃ³n visual con mejor feedback
                      const successMessage = localPlayerCounts.length === 0 
                        ? 'âœ… Filtro eliminado - se mostrarÃ¡n todas las clases'
                        : localPlayerCounts.length === 4
                        ? 'âœ… Todos los modos seleccionados - se mostrarÃ¡n todas las clases'
                        : `âœ… Preferencias guardadas: ${localPlayerCounts.join(', ')} jugadores`;
                      
                      alert(successMessage);
                      closeFilterPanel();
                    } catch (error) {
                      console.error('Error saving preferences:', error);
                      alert(`âŒ Error al guardar preferencias: ${error instanceof Error ? error.message : 'Error desconocido'}`);
                    }
                  }}
                  className="flex-1 px-6 py-3 rounded-xl text-white bg-green-500 hover:bg-green-600 font-medium transition-colors shadow-lg"
                >
                  ðŸ’¾ Guardar selecciÃ³n
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ðŸ• PANEL FILTRO DE HORARIOS */}
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
                    <span>ðŸŒ… Todas las horas</span>
                    {timeSlotFilter === 'all' && <span className="text-xl">âœ“</span>}
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
                      <div>â˜€ï¸ MaÃ±ana</div>
                      <div className="text-sm opacity-80">08:00 - 12:00</div>
                    </div>
                    {timeSlotFilter === 'morning' && <span className="text-xl">âœ“</span>}
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
                      <div>ðŸŒž MediodÃ­a</div>
                      <div className="text-sm opacity-80">12:00 - 17:00</div>
                    </div>
                    {timeSlotFilter === 'midday' && <span className="text-xl">âœ“</span>}
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
                      <div>ðŸŒ™ Tarde/Noche</div>
                      <div className="text-sm opacity-80">17:00 - 23:00</div>
                    </div>
                    {timeSlotFilter === 'evening' && <span className="text-xl">âœ“</span>}
                  </div>
                </button>
              </div>

              {/* BotÃ³n cerrar */}
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

      {/* ðŸ‘¨â€ðŸ« PANEL FILTRO DE INSTRUCTORES */}
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
                      {isSelected && <span className="text-xl">âœ“</span>}
                    </button>
                  );
                })}
              </div>

              {/* Botones de acciÃ³n */}
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

      {/* ðŸ‘¥ PANEL FILTRO DE VISTA (Todas/Pendientes/Confirmadas) */}
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
                  Selecciona quÃ© clases quieres ver
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
                  {viewPreference === 'all' && <span className="text-xl">âœ“</span>}
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
                  {viewPreference === 'withBookings' && <span className="text-xl">âœ“</span>}
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
                  {viewPreference === 'myConfirmed' && <span className="text-xl">âœ“</span>}
                </button>
              </div>

              {/* BotÃ³n cerrar */}
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
        {/* ðŸ”¥ BOTÃ“N DE ACTUALIZACIÃ“N SI HAY DATOS OBSOLETOS */}
        {hasObsoleteData && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">âš ï¸</span>
              <div>
                <p className="text-yellow-900 font-semibold">Datos desactualizados detectados</p>
                <p className="text-sm text-yellow-700">Los indicadores de pistas no se estÃ¡n mostrando. Haz clic para actualizar.</p>
              </div>
            </div>
            <button
              onClick={() => {
                console.log('ðŸ”„ Forzando recarga completa...');
                sessionStorage.clear();
                window.location.reload();
              }}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors shadow-md"
            >
              ðŸ”„ Actualizar Ahora
            </button>
          </div>
        </div>
      )}

      {/* Mensaje si no hay clases despuÃ©s de los filtros */}
      {processedSlots.length === 0 && timeSlots.length > 0 && (
        <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 font-medium">
            {viewPreference === 'withBookings' 
              ? 'ðŸ‘¥ No hay clases con usuarios inscritos' 
              : viewPreference === 'myConfirmed'
              ? 'âœ… No tienes clases confirmadas'
              : 'â° No hay clases en el horario seleccionado'}
          </p>
          <p className="text-sm text-amber-700 mt-2">
            {viewPreference === 'withBookings' 
              ? `Hay ${timeSlots.length} ${timeSlots.length === 1 ? 'clase disponible' : 'clases disponibles'} en total. Cambia a "Todas" para verlas.`
              : viewPreference === 'myConfirmed'
              ? 'No tienes ninguna reserva confirmada para este dÃ­a. Reserva una clase para verla aquÃ­.'
              : `Hay ${timeSlots.length} ${timeSlots.length === 1 ? 'clase disponible' : 'clases disponibles'} en otros horarios. Cambia el filtro de horarios para verlas.`
            }
          </p>
        </div>
      )}
      
      {/* Grid de tarjetas de clases */}
      {processedSlots.length > 0 && (
        <div className="w-full px-2 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 md:gap-12 justify-items-center">
            {processedSlots.map((slot) => {
              console.log(`ðŸŽ´ Renderizando tarjeta ${slot.id.substring(0,8)} con allowedPlayerCounts:`, localPlayerCounts);
              
              // ðŸ› DEBUG RECICLAJE: Mostrar si tiene plazas recicladas
              if (slot.hasRecycledSlots) {
                console.log(`â™»ï¸ TARJETA CON RECICLAJE: ${slot.instructorName} - hasRecycledSlots=${slot.hasRecycledSlots}, availableRecycledSlots=${slot.availableRecycledSlots}`);
              }
              
              // ðŸŽ“ Solo permitir ediciÃ³n si el instructor es el de esta clase
              const canEditCreditsSlots = isInstructor && instructorId === slot.instructorId;
              console.log(`ðŸ” VerificaciÃ³n de permisos para slot ${slot.id.substring(0,8)}:`, {
                isInstructor,
                instructorIdUsuario: instructorId,
                instructorIdClase: slot.instructorId,
                canEditCreditsSlots
              });
              return (
                <div key={`slot-${slot.id}-refresh-${refreshKey}-bookings-${slot.bookings?.length || 0}-players-${localPlayerCounts.join('-')}`} className="flex justify-center">
                  <ClassCardReal
                    classData={slot}
                    currentUser={currentUser || null}
                    onBookingSuccess={handleBookingSuccess}
                    showPointsBonus={true}
                    allowedPlayerCounts={localPlayerCounts}
                    isInstructor={canEditCreditsSlots}
                    instructorId={instructorId}
                    creditsSlots={creditsSlotsMap[slot.id] || []}
                    isInscriptionSelected={selectedInscriptionSlotIds.includes(slot.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* ðŸ“„ BotÃ³n para cargar mÃ¡s clases */}
      {timeSlots.length > 0 && (
        <div className="w-full py-8 flex justify-center">
          {loadingMore && (
            <div className="flex items-center gap-3 text-gray-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm font-medium">Cargando mÃ¡s clases...</span>
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
              Cargar mÃ¡s clases
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
