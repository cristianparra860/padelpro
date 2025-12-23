import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ClassesApi, TimeSlot as ApiTimeSlot } from '@/lib/classesApi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ClassCardReal from './ClassCardReal'; // Usar ClassCardReal con funcionalidad simplificada
import type { User, TimeSlot, TimeOfDayFilterType } from '@/types';
import { Clock, Loader2, Plus } from 'lucide-react';

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
  creditsEditMode?: boolean; // 🎁 Modo edición de plazas con puntos (solo instructores)
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
  onViewPreferenceChange, // 👥
  creditsEditMode = false // 🎁
}: ClassesDisplayProps) {
  const [timeSlots, setTimeSlots] = useState<ApiTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInscriptionSlotIds, setSelectedInscriptionSlotIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); // ✅ Forzar actualización tras booking
  const [hasReloaded, setHasReloaded] = useState(false); // 🔥 Evitar bucle de recargas
  const [localPlayerCounts, setLocalPlayerCounts] = useState<number[]>(selectedPlayerCounts); // 🆕 Estado local para el filtro
  const [showFilterPanel, setShowFilterPanel] = useState(false); // 🎯 Estado del panel expandido de jugadores
  const [showTimeFilterPanel, setShowTimeFilterPanel] = useState(false); // 🕐 Estado del panel de horarios
  const [showInstructorFilterPanel, setShowInstructorFilterPanel] = useState(false); // 👨‍🏫 Estado del panel de instructores
  const [showViewFilterPanel, setShowViewFilterPanel] = useState(false); // 👥 Estado del panel de vista
  const [tempSelectedInstructorIds, setTempSelectedInstructorIds] = useState<string[]>(selectedInstructorIds);
  const [tempPlayerCounts, setTempPlayerCounts] = useState<number[]>(selectedPlayerCounts); // 🆕 Estado temporal para número de jugadores
  const [tempViewFilters, setTempViewFilters] = useState<string[]>([]); // 🆕 Estado temporal para filtros de vista (vacío = mostrar todo)
  
  // 🔍 NUEVOS FILTROS AVANZADOS
  const [hideEmpty, setHideEmpty] = useState(false); // Ocultar clases vacías (sin alumnos)
  const [hideWithStudents, setHideWithStudents] = useState(false); // Ocultar clases con alumnos inscritos (no confirmadas)
  const [hideFull, setHideFull] = useState(false); // Ocultar clases completas/confirmadas
  
  // 📄 Estados para paginación infinita
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // 🎁 Estados para optimización de botones de puntos
  const [isInstructor, setIsInstructor] = useState(false);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [creditsSlotsMap, setCreditsSlotsMap] = useState<Record<string, number[]>>({});
  
  // 📱 Estado para mostrar/ocultar filtros en móvil
  const [showMobileFilters, setShowMobileFilters] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 🆕 Sincronizar estado local con props
  useEffect(() => {
    setLocalPlayerCounts(selectedPlayerCounts);
  }, [selectedPlayerCounts]);
  
  // � Detectar scroll para ocultar filtros en móvil
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current?.closest('.overflow-y-auto');
    if (!scrollContainer) return;
    
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      // Ocultar filtros al empezar a hacer scroll
      setShowMobileFilters(false);
      
      // Limpiar timeout anterior
      clearTimeout(scrollTimeout);
      
      // No volver a mostrar automáticamente - el usuario debe usar el botón
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);
  

  // Escuchar evento de toggle de filtros desde la barra de navegacion
  useEffect(() => {
    const handleToggleFilters = () => {
      setShowMobileFilters(prev => !prev);
    };

    window.addEventListener('toggleMobileFilters', handleToggleFilters);
    return () => {
      window.removeEventListener('toggleMobileFilters', handleToggleFilters);
    };
  }, []);
  // �💾 Cargar preferencias guardadas del usuario al iniciar
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
          console.log('✅ Preferencias cargadas:', prefs);
          
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
              console.log('🔢 Filtro de jugadores aplicado desde preferencias:', counts);
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
        console.error('❌ Error cargando preferencias del usuario:', error);
      }
    };
    
    loadUserPreferences();
  }, [currentUser]); // Solo cargar una vez cuando currentUser está disponible
  
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

  // 🆕 Manejar cambio de filtro de jugadores (solo actualiza estado temporal)
  const togglePlayerCount = useCallback((count: number) => {
    setTempPlayerCounts(prev => {
      if (prev.includes(count)) {
        return prev.filter(c => c !== count);
      } else {
        return [...prev, count].sort();
      }
    });
  }, []);
  
  // 🆕 Aplicar selección de número de jugadores
  const applyPlayerCountFilter = useCallback(() => {
    setLocalPlayerCounts(tempPlayerCounts);
    if (onPlayerCountsChange) {
      onPlayerCountsChange(tempPlayerCounts);
    }
    setShowFilterPanel(false);
  }, [tempPlayerCounts, onPlayerCountsChange]);
  
  // 🆕 Abrir panel y sincronizar estado temporal
  const openPlayerCountPanel = useCallback(() => {
    setTempPlayerCounts(localPlayerCounts);
    setShowFilterPanel(true);
  }, [localPlayerCounts]);

  // 👨‍🏫 Manejar toggle de instructor (solo actualiza estado temporal)
  const toggleInstructor = useCallback((instructorId: string) => {
    setTempSelectedInstructorIds(prev => {
      if (prev.includes(instructorId)) {
        return prev.filter(id => id !== instructorId);
      } else {
        return [...prev, instructorId];
      }
    });
  }, []);
  
  // 👨‍🏫 Aplicar selección de instructores
  const applyInstructorFilter = useCallback(() => {
    if (onInstructorIdsChange) {
      onInstructorIdsChange(tempSelectedInstructorIds);
    }
    setShowInstructorFilterPanel(false);
  }, [tempSelectedInstructorIds, onInstructorIdsChange]);
  
  // 👨‍🏫 Abrir panel y sincronizar estado temporal
  const openInstructorPanel = useCallback(() => {
    setTempSelectedInstructorIds(selectedInstructorIds);
    setShowInstructorFilterPanel(true);
  }, [selectedInstructorIds]);

  // 👁️ Manejar toggle de filtro de vista (marcado = ocultar ese tipo)
  const toggleViewFilter = useCallback((filter: string) => {
    if (filter === 'withEmpty') {
      setHideEmpty(prev => !prev);
    } else if (filter === 'withInscriptions') {
      setHideWithStudents(prev => !prev);
    } else if (filter === 'withReservations') {
      setHideFull(prev => !prev);
    }
  }, []);
  
  // 👁️ Aplicar filtros de vista (invertido: marcado = ocultar)
  const applyViewFilter = useCallback(() => {
    // Si los tres est\u00e1n marcados = ocultar todo = mostrar todas
    if (tempViewFilters.includes('withInscriptions') && tempViewFilters.includes('withReservations') && tempViewFilters.includes('withEmpty')) {
      if (onViewPreferenceChange) onViewPreferenceChange('all');
    } else if (tempViewFilters.includes('withInscriptions') && tempViewFilters.includes('withReservations')) {
      // Ocultar inscripciones y reservas = mostrar solo vac\u00edas (edge case, mostrar todas)
      if (onViewPreferenceChange) onViewPreferenceChange('all');
    } else if (tempViewFilters.includes('withInscriptions') && tempViewFilters.includes('withEmpty')) {
      // Ocultar inscripciones y vac\u00edas = mostrar solo reservas
      if (onViewPreferenceChange) onViewPreferenceChange('myConfirmed');
    } else if (tempViewFilters.includes('withReservations') && tempViewFilters.includes('withEmpty')) {
      // Ocultar reservas y vac\u00edas = mostrar solo inscripciones
      if (onViewPreferenceChange) onViewPreferenceChange('withBookings');
    } else if (tempViewFilters.includes('withInscriptions')) {
      // Ocultar inscripciones = mostrar solo reservas
      if (onViewPreferenceChange) onViewPreferenceChange('myConfirmed');
    } else if (tempViewFilters.includes('withReservations')) {
      // Ocultar reservas = mostrar solo inscripciones
      if (onViewPreferenceChange) onViewPreferenceChange('withBookings');
    } else if (tempViewFilters.includes('withEmpty')) {
      // Ocultar vac\u00edas = mostrar solo con alumnos (inscripciones + reservas)
      if (onViewPreferenceChange) onViewPreferenceChange('withBookings');
    } else {
      // Ninguno marcado = mostrar todas
      if (onViewPreferenceChange) onViewPreferenceChange('all');
    }
    setShowViewFilterPanel(false);
  }, [tempViewFilters, onViewPreferenceChange]);
  
  // 👁️ Abrir panel y sincronizar estado temporal (invertido)
  const openViewFilterPanel = useCallback(() => {
    // Convertir viewPreference actual a array de filtros (invertido: qué está oculto)
    const currentFilters = viewPreference === 'all' ? [] : 
                          viewPreference === 'withBookings' ? ['withReservations'] : // Solo inscripciones = reservas ocultas
                          viewPreference === 'myConfirmed' ? ['withInscriptions'] : []; // Solo reservas = inscripciones ocultas
    setTempViewFilters(currentFilters);
    setShowViewFilterPanel(true);
  }, [viewPreference]);

  // 🎯 Abrir y cerrar panel de filtros
  const closeFilterPanel = () => setShowFilterPanel(false);
  
  // 🎓 Detectar si usuario es instructor (una sola vez)
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
            console.log('🎓 Usuario es instructor - habilitando edición de plazas');
          } else {
            console.log('👤 Usuario no es instructor');
          }
        }
      } catch (error) {
        console.error('Error checking instructor status:', error);
      }
    };
    
    checkInstructor();
  }, [currentUser?.id]);
  
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
        userId: currentUser?.id, // 🎯 Pasar userId para mostrar clases donde tiene reservas
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
      
      // ♻️ VERIFICAR DATOS DE RECICLAJE
      const recycledSlots = slots.filter(s => s.hasRecycledSlots === true || s.availableRecycledSlots > 0);
      if (recycledSlots.length > 0) {
        console.log('♻️♻️♻️ SLOTS CON RECICLAJE ENCONTRADOS:', recycledSlots.length);
        recycledSlots.forEach(slot => {
          console.log('♻️ SLOT RECICLADO:', {
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
      
      // 🎁 Cargar creditsSlots en batch para TODOS los usuarios (ver plazas con puntos)
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
            console.log(`🎁 Cargados creditsSlots para ${Object.keys(creditsData).length} slots:`, creditsData);
            // DEBUG: Mostrar específicamente el slot de Cristian
            const cristianSlot = Object.keys(creditsData).find(k => k.includes('z9y4veby1rd'));
            if (cristianSlot) {
              console.log(`   ✨ Slot Cristian Parra encontrado:`, {
                id: cristianSlot,
                creditsSlots: creditsData[cristianSlot]
              });
            }
          } else {
            console.error('❌ Error en batch response:', creditsResponse.status);
          }
        } catch (error) {
          console.error('Error cargando creditsSlots batch:', error);
        }
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
  }, [selectedDate, clubId, timeSlotFilter, viewPreference, selectedInstructorIds, currentUser, loadTimeSlots, externalRefreshKey, refreshKey]); // ✅ AGREGAR refreshKey como dependencia

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
        const hasRecycledSlots = slot.hasRecycledSlots === true || slot.hasRecycledSlots === 1;
        
        // Contar bookings activos (no cancelados)
        const activeBookings = (slot.bookings || []).filter(b => b.status !== 'CANCELLED');
        const hasActiveBookings = activeBookings.length > 0;
        
        console.log(`   🔍 Clase ${slot.id?.substring(0, 8)}:`, {
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
        
        console.log(`   → ${shouldShow ? '✅ INCLUIR' : '❌ EXCLUIR'} - Activas: ${activeBookings.length} reservas, pista: ${slot.courtNumber || 'null/undefined'}, recicladas: ${hasRecycledSlots}`);
        return shouldShow;
      });
      
      console.log('📋 Clases después del filtro:', filtered.length);
    }

    // Filtro "Confirmadas": Clases donde el usuario tiene una reserva confirmada
    if (viewPreference === 'myConfirmed') {
      console.log('🔍 Aplicando filtro "Confirmadas"...');
      console.log('📋 Clases antes del filtro:', filtered.length);
      console.log('👤 Usuario ID:', currentUser?.id);
      
      filtered = filtered.filter((slot) => {
        const hasCourtAssigned = slot.courtNumber != null && slot.courtNumber > 0;
        
        // Verificar si el usuario actual tiene una reserva en esta clase
        const userHasBooking = currentUser?.id && (slot.bookings || []).some(
          booking => booking.userId === currentUser.id && booking.status !== 'CANCELLED'
        );
        
        console.log(`   Clase ${slot.id?.substring(0, 8)}: pista=${slot.courtNumber || 'N/A'}, usuario tiene reserva=${userHasBooking ? '✅' : '❌'}`);
        
        // Solo mostrar si tiene pista Y el usuario tiene reserva
        return hasCourtAssigned && userHasBooking;
      });
      
      console.log('📋 Clases después del filtro:', filtered.length);
    }

    // Filtro "Pasadas": Clases con fecha anterior a hoy
    if (viewPreference === 'past') {
      console.log('🔍 Aplicando filtro "Pasadas"...');
      const now = Date.now();
      
      filtered = filtered.filter((slot) => {
        const slotTime = typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime();
        const isPast = slotTime < now;
        
        console.log(`   Clase ${slot.id?.substring(0, 8)}: ${isPast ? '✅ Pasada' : '❌ Futura'}`);
        
        return isPast;
      });
      
      console.log('📋 Clases pasadas:', filtered.length);
    }

    // "Todas": No aplicar ningún filtro adicional, mostrar todo
    // (Los filtros de fecha, hora y jugadores ya se aplicaron arriba)
    
    // 🔍 FILTROS AVANZADOS DE VISTA
    if (hideEmpty || hideWithStudents || hideFull) {
      const beforeAdvancedFilter = filtered.length;
      console.log('🔍 Aplicando filtros avanzados:', { hideEmpty, hideWithStudents, hideFull });
      
      filtered = filtered.filter(slot => {
        const hasCourtAssigned = slot.courtNumber != null && slot.courtNumber > 0;
        const activeBookings = (slot.bookings || []).filter(b => b.status !== 'CANCELLED');
        const playersCount = activeBookings.length;
        
        // Determinar tipo de clase
        const isEmpty = playersCount === 0; // Clase vacía (sin alumnos)
        const hasStudentsNotConfirmed = playersCount > 0 && !hasCourtAssigned; // Clase con alumnos pero sin confirmar
        const isFull = hasCourtAssigned; // Clase confirmada/completa (con pista asignada)
        const hasRecycledSlots = slot.hasRecycledSlots === true || slot.hasRecycledSlots === 1 || (slot.availableRecycledSlots && slot.availableRecycledSlots > 0);
        
        // Aplicar filtros
        if (hideEmpty && isEmpty) return false;
        if (hideWithStudents && hasStudentsNotConfirmed) return false;
        // ♻️ No ocultar clases confirmadas si tienen plazas recicladas disponibles
        if (hideFull && isFull && !hasRecycledSlots) return false;
        
        return true;
      });
      
      console.log(`🔍 Filtros avanzados: ${beforeAdvancedFilter} slots → ${filtered.length} slots`);
    }
    
    // 🆕 Filtro de instructores
    if (selectedInstructorIds.length > 0) {
      const beforeInstructorFilter = filtered.length;
      filtered = filtered.filter(slot => {
        return selectedInstructorIds.includes(slot.instructorId || '');
      });
      console.log(`👨‍🏫 Instructor filter: ${beforeInstructorFilter} slots → ${filtered.length} slots (${selectedInstructorIds.length} instructors selected)`);
    }
    
    // 🔢 Filtro de número de jugadores
    if (localPlayerCounts.length > 0) {
      const beforePlayerFilter = filtered.length;
      console.log(`🔢 Filtro de jugadores ACTIVO con: [${localPlayerCounts.join(', ')}]`);
      
      filtered = filtered.filter(slot => {
        // ♻️ CLASES RECICLADAS: Si tiene bookings cancelados con isRecycled=true, SIEMPRE mostrarla
        const hasCourtAssigned = slot.courtNumber != null && slot.courtNumber > 0;
        const cancelledRecycled = (slot.bookings || []).filter(b => b.status === 'CANCELLED' && b.isRecycled === true);
        const hasRecycledSlots = hasCourtAssigned && cancelledRecycled.length > 0;
        
        if (hasRecycledSlots) {
          console.log(`   ♻️ Clase RECICLADA ${slot.id?.substring(0, 8)}: Pista ${slot.courtNumber}, ${cancelledRecycled.length} plazas canceladas - SIEMPRE MOSTRAR`);
          return true; // ✅ Las clases con plazas canceladas SIEMPRE se muestran
        }
        
        // Una clase se muestra si tiene al menos UNA modalidad seleccionada con disponibilidad
        // Por ejemplo: si seleccionas [2, 3, 4] (sin 1), la clase debe tener disponible 2, 3 o 4 jugadores
        const hasAvailableOption = localPlayerCounts.some(count => {
          // Contar reservas ACTIVAS (no canceladas) para esta modalidad
          const bookingsForThisMode = (slot.bookings || []).filter(
            b => b.groupSize === count && b.status !== 'CANCELLED'
          );
          
          // Disponible = hay menos reservas que el número de jugadores de la modalidad
          // Ejemplo: para 4 jugadores, si hay 3 o menos reservas, está disponible
          const isAvailable = bookingsForThisMode.length < count;
          
          if (isAvailable) {
            console.log(`   ✅ Clase ${slot.id?.substring(0, 8)}: tiene disponible ${count} jugadores (${bookingsForThisMode.length}/${count})`);
          }
          
          return isAvailable;
        });
        
        if (!hasAvailableOption) {
          console.log(`   ❌ Clase ${slot.id?.substring(0, 8)}: NO tiene ninguna opción disponible de [${localPlayerCounts.join(', ')}]`);
        }
        
        return hasAvailableOption;
      });
      console.log(`🔢 Player counts filter: ${beforePlayerFilter} slots → ${filtered.length} slots (showing only classes with availability in: [${localPlayerCounts.join(', ')}] players)`);
    } else {
      console.log(`🔢 Filtro de jugadores DESACTIVADO - mostrando todas las clases`);
    }
    
    console.log(`⏰ Final filter result: ${filtered.length} slots`);
    console.log(`🔢 Player counts selected: [${localPlayerCounts.join(', ')}] - Cards will show only these options`);
    
    // 🎯 ORDENAR: Clases con reserva del usuario PRIMERO
    if (currentUser?.id) {
      filtered.sort((a, b) => {
        const userHasBookingA = (a.bookings || []).some(
          booking => booking.userId === currentUser.id && booking.status !== 'CANCELLED'
        );
        const userHasBookingB = (b.bookings || []).some(
          booking => booking.userId === currentUser.id && booking.status !== 'CANCELLED'
        );
        
        // Si A tiene reserva del usuario y B no → A primero (return -1)
        // Si B tiene reserva del usuario y A no → B primero (return 1)
        // Si ambos tienen o ninguno tiene → mantener orden original (return 0)
        if (userHasBookingA && !userHasBookingB) return -1;
        if (!userHasBookingA && userHasBookingB) return 1;
        return 0;
      });
      console.log('🎯 Clases ordenadas: Las clases con tu reserva aparecen primero');
    }
    
    return filtered;
  }, [timeSlots, timeSlotFilter, viewPreference, selectedInstructorIds, localPlayerCounts, currentUser?.id, hideEmpty, hideWithStudents, hideFull]);

  // Memoize slot conversion to avoid recalculating on every render
  const convertApiSlotToClassCard = useCallback((apiSlot: ApiTimeSlot): TimeSlot | null => {
    // ✅ Validar que el slot tiene datos mínimos requeridos
    if (!apiSlot || !apiSlot.id || !apiSlot.start || !apiSlot.end) {
      console.error('❌ convertApiSlotToClassCard: Slot inválido o incompleto:', apiSlot);
      return null;
    }
    
    // Convertir bookings del API al formato que espera ClassCardReal
    const bookings = (apiSlot.bookings || []).map((b: any) => ({
      userId: b.userId,
      groupSize: b.groupSize,
      status: b.status || 'CONFIRMED', // Asegurar que siempre haya un status válido
      isRecycled: b.isRecycled || false, // ♻️ CRÍTICO: Incluir isRecycled
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
      start: apiSlot.start, // ✅ Pasar directamente el timestamp
      end: apiSlot.end, // ✅ Pasar directamente el timestamp
      startTime: new Date(apiSlot.start),
      endTime: new Date(apiSlot.end),
      durationMinutes: 60, // ✅ CORREGIDO: 60 minutos, no 90
      level: apiSlot.level || 'abierto', // ✅ USAR EL NIVEL DEL API, NO HARDCODEAR
      levelRange: apiSlot.levelRange || null, // ✅ PASAR levelRange del API
      category: 'abierta' as const, // Simplificado por ahora
      genderCategory: apiSlot.genderCategory, // AGREGADO: Pasar la categoría de género desde el API
      maxPlayers: apiSlot.maxPlayers || 4,
      status: 'forming' as const,
      bookedPlayers: bookings, // Pasar las reservas reales del API
      bookings: bookings, // ✅ También agregar bookings para compatibilidad
      courtNumber: apiSlot.courtNumber,
      totalPrice: apiSlot.totalPrice,
      courtsAvailability: apiSlot.courtsAvailability, // 🏟️ PASAR DISPONIBILIDAD DE PISTAS
      availableCourtsCount: apiSlot.availableCourtsCount, // 🏟️ PASAR CONTADOR
      // ♻️ RECICLAJE: Pasar datos de plazas recicladas
      hasRecycledSlots: apiSlot.hasRecycledSlots,
      availableRecycledSlots: apiSlot.availableRecycledSlots,
      recycledSlotsOnlyPoints: apiSlot.recycledSlotsOnlyPoints,
      designatedGratisSpotPlaceholderIndexForOption: undefined,
      privateShareCode: undefined,
    };
  }, []);

  // 🐛 DEBUG: Log convertedApiSlot DESPUÉS de convertir
  useEffect(() => {
    if (timeSlots && timeSlots.length > 0) {
      const converted = timeSlots.map(convertApiSlotToClassCard);
      const recycledSlots = converted.filter(s => s.hasRecycledSlots);
      if (recycledSlots.length > 0) {
        console.log('🔥 ClassesDisplay: Slots con reciclaje DESPUÉS de convertir:', recycledSlots.map(s => ({
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
        console.error(`❌ Error procesando slot ${apiSlot?.id}:`, error);
        return null;
      }
    }).filter((slot): slot is TimeSlot => slot !== null && slot.start !== undefined && slot.end !== undefined);
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

  // 🎁 Función para recargar creditsSlots en batch (TODOS los usuarios ven plazas con puntos)
  const reloadCreditsSlots = useCallback(async () => {
    if (timeSlots.length === 0) {
      console.log('⏭️ Saltando recarga creditsSlots: sin slots');
      return;
    }
    
    console.log('🔄 Recargando creditsSlots para', timeSlots.length, 'slots...');
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
        console.log(`✅ Recargados creditsSlots:`, creditsData);
      }
    } catch (error) {
      console.error('❌ Error recargando creditsSlots batch:', error);
    }
  }, [timeSlots]);

  // Memoize handleBookingSuccess to prevent prop changes
  const handleBookingSuccess = useCallback(async (updatedSlot?: TimeSlot) => {
    console.log('🔄 ========================================');
    console.log('🔄 handleBookingSuccess LLAMADO EN CLASSESDISPLAY');
    console.log('🔄 updatedSlot recibido:', updatedSlot ? 'SÍ' : 'NO');
    
    // 🚀 SOLUCIÓN: Siempre recargar desde el API para asegurar datos frescos
    console.log('🔄 Recargando clases desde el API para asegurar actualización...');
    
    // Incrementar refreshKey ANTES de recargar para forzar re-render
    setRefreshKey(prev => {
      const newKey = prev + 1;
      console.log(`🔑 RefreshKey actualizado: ${prev} → ${newKey}`);
      return newKey;
    });
    
    // Esperar un momento para que el key se actualice
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Recargar datos desde el API
    await loadTimeSlots(1, false);
    
    // 🎁 Recargar creditsSlots después de cualquier cambio
    await reloadCreditsSlots();
    
    console.log('✅ Recarga completa finalizada');
    console.log('🔄 ========================================');
    
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
    <div className={`relative transition-all duration-300 ${showMobileFilters ? 'pr-[80px] md:pr-0' : 'pr-0'}`} ref={scrollContainerRef}>

      <div className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 md:gap-3 items-center pr-1 transition-transform duration-300 md:translate-x-0 ${showMobileFilters ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Título principal "Filtros" */}
        <div className="bg-white rounded-full px-2 py-1 md:px-3 md:py-1.5 shadow-md border border-gray-200">
          <span className="text-[7px] md:text-[9px] font-bold uppercase tracking-wider text-gray-600">
            Filtros
          </span>
        </div>
        
        {/* 👨‍🏫 FILTRO DE INSTRUCTORES - Cápsula con fotos de perfil */}
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
                type="button"
                onClick={openInstructorPanel}
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

        {/* 🕐 Círculo de reloj */}
        <div className="flex flex-col items-center gap-0.5 md:gap-1">
          <span className="text-[6px] md:text-[8px] font-semibold uppercase tracking-wide text-gray-500">
            Horario
          </span>
          <button
            type="button"
            onClick={() => setShowTimeFilterPanel(true)}
            className={`
              w-8 h-8 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
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
        </div>

        {/* C�rculo de filtro de vista (Pendientes/Confirmadas/Pasadas) */}
        <div className="flex flex-col items-center gap-0.5 md:gap-1">
          <span className="text-[6px] md:text-[8px] font-semibold uppercase tracking-wide text-gray-500">
            Vista
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openViewFilterPanel();
            }}
            className={`
              w-8 h-8 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
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
              className="w-6 h-6 md:w-10 md:h-10" 
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
              cy="9" 
              r="3.5" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#22c55e' : viewPreference === 'past' ? '#6b7280' : '#9ca3af'} 
              strokeWidth="1.2" 
              fill="none"
            />
            <circle 
              cx="15" 
              cy="9" 
              r="3.5" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#22c55e' : viewPreference === 'past' ? '#6b7280' : '#9ca3af'} 
              strokeWidth="1.2" 
              fill="none"
            />
            <path 
              d="M3.5 19c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5M9.5 19c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" 
              stroke={viewPreference === 'withBookings' ? '#3b82f6' : viewPreference === 'myConfirmed' ? '#22c55e' : viewPreference === 'past' ? '#6b7280' : '#9ca3af'} 
              strokeWidth="1.2" 
              strokeLinecap="round"
            />
          </svg>
          </button>
        </div>

        {/* Contenedor redondeado (cápsula) para los números */}
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
              type="button"
              onClick={openPlayerCountPanel}
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

      {/* 🎯 PANEL CENTRAL EXPANDIDO - Modal con animación de crecimiento */}
      {showFilterPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
            onClick={closeFilterPanel}
          />
          
          {/* Panel Central - Responsive con espacio para barra lateral */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-4 pl-20 md:pl-24 lg:pl-28">
            <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 animate-in zoom-in-95 duration-300 max-w-md w-full">
              <div className="text-center mb-4 md:mb-6">
                <h3 className="text-base md:text-xl font-bold text-gray-900 mb-1 md:mb-2">
                  Filtrar por número de jugadores
                </h3>
                <p className="text-xs md:text-sm text-gray-500">
                  Selecciona el número de jugadores que te interesa
                </p>
              </div>
              
              {/* Lista de opciones de jugadores */}
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                {[1, 2, 3, 4].map(count => {
                  const isSelected = tempPlayerCounts.includes(count);
                  
                  return (
                    <button
                      key={count}
                      onClick={() => togglePlayerCount(count)}
                      className={`
                        w-full py-3 md:py-4 px-4 md:px-6 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 md:gap-4
                        ${isSelected
                          ? 'bg-white border-2 border-green-500 text-gray-900 shadow-md'
                          : 'bg-gray-100 border-2 border-transparent text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {/* Círculos representando jugadores */}
                      <div className="flex gap-1 items-center flex-shrink-0">
                        {Array.from({ length: count }).map((_, i) => (
                          <div
                            key={i}
                            className={`
                              w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center
                              ${isSelected 
                                ? 'bg-green-100 border-green-500' 
                                : 'bg-gray-200 border-gray-400'
                              }
                            `}
                          >
                            <svg 
                              className={`w-3 h-3 md:w-4 md:h-4 ${isSelected ? 'text-green-600' : 'text-gray-500'}`}
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ))}
                      </div>
                      
                      {/* Texto */}
                      <span className="flex-1 text-left text-sm md:text-base">
                        {count === 1 ? '1 Jugador' : `${count} Jugadores`}
                      </span>
                      
                      {/* Checkbox visual */}
                      <div className={`
                        w-5 h-5 md:w-6 md:h-6 rounded border-2 flex items-center justify-center flex-shrink-0
                        ${isSelected
                          ? 'bg-green-500 border-green-500'
                          : 'bg-white border-gray-300'
                        }
                      `}>
                        {isSelected && (
                          <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Info actual */}
              <div className="text-center mb-4 md:mb-6 p-2 md:p-3 bg-gray-50 rounded-lg">
                {tempPlayerCounts.length === 0 ? (
                  <p className="text-xs md:text-sm text-gray-500">⚠️ Sin filtros - se mostrarán todas las clases</p>
                ) : tempPlayerCounts.length === 4 ? (
                  <p className="text-xs md:text-sm text-gray-500">✓ Todas las opciones seleccionadas</p>
                ) : (
                  <p className="text-xs md:text-sm text-green-600 font-medium">
                    ✓ Mostrando clases de <span className="font-bold">{tempPlayerCounts.join(', ')}</span> {tempPlayerCounts.length === 1 ? 'jugador' : 'jugadores'}
                  </p>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 md:gap-3">
                <button
                  onClick={() => {
                    setTempPlayerCounts([]);
                  }}
                  className="flex-1 py-2.5 md:py-3 px-3 md:px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-semibold transition-colors duration-200 text-xs md:text-sm"
                >
                  Limpiar
                </button>
                <button
                  onClick={applyPlayerCountFilter}
                  className="flex-1 py-2.5 md:py-3 px-3 md:px-4 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold transition-colors duration-200 text-sm md:text-base"
                >
                  Aplicar
                </button>
              </div>
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
          
          {/* Panel Central - Responsive con espacio para barra lateral */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-4 pl-20 md:pl-24 lg:pl-28">
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
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6 max-h-[60vh] overflow-y-auto">
                {availableInstructors.map(instructor => {
                  const isSelected = tempSelectedInstructorIds.length === 0 || tempSelectedInstructorIds.includes(instructor.id);
                  
                  return (
                    <button
                      key={instructor.id}
                      onClick={() => toggleInstructor(instructor.id)}
                      className={`
                        w-full py-3 md:py-4 px-4 md:px-6 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 md:gap-4
                        ${isSelected
                          ? 'bg-white border-2 border-green-500 text-gray-900 shadow-md'
                          : 'bg-gray-100 border-2 border-transparent text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {/* Foto de perfil */}
                      <div className={`
                        w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0
                        ${isSelected ? 'border-2 border-green-500' : 'border-2 border-gray-300'}
                      `}>
                        {instructor.picture ? (
                          <img 
                            src={instructor.picture} 
                            alt={instructor.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-base md:text-lg font-bold">
                            {instructor.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      {/* Nombre */}
                      <span className="flex-1 text-left text-sm md:text-base">{instructor.name}</span>
                      
                      {/* Checkbox visual */}
                      <div className={`
                        w-5 h-5 md:w-6 md:h-6 rounded border-2 flex items-center justify-center flex-shrink-0
                        ${isSelected
                          ? 'bg-green-500 border-green-500'
                          : 'bg-white border-gray-300'
                        }
                      `}>
                        {isSelected && (
                          <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 md:gap-3">
                <button
                  onClick={() => {
                    setTempSelectedInstructorIds([]);
                  }}
                  className="flex-1 py-2.5 md:py-3 px-3 md:px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-semibold transition-colors duration-200 text-xs md:text-sm"
                >
                  Ver todos
                </button>
                <button
                  onClick={applyInstructorFilter}
                  className="flex-1 py-2.5 md:py-3 px-3 md:px-4 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold transition-colors duration-200 text-sm md:text-base"
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
              
              {/* Header */}
              <div className="text-center mb-4 md:mb-6">
                <h3 className="text-base md:text-xl font-bold text-gray-900 mb-1 md:mb-2">
                  Filtrar por tipo de clase
                </h3>
                <p className="text-xs md:text-sm text-gray-500">
                  Selecciona qué clases quieres ver
                </p>
              </div>
              
              {/* Opciones de vista con checkboxes */}
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">

                  {/* Clases con inscripciones */}
                  <button
                    type="button"
                    onClick={() => toggleViewFilter('withInscriptions')}
                    className={`
                      w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3
                      ${hideWithStudents
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    {/* Círculo azul con "I" */}
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg md:text-xl">I</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-gray-900">Ocultar inscripciones</div>
                      <div className="text-xs md:text-sm text-gray-500">No mostrar clases con alumnos inscritos</div>
                    </div>
                    
                    {/* Checkbox */}
                    <div className={`
                      w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
                      ${hideWithStudents
                        ? 'bg-green-500 border-green-500'
                        : 'bg-white border-gray-300'
                      }
                    `}>
                      {hideWithStudents && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Clases con reservas */}
                  <button
                    type="button"
                    onClick={() => toggleViewFilter('withReservations')}
                    className={`
                      w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3
                      ${hideFull
                        ? 'bg-red-50 border-2 border-red-500'
                        : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    {/* Círculo rojo con "R" */}
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg md:text-xl">R</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-gray-900">Ocultar reservas</div>
                      <div className="text-xs md:text-sm text-gray-500">No mostrar clases confirmadas</div>
                    </div>
                    
                    {/* Checkbox */}
                    <div className={`
                      w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
                      ${hideFull
                        ? 'bg-green-500 border-green-500'
                        : 'bg-white border-gray-300'
                      }
                    `}>
                      {hideFull && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Clases vacías */}
                  <button
                    type="button"
                    onClick={() => toggleViewFilter('withEmpty')}
                    className={`
                      w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3
                      ${hideEmpty
                        ? 'bg-gray-50 border-2 border-gray-500'
                        : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    {/* Círculo gris con "Ø" */}
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg md:text-xl">Ø</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-gray-900">Ocultar vacías</div>
                      <div className="text-xs md:text-sm text-gray-500">No mostrar clases sin alumnos</div>
                    </div>
                    
                    {/* Checkbox */}
                    <div className={`
                      w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
                      ${hideEmpty
                        ? 'bg-green-500 border-green-500'
                        : 'bg-white border-gray-300'
                      }
                    `}>
                      {hideEmpty && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>

              </div>

              {/* Botones */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={applyViewFilter}
                  className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold transition-colors duration-200"
                >
                  Aplicar filtros
                </button>
                <button
                  type="button"
                  onClick={() => setShowViewFilterPanel(false)}
                  className="w-full py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-semibold transition-colors duration-200"
                >
                  Cancelar
                </button>
              </div>
              
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
        <div className={`w-full transition-all duration-300 ${showMobileFilters ? 'px-1 md:px-8 lg:px-12' : 'px-2 md:px-8 lg:px-12'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 md:gap-12 justify-items-center">
            {processedSlots.map((slot) => {
              console.log(`🎴 Renderizando tarjeta ${slot.id.substring(0,8)} con allowedPlayerCounts:`, localPlayerCounts);
              
              // 🐛 DEBUG RECICLAJE: Mostrar si tiene plazas recicladas
              if (slot.hasRecycledSlots) {
                console.log(`♻️ TARJETA CON RECICLAJE: ${slot.instructorName} - hasRecycledSlots=${slot.hasRecycledSlots}, availableRecycledSlots=${slot.availableRecycledSlots}`);
              }
              
              // 🎓 Solo permitir edición si el instructor es el de esta clase
              const canEditCreditsSlots = isInstructor && instructorId === slot.instructorId;
              console.log(`🔍 Verificación de permisos para slot ${slot.id.substring(0,8)}:`, {
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
                    instructorView={canEditCreditsSlots}
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
