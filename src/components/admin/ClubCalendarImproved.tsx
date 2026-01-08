'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import ClassCardReal from '@/components/class/ClassCardReal';
import MatchGameCard from '@/components/match/MatchGameCard';
import DateSelector from '@/components/admin/DateSelector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import InstructorCourtReservationDialog from '@/components/instructor/InstructorCourtReservationDialog';
import { useToast } from '@/hooks/use-toast';

interface CalendarEvent {
  id: string;
  type: 'class-proposal' | 'class-confirmed' | 'match-proposal' | 'match-confirmed' | 'instructor-blocked' | 'court-blocked';
  title: string;
  start: string;
  end: string;
  color: string;
  instructorId?: string;
  instructorName?: string;
  instructorPhoto?: string;
  courtId?: string;
  courtNumber?: number;
  playersCount?: number;
  maxPlayers?: number;
  level?: string;
  price?: number;
  duration?: number;
  bookings?: any[];
}

interface CalendarData {
  courts: Array<{
    id: string;
    number: number;
    name: string;
  }>;
  instructors: Array<{
    id: string;
    name: string;
    email: string;
    photo?: string;
  }>;
  events: CalendarEvent[];
  confirmedClasses: CalendarEvent[];
  confirmedMatches: CalendarEvent[];
  summary: {
    totalCourts: number;
    totalInstructors: number;
    totalClasses: number;
    confirmedClasses: number;
    proposedClasses: number;
    totalMatches: number;
    confirmedMatches: number;
    proposedMatches: number;
  };
}

export default function ClubCalendarImproved({
  clubId,
  currentUser,
  viewMode = 'club',
  instructorId,
  initialDate,
  onDateChange
}: {
  clubId: string;
  currentUser?: any;
  viewMode?: 'user' | 'club' | 'instructor';
  instructorId?: string;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [classProposals, setClassProposals] = useState<any[]>([]);
  const [confirmedClasses, setConfirmedClasses] = useState<any[]>([]); // Clases confirmadas con courtId
  const [matchProposals, setMatchProposals] = useState<any[]>([]); // Propuestas de partidas sin pista
  const [confirmedMatches, setConfirmedMatches] = useState<any[]>([]); // Partidas confirmadas con pista
  const [showClassCard, setShowClassCard] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]); // Múltiples partidas
  const [showMatchOptions, setShowMatchOptions] = useState(false); // Dialog para múltiples opciones
  const [selectedGroupSize, setSelectedGroupSize] = useState<1 | 2 | 3 | 4>(1); // Selector de precios por alumnos
  const [pricePerPlayers, setPricePerPlayers] = useState<1 | 4>(4); // Selector precio partidas: 1 jugador o 4 jugadores
  const [selectedDuration, setSelectedDuration] = useState<30 | 60 | 90 | 120>(60); // Selector de duración para reservar pistas
  const [durationConfirmed, setDurationConfirmed] = useState(false); // Control de confirmación de duración
  const [viewType, setViewType] = useState<'clases' | 'partidas' | 'reservar-pistas'>('partidas'); // Selector principal
  const [currentTime, setCurrentTime] = useState(new Date()); // Hora actual para overlay
  
  // Sincronizar cambios de fecha con el padre
  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };
  
  // Sincronizar currentDate cuando cambia initialDate (al volver a la pestaña)
  useEffect(() => {
    if (initialDate && initialDate.getTime() !== currentDate.getTime()) {
      setCurrentDate(initialDate);
    }
  }, [initialDate]);
  
  // Estados para reservas de instructor y reservas de pistas
  const [instructorReservations, setInstructorReservations] = useState<any[]>([]);
  const [courtReservations, setCourtReservations] = useState<any[]>([]); // Reservas de usuarios normales
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [showCourtReservation, setShowCourtReservation] = useState(false);
  const [selectedCourtSlot, setSelectedCourtSlot] = useState<{ date: Date; time: string; courtNumber?: number } | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const { toast } = useToast();
  const [selectedReservationSlot, setSelectedReservationSlot] = useState<{
    courtId: string;
    courtNumber: number;
    timeSlot: string;
    existingReservation?: any;
  } | null>(null);

  // Actualizar hora actual cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, []);

  // Helper function to get local date string in YYYY-MM-DD format
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para verificar si un slot ya pasó
  const isTimeSlotPast = (timeSlot: string): boolean => {
    const now = currentTime;
    const today = getLocalDateString(currentDate);
    const nowDateStr = getLocalDateString(now);
    
    // Si estamos viendo un día diferente al actual, no marcar nada como pasado
    if (today !== nowDateStr) {
      return false; // No aplicar overlay a días futuros o pasados completos
    }
    
    // Solo si estamos en el día actual, verificar hora por hora
    // Parsear el slot (ej: "09:00" o "09:30")
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotTime = new Date(now);
    slotTime.setHours(hours, minutes, 0, 0);
    
    // Considerar pasado si el slot terminó (slot + 30 min)
    const slotEndTime = new Date(slotTime.getTime() + 30 * 60 * 1000);
    return slotEndTime < now;
  };

  // Auto-seleccionar instructor si se proporciona instructorId
  useEffect(() => {
    if (instructorId) {
      setSelectedInstructor(instructorId);
      setViewType('clases');
    }
  }, [instructorId]);

  // Sincronizar viewType con selectedInstructor
  useEffect(() => {
    if (viewType === 'partidas' || viewType === 'reservar-pistas') {
      if (!instructorId) { // Solo permitir cambio si no hay instructorId forzado
        setSelectedInstructor(null);
      }
    }
    // Removida auto-selección de instructor en modo clases
  }, [viewType, instructorId]);

  // Leer instructor de URL params al cargar
  useEffect(() => {
    const instructorParam = searchParams.get('instructor');
    if (instructorParam && calendarData?.instructors) {
      const instructorExists = calendarData.instructors.some(i => i.id === instructorParam);
      if (instructorExists) {
        setSelectedInstructor(instructorParam);
        setViewType('clases'); // Cambiar automáticamente a clases
      }
    }
    
    // Leer viewType de la URL
    const viewTypeParam = searchParams.get('viewType') as 'clases' | 'partidas' | 'reservar-pistas' | null;
    if (viewTypeParam && ['clases', 'partidas', 'reservar-pistas'].includes(viewTypeParam)) {
      setViewType(viewTypeParam);
    }
  }, [searchParams, calendarData]);

  // Cargar reservas del instructor
  useEffect(() => {
    console.log('%c🎯 useEffect INSTRUCTOR RESERVATIONS - INICIANDO', 'background: #222; color: #bada55; font-size: 16px;');
    console.log('📋 clubId:', clubId);
    console.log('📋 currentDate:', currentDate);
    console.log('📋 clubId existe?:', !!clubId);
    
    if (!clubId) {
      console.log('%c⚠️ NO HAY clubId - SALTANDO', 'background: #ff0000; color: #ffffff; font-size: 14px;');
      return;
    }
    
    console.log('%c✅ CLUB ID DISPONIBLE - EJECUTANDO FETCH', 'background: #00ff00; color: #000000; font-size: 14px;');
    
    const loadInstructorReservations = async () => {
      console.log('%c📅 FETCH - Iniciando carga de reservas', 'background: #0000ff; color: #ffffff; font-size: 14px;');
      console.log('📅 Club:', clubId);
      console.log('📅 Fecha:', getLocalDateString(currentDate));
      
      try {
        const token = localStorage.getItem('auth_token');
        const dateParam = getLocalDateString(currentDate);
        
        // Cargar TODAS las reservas de instructores del club (no solo del instructor actual)
        const url = `/api/instructor/court-reservations?clubId=${clubId}&date=${dateParam}`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setInstructorReservations(data.reservations || []);
        }
      } catch (error) {
        // Error silencioso
      }
    };
    
    loadInstructorReservations();
  }, [clubId, currentDate]);

  // Listener para recargar cuando se actualizan los horarios del club
  useEffect(() => {
    const handleHoursUpdate = (event: CustomEvent) => {
      if (event.detail.clubId === clubId) {
        console.log('🔄 Horarios actualizados, recargando...');
        // Forzar recarga cambiando referencia de fecha
        handleDateChange(new Date(currentDate.getTime()));
      }
    };
    
    window.addEventListener('club-hours-updated', handleHoursUpdate as EventListener);
    return () => window.removeEventListener('club-hours-updated', handleHoursUpdate as EventListener);
  }, [clubId, currentDate]);

  // Cargar datos del calendario
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const dateParam = getLocalDateString(currentDate);
        
        console.log('🔄 Iniciando carga del calendario:', { clubId, dateParam });
        
        // ⚡ CACHÉ: Evitar recargar si ya tenemos datos del mismo día
        const cacheKey = `calendar-${clubId}-${dateParam}`;
        const lastFetch = sessionStorage.getItem(`${cacheKey}-timestamp`);
        const cachedData = sessionStorage.getItem(cacheKey);
        
        const cacheAge = lastFetch ? Date.now() - parseInt(lastFetch) : Infinity;
        const CACHE_TTL = 60000; // 1 minuto de cache
        
        if (cachedData && cacheAge < CACHE_TTL) {
          console.log('⚡ Usando datos en caché del calendario');
          const data = JSON.parse(cachedData);
          setCalendarData(data);
          setClassProposals(data.proposedClasses || []);
          setConfirmedClasses(data.confirmedClasses || []);
          setMatchProposals(data.proposedMatches || []);
          setConfirmedMatches(data.confirmedMatches || []);
          setLoading(false);
          return;
        }
        
        // Crear startDate (00:00) y endDate (23:59:59) del mismo día
        const startDate = `${dateParam}T00:00:00.000Z`;
        const endDate = `${dateParam}T23:59:59.999Z`;
        
        const url = `/api/admin/calendar?clubId=${clubId}&startDate=${startDate}&endDate=${endDate}`;
        console.log('🌐 Fetching:', url);
        
        // ⚡ OPTIMIZACIÓN: Solo cargar desde /api/admin/calendar (que ya incluye las clases)
        const calRes = await fetch(url, {
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        console.log('📡 Respuesta recibida:', { status: calRes.status, ok: calRes.ok });
        
        // Procesar respuesta del calendario
        if (calRes.ok) {
          const data = await calRes.json();
          console.log('✅ Datos parseados correctamente');
          console.log('📊 Estadísticas:', {
            courts: data.courts?.length,
            instructors: data.instructors?.length,
            proposedClasses: data.proposedClasses?.length,
            confirmedClasses: data.confirmedClasses?.length,
            proposedMatches: data.proposedMatches?.length,
            confirmedMatches: data.confirmedMatches?.length
          });
          console.log('📅 Datos del calendario recibidos:', data);
          console.log('🕐 Horarios del club:', data.club?.openingHours);
          console.log('🏆 Propuestas de partidas:', data.proposedMatches);
          console.log('✅ Partidas confirmadas:', data.confirmedMatches);
          
          // ✅ PRIMERO: Actualizar el estado (crítico)
          setCalendarData(data);
          setClassProposals(data.proposedClasses || []);
          setConfirmedClasses(data.confirmedClasses || []);
          setMatchProposals(data.proposedMatches || []);
          setConfirmedMatches(data.confirmedMatches || []);
          setCourtReservations(data.courtReservations || []); // Reservas de pista de usuarios
          
          // LUEGO: Intentar guardar en caché (opcional, puede fallar)
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
            sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString());
            console.log('💾 Datos guardados en caché');
          } catch (cacheError) {
            console.warn('⚠️ No se pudo guardar en caché (datos muy grandes):', cacheError);
            // Ignorar el error de caché - no es crítico
          }
          
          // Extraer clases del API (ahora incluidas en la respuesta del calendario)
          if (data.proposedClasses) {
            console.log('🔵 Asignando propuestas de clases:', data.proposedClasses.length);
            setClassProposals(data.proposedClasses);
          }
          if (data.confirmedClasses) {
            console.log('🟢 Asignando clases confirmadas:', data.confirmedClasses.length);
            setConfirmedClasses(data.confirmedClasses);
          }
          
          // Extraer partidas del API
          if (data.proposedMatches) {
            console.log('🔵 Asignando propuestas de partidas:', data.proposedMatches.length);
            setMatchProposals(data.proposedMatches);
          }
          if (data.confirmedMatches) {
            console.log('🟢 Asignando partidas confirmadas:', data.confirmedMatches.length);
            setConfirmedMatches(data.confirmedMatches);
          }
        } else {
          console.error('❌ Error en respuesta del calendario:', calRes.status);
          const errorText = await calRes.text();
          console.error('❌ Respuesta:', errorText);
        }
      } catch (error) {
        console.error('❌ Error cargando calendario:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clubId, currentDate]);

  // Generar slots de tiempo según horario del club (reactivo)
  const timeSlots = useMemo(() => {
    console.log('🔄 Recalculando timeSlots');
    // console.log('📊 openingHours:', calendarData?.club?.openingHours);
    console.log('📅 currentDate:', currentDate);
    // console.log('🏢 Club completo:', calendarData?.club);
    
    // Valores por defecto si no hay configuración del club
    let startHour = 6;
    let endHour = 23;
    
    // Obtener horarios del club si están disponibles
    // if (calendarData?.club?.openingHours) {
    //   const openingHours = calendarData.club.openingHours;
    if (false) {  // Temporalmente deshabilitado hasta que se agregue club al tipo
      const openingHours = null as any;
      console.log('📋 Tipo de openingHours:', typeof openingHours);
      
      // Nuevo formato: objeto con días de la semana (monday, tuesday, etc.) con arrays de booleanos
      if (typeof openingHours === 'object' && !Array.isArray(openingHours)) {
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDate.getDay()];
        console.log('📆 Día de la semana:', dayOfWeek);
        const todayHours = openingHours[dayOfWeek as keyof typeof openingHours];
        console.log('⏰ Horarios de hoy:', todayHours);
        
        if (Array.isArray(todayHours) && todayHours.length === 19) {
          // Encontrar primera hora abierta (índice 0 = 6:00, índice 1 = 7:00, etc.)
          const firstOpen = todayHours.findIndex(h => h);
          const lastOpen = todayHours.lastIndexOf(true);
          
          if (firstOpen !== -1 && lastOpen !== -1) {
            startHour = firstOpen + 6;  // índice 0 = 6:00 AM
            endHour = lastOpen + 6;      // índice 18 = 24:00 (medianoche)
            console.log(`✅ Horarios calculados: ${startHour}:00 - ${endHour + 1}:00`);
          }
        }
      }
      // Formato legacy: array de booleanos (todos los días iguales)
      else if (Array.isArray(openingHours) && openingHours.length === 19) {
        const firstOpen = openingHours.findIndex(h => h);
        const lastOpen = openingHours.lastIndexOf(true);
        
        if (firstOpen !== -1 && lastOpen !== -1) {
          startHour = firstOpen + 6;
          endHour = lastOpen + 6;
          console.log(`✅ Horarios legacy calculados: ${startHour}:00 - ${endHour + 1}:00`);
        }
      }
      // Formato string "09:00-22:00"
      else if (typeof openingHours === 'string') {
        const match = openingHours.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/);
        if (match) {
          startHour = parseInt(match[1]);
          endHour = parseInt(match[3]) - 1;
          console.log(`✅ Horarios string calculados: ${startHour}:00 - ${endHour + 1}:00`);
        }
      }
    }
    
    const slots = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    console.log(`📊 Slots generados: ${slots.length} (${slots[0]} - ${slots[slots.length - 1]})`);
    return slots;
  }, [currentDate]);  // Removido calendarData?.club?.openingHours de las dependencias

  // Verificar si hay reserva en un slot específico (clases o partidas confirmadas)
  const hasReservationInSlot = (courtId: string, timeSlot: string) => {
    if (!calendarData) return null;

    const [hour, minute] = timeSlot.split(':');
    const slotTime = new Date(currentDate);
    slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);

    // Buscar en clases confirmadas
    const classReservation = (calendarData.confirmedClasses || []).find(cls => {
      const clsStart = new Date(cls.start);
      const clsEnd = new Date(cls.end);
      return cls.courtId === courtId && clsStart <= slotTime && clsEnd > slotTime;
    });
    
    if (classReservation) return classReservation;
    
    // Buscar en partidas confirmadas
    const matchReservation = confirmedMatches.find(match => {
      const matchStart = new Date(match.start);
      const matchEnd = new Date(match.end);
      // Comparar por courtNumber en lugar de courtId
      const court = calendarData.courts.find(c => c.id === courtId);
      return court && match.courtNumber === court.number && matchStart <= slotTime && matchEnd > slotTime;
    });
    
    if (matchReservation) {
      // Transformar partida confirmada a formato de evento
      return {
        ...matchReservation,
        type: 'match-confirmed',
        title: 'Partida',
        color: 'green',
        playersCount: matchReservation.bookings?.filter((b: any) => b.status !== 'CANCELLED').length || 0,
        maxPlayers: 4,
        price: matchReservation.courtRentalPrice,
        duration: matchReservation.duration || 90,
        bookings: matchReservation.bookings || []
      };
    }

    return null;
  };

  // Verificar si es el inicio de una reserva
  const isReservationStart = (reservation: CalendarEvent | null, timeSlot: string) => {
    if (!reservation) return false;

    const [hour, minute] = timeSlot.split(':');
    const resStart = new Date(reservation.start);

    return resStart.getHours() === parseInt(hour) && resStart.getMinutes() === parseInt(minute);
  };

  // Calcular rowspan
  const calculateRowSpan = (event: CalendarEvent) => {
    return (event.duration || 60) / 30;
  };
  
  // Handler para abrir tarjeta de clase (con filtrado inteligente por nivel)
  const handleProposalClick = (timeSlot: string, instructorId: string) => {
    const classes = getClassProposalsInSlot(timeSlot, instructorId);
    
    if (classes.length === 0) return;
    
    if (classes.length === 1) {
      // Solo una opción, abrirla directamente
      setSelectedClassId(classes[0].id);
      setShowClassCard(true);
    } else {
      // Múltiples opciones, mostrar selector
      setSelectedMatchIds(classes.map(c => c.id));
      setShowMatchOptions(true);
    }
  };

  // Handler para abrir opciones de partidas (cuando hay múltiples)
  const handleMatchProposalClick = (timeSlot: string) => {
    const matches = getMatchProposalsInSlot(timeSlot);
    
    if (matches.length === 0) return;
    
    if (matches.length === 1) {
      // Solo una opción, abrirla directamente
      setSelectedClassId(matches[0].id);
      setShowClassCard(true);
    } else {
      // Múltiples opciones, mostrar selector
      setSelectedMatchIds(matches.map(m => m.id));
      setShowMatchOptions(true);
    }
  };

  // Encontrar TODAS las propuestas de partida en un slot (abiertas + nivel del usuario)
  const getMatchProposalsInSlot = (timeSlot: string) => {
    const [hour, minute] = timeSlot.split(':');
    const slotTime = new Date(currentDate);
    slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    // Filtrar todas las partidas que coincidan con el horario
    const allMatches = matchProposals.filter(match => {
      const matchStart = new Date(match.start);
      return matchStart.getTime() === slotTime.getTime();
    });
    
    if (!currentUser || !currentUser.level) {
      // Sin usuario o nivel, mostrar todas
      return allMatches;
    }
    
    const userLevel = parseFloat(currentUser.level);
    
    // Filtrar partidas relevantes para el usuario
    const relevantMatches = allMatches.filter(match => {
      // Siempre incluir partidas abiertas
      if (match.isOpen) return true;
      
      // Incluir partidas del rango del usuario
      if (match.level) {
        const [minLevel, maxLevel] = match.level.split('-').map(parseFloat);
        return userLevel >= minLevel && userLevel <= maxLevel;
      }
      
      return false;
    });
    
    return relevantMatches;
  };

  // Encontrar propuesta de partida en un slot específico (para visualización en calendario)
  const getMatchProposalInSlot = (timeSlot: string) => {
    const matches = getMatchProposalsInSlot(timeSlot);
    return matches.length > 0 ? matches[0] : null; // Retornar la primera para visualización
  };

  // Obtener bookings del usuario en formato para DateSelector
  const getUserBookingsForDateSelector = () => {
    if (!currentUser) return [];
    
    const userBookings: any[] = [];
    
    // Agregar bookings de clases confirmadas
    confirmedClasses.forEach((classItem: any) => {
      if (classItem.bookings && Array.isArray(classItem.bookings)) {
        classItem.bookings.forEach((booking: any) => {
          // Excluir bookings cancelados (incluyendo los reciclados)
          if (booking.userId === currentUser.id && booking.status !== 'CANCELLED') {
            userBookings.push({
              timeSlotId: classItem.id,
              status: 'CONFIRMED', // Clase confirmada = Reserva (R)
              date: new Date(classItem.start)
            });
          }
        });
      }
    });
    
    // Agregar bookings de propuestas de clases
    classProposals.forEach((classItem: any) => {
      if (classItem.bookings && Array.isArray(classItem.bookings)) {
        classItem.bookings.forEach((booking: any) => {
          // Excluir bookings cancelados
          if (booking.userId === currentUser.id && booking.status !== 'CANCELLED') {
            userBookings.push({
              timeSlotId: classItem.id,
              status: 'PENDING', // Propuesta = Inscripción (I)
              date: new Date(classItem.start)
            });
          }
        });
      }
    });
    
    // Agregar bookings de partidas confirmadas
    confirmedMatches.forEach((match: any) => {
      if (match.bookings && Array.isArray(match.bookings)) {
        match.bookings.forEach((booking: any) => {
          // Excluir bookings cancelados (incluyendo los reciclados)
          if (booking.userId === currentUser.id && booking.status !== 'CANCELLED') {
            userBookings.push({
              timeSlotId: match.id,
              status: 'CONFIRMED', // Partida confirmada = Reserva (R)
              date: new Date(match.start)
            });
          }
        });
      }
    });
    
    // Agregar bookings de propuestas de partidas
    matchProposals.forEach((match: any) => {
      if (match.bookings && Array.isArray(match.bookings)) {
        match.bookings.forEach((booking: any) => {
          // Excluir bookings cancelados
          if (booking.userId === currentUser.id && booking.status !== 'CANCELLED') {
            userBookings.push({
              timeSlotId: match.id,
              status: 'PENDING', // Propuesta = Inscripción (I)
              date: new Date(match.start)
            });
          }
        });
      }
    });
    
    console.log('📅 UserBookings para DateSelector:', userBookings.length, userBookings);
    return userBookings;
  };

  // Encontrar TODAS las propuestas de clases en un slot (abiertas + nivel del usuario)
  const getClassProposalsInSlot = (timeSlot: string, instructorId: string | null) => {
    if (!instructorId) return [];
    
    const [hour, minute] = timeSlot.split(':');
    const slotTime = new Date(currentDate);
    slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    // Filtrar todas las clases que coincidan con el horario e instructor
    const allClasses = classProposals.filter(proposal => {
      if (proposal.instructorId !== instructorId) return false;
      
      const propStart = new Date(proposal.start);
      return propStart.getTime() === slotTime.getTime();
    });
    
    // Si es vista de club/admin (viewMode === 'club'), mostrar TODAS las clases sin filtrar por nivel
    if (viewMode === 'club') {
      return allClasses;
    }
    
    if (!currentUser || !currentUser.level) {
      // Sin usuario o nivel, mostrar todas
      return allClasses;
    }
    
    const userLevel = parseFloat(currentUser.level);
    
    // Filtrar clases relevantes para el usuario
    const relevantClasses = allClasses.filter(classItem => {
      // Siempre incluir clases abiertas (sin levelRange o isOpen)
      if (!classItem.levelRange || classItem.levelRange === 'abierto') return true;
      
      // Incluir clases del rango del usuario
      if (classItem.levelRange) {
        const [minLevel, maxLevel] = classItem.levelRange.split('-').map(parseFloat);
        return userLevel >= minLevel && userLevel <= maxLevel;
      }
      
      return false;
    });
    
    return relevantClasses;
  };

  // Encontrar propuesta de clase real en un slot específico (para visualización)
  const getClassProposalInSlot = (timeSlot: string, instructorId: string | null) => {
    const classes = getClassProposalsInSlot(timeSlot, instructorId);
    return classes.length > 0 ? classes[0] : null; // Retornar la primera para visualización
  };

  // Encontrar clase confirmada en un slot específico (inicio o durante)
  const getConfirmedClassInSlot = (timeSlot: string, courtNumber: number) => {
    const [hour, minute] = timeSlot.split(':');
    const slotTime = new Date(currentDate);
    slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    const confirmedClass = confirmedClasses.find(cls => {
      // Buscar por courtNumber o por courtId que coincida con el court number
      const matchesCourt = cls.courtNumber === courtNumber || 
                          (cls.courtId && calendarData?.courts.find(c => c.id === cls.courtId)?.number === courtNumber);
      
      if (!matchesCourt) return false;
      
      const clsStart = new Date(cls.start);
      const clsEnd = new Date(cls.end);
      
      // Verificar si el slot está dentro del rango de la clase
      return clsStart.getTime() <= slotTime.getTime() && clsEnd.getTime() > slotTime.getTime();
    });
    
    if (confirmedClass) {
      console.log('✅ Clase confirmada encontrada:', {
        timeSlot,
        courtNumber,
        classId: confirmedClass.id,
        courtId: confirmedClass.courtId,
        start: confirmedClass.start
      });
    }
    
    return confirmedClass;
  };

  // Encontrar partida confirmada en un slot específico (inicio o durante)
  const getConfirmedMatchInSlot = (timeSlot: string, courtNumber: number) => {
    const [hour, minute] = timeSlot.split(':');
    const slotTime = new Date(currentDate);
    slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    const confirmedMatch = confirmedMatches.find(match => {
      // Buscar por courtNumber o por courtId que coincida con el court number
      const matchesCourt = match.courtNumber === courtNumber || 
                          (match.courtId && calendarData?.courts.find(c => c.id === match.courtId)?.number === courtNumber);
      
      if (!matchesCourt) return false;
      
      const matchStart = new Date(match.start);
      const matchEnd = new Date(match.end);
      
      // Verificar si el slot está dentro del rango de la partida
      return matchStart.getTime() <= slotTime.getTime() && matchEnd.getTime() > slotTime.getTime();
    });
    
    if (confirmedMatch) {
      console.log('✅ Partida confirmada encontrada:', {
        timeSlot,
        courtNumber,
        matchId: confirmedMatch.id,
        courtId: confirmedMatch.courtId,
        start: confirmedMatch.start
      });
    }
    
    return confirmedMatch;
  };

  // Verificar si es el inicio de una clase confirmada
  const isConfirmedClassStart = (confirmedClass: any, timeSlot: string) => {
    if (!confirmedClass) return false;
    
    const [hour, minute] = timeSlot.split(':');
    const clsStart = new Date(confirmedClass.start);
    
    return clsStart.getHours() === parseInt(hour) && clsStart.getMinutes() === parseInt(minute);
  };

  // Verificar si es el inicio de una partida confirmada
  const isConfirmedMatchStart = (confirmedMatch: any, timeSlot: string) => {
    if (!confirmedMatch) return false;
    
    const [hour, minute] = timeSlot.split(':');
    const matchStart = new Date(confirmedMatch.start);
    
    return matchStart.getHours() === parseInt(hour) && matchStart.getMinutes() === parseInt(minute);
  };

  // Calcular rowspan para clase confirmada
  const calculateConfirmedClassRowSpan = (confirmedClass: any) => {
    const start = new Date(confirmedClass.start);
    const end = new Date(confirmedClass.end);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return Math.ceil(durationMinutes / 30);
  };

  // Calcular rowspan para partida confirmada
  const calculateConfirmedMatchRowSpan = (confirmedMatch: any) => {
    const start = new Date(confirmedMatch.start);
    const end = new Date(confirmedMatch.end);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return Math.ceil(durationMinutes / 30);
  };

  // Funciones helper para reservas de instructor
  const getInstructorReservationInSlot = (courtId: string, timeSlot: string) => {
    if (instructorReservations.length === 0) return null;
    
    const [hour, minute] = timeSlot.split(':');
    const slotTime = new Date(currentDate);
    slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    // Buscar cualquier reserva de instructor en este slot (no solo del instructor actual)
    return instructorReservations.find(res => {
      const resStart = new Date(res.startTime);
      const resEnd = new Date(res.endTime);
      return res.courtId === courtId && slotTime >= resStart && slotTime < resEnd;
    });
  };

  const isInstructorReservationStart = (reservation: any, timeSlot: string) => {
    if (!reservation) return false;
    const [hour, minute] = timeSlot.split(':');
    const resStart = new Date(reservation.startTime);
    return resStart.getHours() === parseInt(hour) && resStart.getMinutes() === parseInt(minute);
  };

  const calculateInstructorReservationRowSpan = (reservation: any) => {
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return Math.ceil(durationMinutes / 30);
  };

  const handleReservationClick = (courtId: string, courtNumber: number, timeSlot: string, existingReservation?: any) => {
    setSelectedReservationSlot({
      courtId,
      courtNumber,
      timeSlot,
      existingReservation,
    });
    setShowReservationDialog(true);
  };

  const handleReservationSuccess = () => {
    console.log('🎉 Reserva creada exitosamente, recargando datos...');
    // Recargar reservas de todos los instructores del club
    const loadReservations = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const dateParam = getLocalDateString(currentDate);
        console.log('📅 Recargando reservas para:', { clubId, dateParam });
        const response = await fetch(
          `/api/instructor/court-reservations?clubId=${clubId}&date=${dateParam}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Reservas recargadas:', data.reservations?.length || 0, data.reservations);
          setInstructorReservations(data.reservations || []);
        } else {
          const errorData = await response.json();
          console.error('❌ Error en respuesta:', errorData);
        }
      } catch (error) {
        console.error('❌ Error recargando reservas:', error);
      }
    };
    
    loadReservations();
  };

  // Funciones para reservas de usuarios normales
  const getUserReservationInSlot = (courtId: string, timeSlot: string) => {
    if (courtReservations.length === 0) return null;
    
    const [hour, minute] = timeSlot.split(':');
    const slotDate = new Date(currentDate);
    slotDate.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
    const slotTime = slotDate.getTime();
    
    return courtReservations.find(res => {
      const start = new Date(res.start || res.startTime).getTime();
      const end = new Date(res.end || res.endTime).getTime();
      return res.courtId === courtId && slotTime >= start && slotTime < end;
    });
  };

  const isUserReservationStart = (reservation: any, timeSlot: string) => {
    if (!reservation) return false;
    const [hour, minute] = timeSlot.split(':');
    const resStart = new Date(reservation.start || reservation.startTime);
    return resStart.getHours() === parseInt(hour) && resStart.getMinutes() === parseInt(minute);
  };

  const calculateUserReservationRowSpan = (reservation: any) => {
    const start = new Date(reservation.start || reservation.startTime);
    const end = new Date(reservation.end || reservation.endTime);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return Math.ceil(durationMinutes / 30);
  };

  // Verificar si el instructor tiene clase en este slot
  const instructorHasClassInSlot = (timeSlot: string) => {
    if (!selectedInstructor || !calendarData) return false;

    const [hour, minute] = timeSlot.split(':');
    const slotTime = new Date(currentDate);
    slotTime.setHours(parseInt(hour), parseInt(minute), 0, 0);

    return (calendarData.confirmedClasses || []).some(cls => {
      if (cls.instructorId !== selectedInstructor) return false;

      const clsStart = new Date(cls.start);
      const clsEnd = new Date(cls.end);

      return clsStart <= slotTime && clsEnd > slotTime;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-lg text-gray-600">Cargando calendario...</div>
      </div>
    );
  }

  if (!calendarData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-lg text-gray-600">No se pudo cargar el calendario</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 px-4 py-6 md:px-6 lg:px-8 relative">
      {/* Overlay oscuro cuando modo clases sin instructor - Deja visible solo botones de instructores */}
      {viewType === 'clases' && !selectedInstructor && calendarData.instructors.length > 0 && (
        <div 
          className="fixed inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/60 backdrop-blur-[2px] z-[120] transition-all duration-700 ease-out" 
        />
      )}
      
      <div className="max-w-[100%] lg:max-w-[1600px] mx-auto space-y-3">
        {/* Selector de Fecha */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
          <DateSelector
            selectedDate={currentDate}
            onDateChange={handleDateChange}
            daysToShow={14}
            userBookings={getUserBookingsForDateSelector()}
            layoutOrientation="horizontal"
          />
        </div>

        {/* Toggle Clases / Partidas / Reservar Pistas - Oculto en modo instructor */}
        {!instructorId && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                console.log('🔘 Click en botón CLASES');
                setViewType('clases');
                // Agregar viewType a la URL
                const currentParams = new URLSearchParams(window.location.search);
                currentParams.set('viewType', 'clases');
                router.push(`${window.location.pathname}?${currentParams.toString()}`);
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                viewType === 'clases'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              📚 Clases
            </button>
            <button
              onClick={() => {
                console.log('🔘 Click en botón PARTIDAS');
                setViewType('partidas');
                setSelectedInstructor(null);
                // Agregar viewType a la URL
                const currentParams = new URLSearchParams(window.location.search);
                currentParams.set('viewType', 'partidas');
                currentParams.delete('instructor'); // Remover instructor de la URL
                router.push(`${window.location.pathname}?${currentParams.toString()}`);
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                viewType === 'partidas'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              🏆 Partidas
            </button>
            <button
              onClick={() => {
                console.log('🔘 Click en botón RESERVAR PISTAS');
                setViewType('reservar-pistas');
                setSelectedInstructor(null);
                // Agregar viewType a la URL
                const currentParams = new URLSearchParams(window.location.search);
                currentParams.set('viewType', 'reservar-pistas');
                currentParams.delete('instructor'); // Remover instructor de la URL
                router.push(`${window.location.pathname}?${currentParams.toString()}`);
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                viewType === 'reservar-pistas'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              🎾 Reservar Pistas
            </button>
          </div>
        )}

        {/* Banner de aviso: seleccionar instructor */}
        {viewType === 'clases' && !selectedInstructor && calendarData.instructors.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="text-white text-4xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Selecciona un Instructor</h3>
                <p className="text-sm text-white/90">
                  Para ver las propuestas de clases, selecciona un instructor desde la barra lateral izquierda.
                </p>
              </div>
              <div className="text-white text-4xl animate-bounce">👈</div>
            </div>
          </div>
        )}

        {/* Banner del Instructor Seleccionado */}
        {viewType === 'clases' && selectedInstructor && calendarData.instructors.find(i => i.id === selectedInstructor) && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-2">
            <div className="flex items-center justify-between gap-4">
              {/* Izquierda: Contenedor con logo y texto */}
              <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500 shadow-lg bg-white flex items-center justify-center">
                  <img
                    src={calendarData.instructors.find(i => i.id === selectedInstructor)?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(calendarData.instructors.find(i => i.id === selectedInstructor)?.name || 'Instructor')}&background=random&color=fff&size=128`}
                    alt={calendarData.instructors.find(i => i.id === selectedInstructor)?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-indigo-900 leading-tight">Calendario de Clases</h3>
                  <div className="text-xs text-indigo-700 leading-tight">Instructor: {calendarData.instructors.find(i => i.id === selectedInstructor)?.name}</div>
                </div>
              </div>
              
              {/* Derecha: Selector de precio por plaza */}
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <div className="text-[10px] font-semibold text-white uppercase tracking-wide mb-1">Precio por plaza</div>
                  <div className="text-[10px] font-semibold text-white uppercase tracking-wide">en clase de:</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex gap-1.5 mb-0.5">
                    {[1, 2, 3, 4].map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedGroupSize(size as 1 | 2 | 3 | 4)}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                          selectedGroupSize === size
                            ? 'bg-white text-indigo-600 scale-105'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        style={selectedGroupSize === size ? { boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.5)' } : {}}
                        title={`${size} ${size === 1 ? 'Alumno' : 'Alumnos'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  <div className="text-[9px] font-medium text-white uppercase tracking-wide">Alumnos</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banner del Calendario de Partidas */}
        {viewType === 'partidas' && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-lg p-2">
            <div className="flex items-center justify-between gap-4">
              {/* Izquierda: Contenedor con logo y texto */}
              {currentUser && (
                <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-green-500 shadow-lg bg-white flex items-center justify-center">
                    <img
                      src={currentUser.profilePicture || currentUser.photo || currentUser.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Usuario')}&background=10b981&color=fff&size=128`}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Usuario')}&background=10b981&color=fff&size=128`;
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-green-900 leading-tight">Calendario de Partidas</h3>
                    <div className="text-xs text-green-700 leading-tight">Nivel: {currentUser.level || 'N/A'}</div>
                  </div>
                </div>
              )}
              
              {/* Derecha: Selector de precio por 1 jugador o 4 jugadores */}
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <div className="text-xs font-semibold text-white">Ver precio por</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex gap-2">
                    {[1, 4].map((players) => (
                      <button
                        key={players}
                        onClick={() => setPricePerPlayers(players as 1 | 4)}
                        className={`w-10 h-10 rounded-lg text-lg font-bold transition-all ${
                          pricePerPlayers === players
                            ? 'bg-white text-green-600 scale-105'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        style={pricePerPlayers === players ? { boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.5)' } : {}}
                        title={`Precio para ${players} ${players === 1 ? 'jugador' : 'jugadores'}`}
                      >
                        {players}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs font-medium text-white mt-0.5">Jugadores</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banner de Reservar Pistas */}
        {viewType === 'reservar-pistas' && (
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-lg p-2">
            <div className="flex items-center justify-between gap-4">
              {/* Izquierda: Contenedor con logo y texto */}
              {currentUser && (
                <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500 shadow-lg bg-white flex items-center justify-center">
                    <img
                      src={currentUser.profilePicture || currentUser.photo || currentUser.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Usuario')}&background=f97316&color=fff&size=128`}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Usuario')}&background=f97316&color=fff&size=128`;
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-orange-900 leading-tight">Reservar Pista</h3>
                    <div className="text-xs text-orange-700 leading-tight">{currentUser.name}</div>
                  </div>
                </div>
              )}
              
              {/* Derecha: Selector de duración */}
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <div className="text-xs font-semibold text-white">Duración</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex gap-2">
                    {[30, 60, 90, 120].map((duration) => (
                      <button
                        key={duration}
                        onClick={() => setSelectedDuration(duration as 30 | 60 | 90 | 120)}
                        className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                          selectedDuration === duration
                            ? 'bg-white text-orange-600 scale-105'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        style={selectedDuration === duration ? { boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.5)' } : {}}
                        title={`${duration} minutos`}
                      >
                        {duration}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs font-medium text-white mt-0.5">Minutos</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendario Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-700 to-gray-600">
                  <th className="p-0.5 text-left font-bold border-r border-gray-500/50 min-w-[40px] text-white text-xs sticky left-0 bg-gray-700 z-10">
                    HORA
                  </th>
                  {calendarData.courts.map(court => (
                    <th key={court.id} className="p-2 text-center font-semibold border-r border-gray-500/50 text-white min-w-[80px] max-w-[120px]">
                      <div className="flex flex-col items-center">
                        <span className="text-xs">Pista {court.number}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot, slotIndex) => {
                  const isHalfHour = timeSlot.endsWith(':30');
                  return (
                    <tr key={timeSlot} className={`transition-colors hover:bg-gray-50/50 ${
                      isHalfHour ? 'bg-gray-100' : 'bg-white'
                    }`}>
                      <td className={`p-0.5 text-center font-bold border-r border-gray-100 text-xs sticky left-0 bg-white z-10 ${
                        isHalfHour ? 'text-gray-600 bg-gray-50' : 'text-gray-800'
                      }`}>
                        {timeSlot}
                      </td>
                      {calendarData.courts.map(court => {
                        const reservation = hasReservationInSlot(court.id, timeSlot);
                        const isPast = isTimeSlotPast(timeSlot);

                        // Si hay reserva y es el inicio, mostrar la reserva con rowspan
                        if (reservation && isReservationStart(reservation, timeSlot)) {
                          const rowSpan = calculateRowSpan(reservation);
                          return (
                            <td
                              key={court.id}
                              rowSpan={rowSpan}
                              className={`border border-gray-200 p-0.5 h-10 bg-white relative overflow-hidden ${isHalfHour ? 'border-b-[3px] border-b-gray-400 rounded-b-lg' : ''}`}
                              style={{ maxHeight: `${rowSpan * 40}px` }}
                            >
                              <div 
                                onClick={() => {
                                  if (reservation.type === 'match-confirmed' && reservation.id) {
                                    setSelectedClassId(reservation.id);
                                    setShowClassCard(true);
                                  }
                                }}
                                className={`rounded-xl h-full flex flex-col justify-between border-2 border-gray-400 ${
                                reservation.type === 'class-confirmed'
                                  ? 'bg-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]'
                                  : 'bg-green-500 shadow-[0_4px_12px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] cursor-pointer hover:shadow-[0_6px_16px_rgba(34,197,94,0.5)] transition-shadow'
                              }`}>
                                <div className="p-2 flex flex-col justify-center items-center h-full pointer-events-none">
                                  {reservation.type === 'match-confirmed' && (
                                    <>
                                      {/* Título grande y claro */}
                                      <div className="text-center mb-2">
                                        <div className="text-[14px] font-bold text-white">PARTIDA</div>
                                      </div>
                                      
                                      {/* Hora grande y destacada */}
                                      <div className="text-center mb-2">
                                        <div className="text-[20px] font-bold text-white">{timeSlot}</div>
                                      </div>
                                      
                                      {/* Nivel */}
                                      <div className="text-center mb-2">
                                        <div className="text-[12px] font-bold text-white">{reservation.level || 'Abierto'}</div>
                                      </div>
                                      
                                      {/* Jugadores en fila única con fotos grandes */}
                                      <div className="flex justify-center gap-1.5">
                                        {(() => {
                                          const activeBookings = reservation.bookings?.filter((b: any) => b.status !== 'CANCELLED' || (b.status === 'CANCELLED' && b.isRecycled === true)) || [];
                                          const slots = [];
                                          
                                          // Renderizar slots según groupSize
                                          activeBookings.forEach((booking: any, bookingIdx: number) => {
                                            const playerName = booking.user?.name || booking.userName || `Jugador ${bookingIdx+1}`;
                                            const isRecycled = booking.status === 'CANCELLED' && booking.isRecycled === true;
                                            const groupSize = booking.groupSize || 1;
                                            
                                            // Crear tantos avatares como plazas ocupe este booking
                                            for (let i = 0; i < groupSize; i++) {
                                              if (isRecycled) {
                                                slots.push(
                                                  <div 
                                                    key={`${booking.id}-${i}`}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-md ring-2 ring-yellow-600 bg-yellow-400"
                                                    title="Plaza reciclada (solo puntos)"
                                                  >
                                                    <span className="text-[14px]">♻️</span>
                                                  </div>
                                                );
                                              } else {
                                                slots.push(
                                                  <div 
                                                    key={`${booking.id}-${i}`}
                                                    className="w-8 h-8 rounded-full overflow-hidden shadow-md ring-2 ring-white bg-white"
                                                    title={playerName}
                                                  >
                                                    <img
                                                      src={booking.user?.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&background=22c55e&color=fff&size=64`}
                                                      alt={playerName}
                                                      className="w-full h-full object-cover"
                                                    />
                                                  </div>
                                                );
                                              }
                                            }
                                          });
                                          
                                          // Calcular plazas vacías
                                          const totalOccupiedSlots = slots.length;
                                          const emptySlots = (reservation.maxPlayers || 4) - totalOccupiedSlots;
                                          
                                          // Añadir slots vacíos
                                          for (let i = 0; i < emptySlots; i++) {
                                            slots.push(
                                              <div 
                                                key={`empty-${i}`}
                                                className="w-8 h-8 rounded-full border-2 border-white/80 flex items-center justify-center bg-white/20"
                                              >
                                                <span className="text-[14px] text-white font-bold">+</span>
                                              </div>
                                            );
                                          }
                                          
                                          return slots;
                                        })()}
                                      </div>
                                    </>
                                  )}
                                  {reservation.type === 'class-confirmed' && (
                                    <>
                                      <div className="flex items-center gap-1 mb-1">
                                        <div className="w-5 h-5 rounded-full overflow-hidden shadow-md ring-1 ring-white bg-white">
                                          <img
                                            src={reservation.instructorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(reservation.instructorName || 'I')}&background=random&color=fff&size=64`}
                                            alt={reservation.instructorName}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <span className="text-[8px] font-bold text-white truncate flex-1">
                                          {reservation.instructorName}
                                        </span>
                                      </div>
                                      <div className="flex gap-0.5 justify-center">
                                        {Array.from({ length: reservation.playersCount || 0 }).map((_, i) => (
                                          <div key={i} className="w-3 h-3 rounded-full flex items-center justify-center ring-1 bg-white ring-blue-300">
                                            <span className="text-[7px] font-bold text-blue-700">{i + 1}</span>
                                          </div>
                                        ))}
                                        {Array.from({ length: (reservation.maxPlayers || 4) - (reservation.playersCount || 0) }).map((_, i) => (
                                          <div key={`empty-${i}`} className="w-3 h-3 rounded-full border border-white/50 bg-blue-400/30"></div>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Footer con precio y duración */}
                                <div className="flex items-center justify-between px-1.5 py-0.5 border-t bg-white/90 rounded-b-xl">
                                  <div className="text-[9px] font-bold text-gray-900">€{reservation.price || 0}</div>
                                  <div className="text-[9px] font-medium text-gray-700">{reservation.duration || 60} min</div>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        // Si hay reserva pero no es el inicio, skip (cubierto por rowspan)
                        if (reservation) {
                          return null;
                        }

                        // Si no hay reserva, verificar si hay clase confirmada de TimeSlots
                        const confirmedClass = getConfirmedClassInSlot(timeSlot, court.number);
                        
                        if (confirmedClass) {
                          // Si es el inicio de la clase, renderizar con rowspan
                          if (isConfirmedClassStart(confirmedClass, timeSlot)) {
                            const bookings = confirmedClass.bookings || [];
                            // ⭐ FIXED: Count actual player slots, not bookings
                            const bookingsCount = bookings.reduce((sum: number, b: any) => sum + (b.groupSize || 1), 0);
                            const maxPlayers = confirmedClass.maxPlayers || 4;
                            const rowSpan = calculateConfirmedClassRowSpan(confirmedClass);
                            const duration = confirmedClass.end && confirmedClass.start 
                              ? Math.round((new Date(confirmedClass.end).getTime() - new Date(confirmedClass.start).getTime()) / (1000 * 60))
                              : 60;
                            const pricePerPlayer = confirmedClass.totalPrice && confirmedClass.maxPlayers 
                              ? confirmedClass.totalPrice / confirmedClass.maxPlayers 
                              : 12;
                            
                            return (
                              <td 
                                key={court.id} 
                                rowSpan={rowSpan}
                                className={`border border-gray-200 p-0.5 bg-white relative overflow-hidden`}
                                style={{ maxHeight: `${rowSpan * 40}px`, verticalAlign: 'top' }}
                              >
                                <div 
                                  onClick={() => {
                                    setSelectedClassId(confirmedClass.id);
                                    setShowClassCard(true);
                                  }}
                                  className="bg-blue-500 rounded-xl h-full cursor-pointer hover:bg-blue-600 hover:scale-[1.02] transition-all shadow-[0_4px_12px_rgba(59,130,246,0.5)] border-2 border-blue-400 flex flex-col overflow-hidden relative"
                                >
                                  {/* Header con instructor y tipo */}
                                  <div className="p-1.5 pb-0.5">
                                    <div className="flex items-center gap-1 mb-1">
                                      <div className="w-6 h-6 rounded-full overflow-hidden shadow-md ring-2 ring-white bg-white">
                                        <img
                                          src={confirmedClass.instructorPhoto || confirmedClass.instructorProfilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(confirmedClass.instructorName || 'I')}&background=random&color=fff&size=64`}
                                          alt={confirmedClass.instructorName || 'Instructor'}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-1">
                                          <span className="text-[8px] font-semibold text-white/90">🎾 Clase</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-white truncate block">
                                          {confirmedClass.instructorName || 'Instructor'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Jugadores reservados con fotos - Grid 4 columnas */}
                                    <div className="grid grid-cols-4 gap-0.5">
                                      {Array.from({ length: maxPlayers }).map((_, i) => {
                                        const booking = bookings[i];
                                        const hasBooking = i < bookingsCount;
                                        const isRecycled = booking?.status === 'CANCELLED' && booking?.isRecycled === true;
                                        
                                        return (
                                          <div 
                                            key={i} 
                                            className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm overflow-hidden relative ${
                                              isRecycled
                                                ? 'bg-yellow-400 ring-2 ring-yellow-600'
                                                : hasBooking 
                                                ? 'bg-white ring-1 ring-blue-300' 
                                                : 'border-2 border-white/50 bg-blue-400/30'
                                            }`}
                                          >
                                            {isRecycled ? (
                                              <span className="text-[12px]" title="Plaza reciclada (solo puntos)">♻️</span>
                                            ) : hasBooking && booking?.user ? (
                                              <>
                                                <img
                                                  src={booking.user.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.user.name || 'U')}&background=random&color=fff&size=64`}
                                                  alt={booking.user.name || 'Usuario'}
                                                  className="w-full h-full object-cover"
                                                  title={`${booking.user.name || 'Usuario'} - Grupo de ${booking.groupSize || 1} alumno${(booking.groupSize || 1) > 1 ? 's' : ''}`}
                                                />
                                                {/* GroupSize Badge */}
                                                {booking.groupSize && booking.groupSize > 1 && (
                                                  <div
                                                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 border border-white flex items-center justify-center"
                                                    style={{ fontSize: '8px', lineHeight: '8px' }}
                                                    title={`${booking.groupSize} alumnos`}
                                                  >
                                                    <span className="text-white font-bold">{booking.groupSize}</span>
                                                  </div>
                                                )}
                                              </>
                                            ) : hasBooking ? (
                                              <span className="text-[11px] font-bold text-blue-700">{booking?.groupSize || (i + 1)}</span>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Footer con precio y duración */}
                                  <div className="flex items-center justify-between px-1.5 py-1 bg-white/95 mt-auto">
                                    <div className="text-[10px] font-bold text-blue-600">€{Math.round(pricePerPlayer)}</div>
                                    <div className="text-[9px] font-semibold text-gray-600">{duration} min</div>
                                  </div>
                                </div>
                              </td>
                            );
                          } else {
                            // Si no es el inicio, skip (ya está cubierto por rowspan)
                            return null;
                          }
                        }

                        // Verificar si hay partida confirmada de MatchGames (se muestra en ambos modos)
                        const confirmedMatch = getConfirmedMatchInSlot(timeSlot, court.number);
                        
                        if (confirmedMatch) {
                          // Si es el inicio de la partida, renderizar con rowspan
                          if (isConfirmedMatchStart(confirmedMatch, timeSlot)) {
                            const bookings = confirmedMatch.bookings || [];
                            const bookingsCount = bookings.length;
                            const maxPlayers = 4;
                            const rowSpan = calculateConfirmedMatchRowSpan(confirmedMatch);
                            const duration = confirmedMatch.end && confirmedMatch.start 
                              ? Math.round((new Date(confirmedMatch.end).getTime() - new Date(confirmedMatch.start).getTime()) / (1000 * 60))
                              : 90;
                            const pricePerPlayer = confirmedMatch.courtRentalPrice && bookingsCount > 0
                              ? confirmedMatch.courtRentalPrice / bookingsCount
                              : 20;
                            
                            return (
                              <td 
                                key={court.id} 
                                rowSpan={rowSpan}
                                className={`border border-gray-200 p-0.5 bg-white`}
                              >
                                <div 
                                  onClick={() => {
                                    setSelectedClassId(confirmedMatch.id);
                                    setShowClassCard(true);
                                  }}
                                  className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl h-full cursor-pointer hover:from-purple-600 hover:to-pink-600 hover:scale-[1.02] transition-all shadow-[0_4px_12px_rgba(168,85,247,0.5)] border-2 border-purple-400 flex flex-col overflow-hidden"
                                >
                                  {/* Header con nivel y tipo */}
                                  <div className="p-1.5 pb-0.5">
                                    <div className="flex items-center gap-1 mb-1">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-1">
                                          <span className="text-[8px] font-semibold text-white/90">🏆 Partida</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-white truncate block">
                                          Nivel: {confirmedMatch.level || 'Abierto'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Jugadores reservados con fotos - Grid 4 columnas */}
                                    <div className="grid grid-cols-4 gap-0.5">
                                      {Array.from({ length: maxPlayers }).map((_, i) => {
                                        const booking = bookings[i];
                                        const hasBooking = i < bookingsCount;
                                        
                                        return (
                                          <div 
                                            key={i} 
                                            className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm overflow-hidden ${
                                              hasBooking 
                                                ? 'bg-white ring-1 ring-purple-300' 
                                                : 'border-2 border-white/50 bg-purple-400/30'
                                            }`}
                                          >
                                            {hasBooking && booking?.user ? (
                                              <img
                                                src={booking.user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.user.name || 'U')}&background=a855f7&color=fff&size=64`}
                                                alt={booking.user.name}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : hasBooking ? (
                                              <span className="text-[9px] font-bold text-purple-700">{i + 1}</span>
                                            ) : (
                                              <span className="text-[9px] text-white/50">+</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Footer con precio y duración */}
                                  <div className="flex items-center justify-between px-1.5 py-0.5 border-t border-purple-300/50 bg-white/90 rounded-b-xl">
                                    <div className="text-[9px] font-bold text-gray-900">€{Math.round(pricePerPlayer)}</div>
                                    <div className="text-[8px] font-medium text-gray-700">{duration} min</div>
                                  </div>
                                </div>
                              </td>
                            );
                          } else {
                            // Si no es el inicio, skip (ya está cubierto por rowspan)
                            return null;
                          }
                        }
                        
                        // 1. PRIMERO verificar reservas de usuarios normales
                        const userReservation = getUserReservationInSlot(court.id, timeSlot);
                        
                        if (userReservation && isUserReservationStart(userReservation, timeSlot)) {
                          const rowSpan = calculateUserReservationRowSpan(userReservation);
                          const start = new Date(userReservation.start || userReservation.startTime);
                          const end = new Date(userReservation.end || userReservation.endTime);
                          const duration = Math.round((end.getTime() - start.getTime()) / 1000 / 60);
                          const userId = userReservation.reason?.split(':')[1] || '';
                          const isMyReservation = currentUser && currentUser.id === userId;
                          
                          return (
                            <td
                              key={court.id}
                              rowSpan={rowSpan}
                              className="border border-gray-200 p-0.5 bg-white"
                            >
                              <div
                                className={`rounded-xl h-full flex flex-col justify-center items-center border-2 ${
                                  isMyReservation 
                                    ? 'border-green-400 bg-gradient-to-br from-green-500 to-emerald-500' 
                                    : 'border-purple-400 bg-gradient-to-br from-purple-500 to-pink-500'
                                } shadow-lg`}
                              >
                                <div className="p-2 text-center">
                                  <div className="text-white text-xs font-bold mb-1">
                                    {isMyReservation ? '✅ TU RESERVA' : '🔒 RESERVADO'}
                                  </div>
                                  <div className="text-white text-lg font-bold mb-1">{timeSlot}</div>
                                  <div className="bg-white/90 rounded px-2 py-1 mb-1">
                                    <div className="text-gray-700 text-xs font-semibold">
                                      {isMyReservation ? 'Pista Reservada' : 'Reserva de Usuario'}
                                    </div>
                                  </div>
                                  <div className="text-white text-xs">{duration} min</div>
                                </div>
                              </div>
                            </td>
                          );
                        }
                        
                        // Si no es inicio pero está dentro de una reserva de usuario, skip
                        if (userReservation) {
                          return null;
                        }
                        
                        // 2. Verificar reservas de instructores (mostrar en TODOS los calendarios)
                        const instructorReservation = getInstructorReservationInSlot(court.id, timeSlot);
                        
                        console.log(`🔍 Slot ${timeSlot} Court ${court.number}: instructorReservation=`, instructorReservation ? 'FOUND' : 'null');
                        
                        if (instructorReservation && isInstructorReservationStart(instructorReservation, timeSlot)) {
                          const rowSpan = calculateInstructorReservationRowSpan(instructorReservation);
                          const [hour, minute] = timeSlot.split(':');
                          const duration = instructorReservation.duration || 60;
                          const isOwner = instructorId && instructorReservation.instructorId === instructorId;
                          
                          return (
                            <td
                              key={court.id}
                              rowSpan={rowSpan}
                              className="border border-gray-200 p-0.5 bg-white"
                            >
                              <div
                                onClick={() => {
                                  // Solo permitir edición si es el dueño y no es pasado
                                  if (isOwner && !isPast) {
                                    handleReservationClick(
                                      court.id,
                                      court.number,
                                      timeSlot,
                                      instructorReservation
                                    );
                                  }
                                }}
                                className={`rounded-xl h-full flex flex-col justify-center items-center border-2 border-orange-400 bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg ${
                                  isOwner && !isPast ? 'cursor-pointer hover:from-orange-600 hover:to-amber-600 hover:scale-[1.02] transition-all' : ''
                                }`}
                              >
                                <div className="p-2 text-center">
                                  <div className="text-white text-xs font-bold mb-1">
                                    {isOwner ? '📅 TU RESERVA' : '🔒 RESERVADO'}
                                  </div>
                                  <div className="text-white text-lg font-bold mb-1">{timeSlot}</div>
                                  <div className="bg-white/90 rounded px-2 py-1 mb-1">
                                    <div className="text-orange-700 text-xs font-semibold">{instructorReservation.label}</div>
                                  </div>
                                  {instructorReservation.instructorName && !isOwner && (
                                    <div className="text-white text-xs opacity-90 mb-1">
                                      Por: {instructorReservation.instructorName}
                                    </div>
                                  )}
                                  <div className="text-white text-xs">{duration} min</div>
                                </div>
                              </div>
                            </td>
                          );
                        }
                        
                        // Si no es inicio pero está dentro de una reserva, skip (rowspan lo cubre)
                        if (instructorReservation) {
                          return null;
                        }
                        
                        // Si no hay reserva ni clase confirmada, mostrar propuestas o celdas vacías
                        return (
                          <td key={court.id} className={`border border-gray-200 p-0.5 h-10 bg-white relative ${isHalfHour ? 'border-b-[3px] border-b-gray-400 rounded-b-lg' : ''}`}>
                            {(viewType === 'clases' && selectedInstructor) ? (() => {
                              const proposals = getClassProposalsInSlot(timeSlot, selectedInstructor);
                              const hasClass = instructorHasClassInSlot(timeSlot);
                              
                              if (proposals.length > 0 && !hasClass) {
                                const firstProposal = proposals[0];
                                const bookings = firstProposal.bookings || [];
                                const playersCount = bookings.length;
                                
                                // Calcular precio por plaza según el selector
                                const totalPrice = firstProposal.totalPrice || firstProposal.price || 48;
                                const pricePerSlot = totalPrice / selectedGroupSize;
                                
                                // Determinar nivel
                                let levelDisplay = 'Abierto';
                                if (firstProposal.levelRange) {
                                  levelDisplay = firstProposal.levelRange;
                                }
                                
                                // Si hay múltiples opciones, mostrar indicador
                                const hasMultipleOptions = proposals.length > 1;
                                
                                const instructor = calendarData.instructors.find(i => i.id === selectedInstructor);
                                
                                return (
                                  <div 
                                    onClick={() => handleProposalClick(timeSlot, selectedInstructor)}
                                    className="bg-white rounded-lg p-1 cursor-pointer hover:shadow-xl hover:scale-105 transition-all h-full border border-gray-300 shadow-lg flex items-center relative overflow-visible"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(255, 255, 255, 0.6)' }}
                                  >
                                    {/* Indicador de múltiples opciones - esquina superior izquierda */}
                                    {hasMultipleOptions && (
                                      <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md border-2 border-white z-10">
                                        {proposals.length}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1.5 w-full">
                                      {/* Foto del instructor a la izquierda */}
                                      <div className="flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-500 shadow-md">
                                          <img
                                            src={instructor?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor?.name || 'I')}&background=random&color=fff&size=64`}
                                            alt={instructor?.name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      </div>
                                      {/* Texto a la derecha en dos líneas */}
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[10px] text-blue-600 font-bold leading-tight">
                                          {playersCount > 0 ? `${playersCount} inscrito${playersCount > 1 ? 's' : ''}` : 'Iniciar Clase 60 Min'}
                                        </div>
                                        <div className="text-[8px] text-gray-700 font-semibold flex flex-col leading-tight">
                                          <span>Nivel/ {levelDisplay}</span>
                                          <span className="text-[7px] text-gray-600">Precio por {selectedGroupSize} jugador{selectedGroupSize > 1 ? 'es' : ''}</span>
                                        </div>
                                      </div>
                                      {/* Recuadro de precio alineado a la derecha */}
                                      <div className="flex-shrink-0 bg-white rounded-md px-2 py-1 border border-gray-200" style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                                        <div className="text-[7px] text-gray-600 leading-tight">Precio por</div>
                                        <div className="text-[7px] text-gray-600 leading-tight">jugador</div>
                                        <div className="text-sm font-bold text-gray-800 leading-tight">{Math.round(pricePerSlot)}€</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // No hay propuesta de clase
                              // Si es modo instructor (instructorId definido), siempre mostrar opción de reservar
                              if (instructorId && !isPast) {
                                // Celda clickeable para instructor
                                return (
                                  <div 
                                    onClick={() => handleReservationClick(court.id, court.number, timeSlot)}
                                    className="bg-white rounded-lg p-0.5 h-full border-2 border-dashed border-orange-300 hover:border-orange-500 hover:bg-orange-50 shadow-[0_2px_4px_rgba(0,0,0,0.08)] flex items-center justify-center cursor-pointer transition-all group"
                                  >
                                    <div className="text-center">
                                      <div className="text-[10px] text-orange-600 group-hover:text-orange-700 font-semibold">+ Reservar</div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              return (
                                <div className="h-full flex items-center justify-center bg-gray-100 rounded">
                                  <span className="text-[8px] text-gray-400">—</span>
                                </div>
                              );
                            })() : (viewType === 'clases' && !selectedInstructor) ? (() => {
                              // Modo clases SIN instructor seleccionado - mostrar celda con mensaje
                              return (
                                <div className="h-full flex items-center justify-center bg-amber-50 rounded border border-amber-200">
                                  <span className="text-[8px] text-amber-600 font-medium">👈 Instructor</span>
                                </div>
                              );
                            })() : (viewType === 'partidas') ? (() => {
                              // Modo Partidas - buscar propuestas de partida en este slot
                              const matchProposals = getMatchProposalsInSlot(timeSlot);
                              
                              if (matchProposals.length > 0) {
                                // Hay propuestas de partida en este slot
                                const firstMatch = matchProposals[0];
                                const bookings = firstMatch.bookings || [];
                                const playersCount = bookings.length;
                                const maxPlayers = 4;
                                const courtRentalPrice = firstMatch.courtRentalPrice || 20;
                                
                                // Calcular precio seg\u00fan selecci\u00f3n: 1 jugador (precio/4) o 4 jugadores (precio total)
                                const priceToShow = pricePerPlayers === 1 
                                  ? courtRentalPrice / 4 
                                  : courtRentalPrice;
                                
                                // Determinar nivel - usar el nivel del matchProposal
                                let levelDisplay = 'Abierto';
                                if (firstMatch.isOpen) {
                                  levelDisplay = 'Abierto';
                                } else if (firstMatch.level) {
                                  levelDisplay = firstMatch.level;
                                }
                                
                                // Determinar categoría
                                let categoryDisplay = 'Abierta';
                                if (firstMatch.genderCategory) {
                                  if (firstMatch.genderCategory === 'masculino') categoryDisplay = 'Chicos';
                                  else if (firstMatch.genderCategory === 'femenino') categoryDisplay = 'Chicas';
                                  else if (firstMatch.genderCategory === 'mixto') categoryDisplay = 'Mixto';
                                }
                                
                                // Si el nivel es Abierto y la categoría es Abierta, no mostrar la categoría
                                const showCategory = !(levelDisplay === 'Abierto' && categoryDisplay === 'Abierta');
                                
                                // Si hay múltiples opciones, mostrar indicador
                                const hasMultipleOptions = matchProposals.length > 1;
                                
                                return (
                                  <div 
                                    onClick={() => handleMatchProposalClick(timeSlot)}
                                    className="bg-white rounded-lg p-1 cursor-pointer hover:shadow-xl hover:scale-105 transition-all h-full border border-gray-300 shadow-lg flex items-center relative overflow-visible"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(255, 255, 255, 0.6)' }}
                                  >
                                    {/* Indicador de múltiples opciones - esquina superior izquierda */}
                                    {hasMultipleOptions && (
                                      <div className="absolute -top-2 -left-2 bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md border-2 border-white z-10">
                                        {matchProposals.length}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1.5 w-full">
                                      {/* Texto a la izquierda */}
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[10px] text-green-600 font-bold leading-tight">
                                          {playersCount > 0 ? `${playersCount} inscrito${playersCount > 1 ? 's' : ''}` : 'Iniciar Partida 90 Min'}
                                        </div>
                                        <div className="text-[8px] text-gray-700 font-semibold leading-tight">
                                          <span>Nivel/ {levelDisplay}</span>
                                          {showCategory && (
                                            <>
                                              <span> • </span>
                                              <span>{categoryDisplay}</span>
                                            </>
                                          )}
                                        </div>
                                        <div className="text-[7px] text-gray-600 leading-tight mt-0.5">
                                          Partida de 4 jugadores
                                        </div>
                                      </div>
                                      {/* Recuadro de precio alineado a la derecha */}
                                      <div className="flex-shrink-0 bg-white rounded-md px-2 py-1 border border-gray-200" style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                                        <div className="text-[7px] text-gray-600 leading-tight">Precio por</div>
                                        <div className="text-[7px] text-gray-600 leading-tight">{pricePerPlayers === 1 ? 'jugador' : `${pricePerPlayers} jugadores`}</div>
                                        <div className="text-sm font-bold text-gray-800 leading-tight">{Math.round(priceToShow)}€</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // No hay propuesta - mostrar celda vacía
                              if (instructorId && !isPast) {
                                // Celda clickeable para instructor
                                return (
                                  <div 
                                    onClick={() => handleReservationClick(court.id, court.number, timeSlot)}
                                    className="bg-white rounded-lg p-0.5 h-full border-2 border-dashed border-orange-300 hover:border-orange-500 hover:bg-orange-50 shadow-[0_2px_4px_rgba(0,0,0,0.08)] flex items-center justify-center cursor-pointer transition-all group"
                                  >
                                    <div className="text-center">
                                      <div className="text-[10px] text-orange-600 group-hover:text-orange-700 font-semibold">+ Reservar</div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Celda vacía normal (no instructor o pasado)
                              return (
                                <div className="bg-white rounded-lg p-0.5 h-full border-2 border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.08)] flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="text-[9px] text-gray-400">—</div>
                                  </div>
                                </div>
                              );
                            })() : (viewType === 'reservar-pistas') ? (() => {
                              // Modo Reservar Pistas - mostrar botón de reserva
                              if (!isPast) {
                                // Calcular precio según duración seleccionada
                                const pricePerHour = 10; // Precio por hora base
                                const totalPrice = (pricePerHour * selectedDuration) / 60;
                                
                                return (
                                  <div 
                                    onClick={() => {
                                      setSelectedCourtSlot({ date: currentDate, time: timeSlot, courtNumber: court.number });
                                      setShowCourtReservation(true);
                                    }}
                                    className="bg-white rounded-lg p-1 cursor-pointer hover:shadow-xl hover:scale-105 transition-all h-full border border-gray-300 shadow-lg flex items-center relative overflow-visible"
                                    style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(255, 255, 255, 0.6)' }}
                                  >
                                    <div className="flex items-center gap-1.5 w-full">
                                      {/* Texto a la izquierda */}
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[10px] text-orange-600 font-bold leading-tight">
                                          Reservar Pista
                                        </div>
                                        <div className="text-[8px] text-gray-700 font-semibold leading-tight">
                                          Disponible
                                        </div>
                                        <div className="text-[7px] text-gray-600 leading-tight mt-0.5">
                                          Duración: {selectedDuration} min
                                        </div>
                                      </div>
                                      {/* Recuadro de precio alineado a la derecha */}
                                      <div className="flex-shrink-0 bg-white rounded-md px-2 py-1 border border-gray-200" style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                                        <div className="text-[7px] text-gray-600 leading-tight">Precio por</div>
                                        <div className="text-[7px] text-gray-600 leading-tight">{selectedDuration} min</div>
                                        <div className="text-sm font-bold text-gray-800 leading-tight">{totalPrice.toFixed(0)}€</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              return (
                                <div className="bg-white rounded-lg p-0.5 h-full border-2 border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.08)] flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="text-[9px] text-gray-400">—</div>
                                  </div>
                                </div>
                              );
                            })() : (() => {
                              // Modo por defecto - celda vacía
                              return (
                                <div className="bg-white rounded-lg p-0.5 h-full border-2 border-gray-300 shadow-[0_2px_4px_rgba(0,0,0,0.08)] flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="text-[9px] text-gray-400">—</div>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Diálogo con tarjeta de clase */}
      <Dialog open={showClassCard} onOpenChange={setShowClassCard}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto p-0">
          {/* Botón de cierre grande y visible */}
          <button
            onClick={() => setShowClassCard(false)}
            className="absolute top-2 right-2 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-all hover:scale-110"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {selectedClassId && (() => {
            // Primero buscar en propuestas de clases
            let selectedClass = classProposals.find(p => p.id === selectedClassId);
            
            // Si no se encuentra, buscar en clases confirmadas
            if (!selectedClass) {
              selectedClass = confirmedClasses.find(c => c.id === selectedClassId);
            }
            
            // Si no se encuentra, buscar en propuestas de partidas
            if (!selectedClass) {
              const selectedMatch = matchProposals.find(m => m.id === selectedClassId);
              
              // Si tampoco está en partidas propuestas, buscar en partidas confirmadas
              if (!selectedMatch) {
                const confirmedMatch = confirmedMatches.find(m => m.id === selectedClassId);
                
                if (confirmedMatch) {
                  return (
                    <MatchGameCard
                      matchGame={{ ...confirmedMatch, id: confirmedMatch.matchId || confirmedMatch.id.replace('match-', '') }}
                      currentUser={currentUser}
                      onBookingSuccess={() => {
                        setShowClassCard(false);
                        setSelectedClassId(null);
                        window.location.reload();
                      }}
                      showLeaveButton={false}
                      showPrivateBookingButton={true}
                    />
                  );
                }
                
                console.error('❌ No se encontró ni clase ni partida:', selectedClassId);
                return <div className="p-4 text-center text-gray-600">No se encontró la actividad seleccionada</div>;
              }
              
              return (
                <MatchGameCard
                  matchGame={{ ...selectedMatch, id: selectedMatch.matchId || selectedMatch.id.replace('match-', '') }}
                  currentUser={currentUser}
                  onBookingSuccess={() => {
                    setShowClassCard(false);
                    setSelectedClassId(null);
                    // Recargar datos del calendario
                    window.location.reload();
                  }}
                  showLeaveButton={false}
                  showPrivateBookingButton={true}
                />
              );
            }
            
            // Si es una clase, mostrar ClassCardReal directamente
            return (
              <ClassCardReal
                classData={selectedClass}
                currentUser={currentUser}
                onBookingSuccess={() => {
                  setShowClassCard(false);
                  setSelectedClassId(null);
                  // Recargar datos del calendario
                  window.location.reload();
                }}
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Diálogo para múltiples opciones de partidas o clases */}
      <Dialog open={showMatchOptions} onOpenChange={setShowMatchOptions}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecciona una opción</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {selectedMatchIds.map(itemId => {
              // Buscar primero en partidas
              const matchGame = matchProposals.find(m => m.id === itemId);
              
              if (matchGame) {
                return (
                  <div key={itemId} className="border-2 border-purple-200 rounded-lg p-2">
                    <MatchGameCard
                      matchGame={{ ...matchGame, id: matchGame.matchId || matchGame.id.replace('match-', '') }}
                      currentUser={currentUser}
                      onBookingSuccess={() => {
                        setShowMatchOptions(false);
                        setSelectedMatchIds([]);
                        window.location.reload();
                      }}
                      showLeaveButton={false}
                      showPrivateBookingButton={true}
                    />
                  </div>
                );
              }
              
              // Buscar en clases
              const classProposal = classProposals.find(c => c.id === itemId);
              
              if (classProposal) {
                return (
                  <div key={itemId} className="border-2 border-blue-200 rounded-lg overflow-hidden">
                    {/* Información del instructor en la parte superior */}
                    {classProposal.instructorName && (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 border-b border-blue-200">
                        <div className="flex items-center gap-2">
                          {classProposal.instructorPhoto ? (
                            <img 
                              src={classProposal.instructorPhoto} 
                              alt={classProposal.instructorName}
                              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-sm">
                              {classProposal.instructorName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="text-xs text-gray-600 font-medium">Instructor</div>
                            <div className="text-sm font-bold text-gray-900">{classProposal.instructorName}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-2">
                      <ClassCardReal
                        classData={classProposal}
                        currentUser={currentUser}
                        onBookingSuccess={() => {
                          setShowMatchOptions(false);
                          setSelectedMatchIds([]);
                          window.location.reload();
                        }}
                      />
                    </div>
                  </div>
                );
              }
              
              return null;
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de reservas del instructor */}
      {instructorId && selectedReservationSlot && (
        <InstructorCourtReservationDialog
          open={showReservationDialog}
          onOpenChange={setShowReservationDialog}
          instructorId={instructorId}
          courtId={selectedReservationSlot.courtId}
          courtNumber={selectedReservationSlot.courtNumber}
          timeSlot={selectedReservationSlot.timeSlot}
          date={currentDate}
          existingReservation={selectedReservationSlot.existingReservation}
          onSuccess={handleReservationSuccess}
        />
      )}

      {/* Dialog para reservar pista (usuarios normales) */}
      <Dialog open={showCourtReservation} onOpenChange={(open) => {
        setShowCourtReservation(open);
        if (!open) {
          setDurationConfirmed(false);
          setSelectedDuration(60);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-600">🎾 Reservar Pista</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Selecciona la duración de tu reserva
            </DialogDescription>
          </DialogHeader>

          {selectedCourtSlot && (
            <div className="space-y-4">
              {/* Información de la reserva */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pista:</span>
                  <span className="text-sm font-bold text-gray-900">Pista {selectedCourtSlot.courtNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Fecha:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {selectedCourtSlot.date.toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Hora:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedCourtSlot.time}</span>
                </div>
              </div>

              {/* Selector de duración */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Duración de la reserva:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 90, 120].map((duration) => {
                    const pricePerHour = 10;
                    const totalPrice = (pricePerHour * duration) / 60;
                    const isSelected = selectedDuration === duration;
                    
                    return (
                      <button
                        key={duration}
                        onClick={() => {
                          setSelectedDuration(duration as 30 | 60 | 90 | 120);
                          setDurationConfirmed(false);
                        }}
                        disabled={durationConfirmed}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'bg-orange-500 border-orange-600 text-white shadow-lg scale-105'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-orange-400 hover:bg-orange-50'
                        } ${durationConfirmed ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="text-lg font-bold">{duration}</div>
                        <div className="text-[10px]">min</div>
                        <div className={`text-xs font-semibold mt-1 ${isSelected ? 'text-white' : 'text-orange-600'}`}>
                          {totalPrice.toFixed(0)}€
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* Botón Seleccionar */}
                {!durationConfirmed && (
                  <button
                    onClick={() => setDurationConfirmed(true)}
                    className="mt-3 w-full px-4 py-2.5 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all shadow-md"
                  >
                    Seleccionar {selectedDuration} minutos
                  </button>
                )}
              </div>

              {/* Mensaje de confirmación de selección */}
              {durationConfirmed && (
                <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Has seleccionado {selectedDuration} minutos</span>
                  </div>
                </div>
              )}

              {/* Resumen del precio */}
              {durationConfirmed && (
                <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm opacity-90">Total a pagar:</div>
                      <div className="text-xs opacity-75">Duración: {selectedDuration} minutos</div>
                    </div>
                    <div className="text-3xl font-bold">
                      {((10 * selectedDuration) / 60).toFixed(0)}€
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCourtReservation(false);
                    setSelectedCourtSlot(null);
                    setDurationConfirmed(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  Cancelar
                </button>
                {durationConfirmed && (
                <button
                  onClick={async () => {
                    console.log('🔍 DEBUG: Iniciando reserva', {
                      hasSlot: !!selectedCourtSlot,
                      hasUser: !!currentUser,
                      slot: selectedCourtSlot,
                      user: currentUser ? { id: currentUser.id, name: currentUser.name } : null
                    });
                    
                    if (!selectedCourtSlot || !currentUser) {
                      console.error('❌ Faltan datos:', { selectedCourtSlot, currentUser });
                      toast({
                        title: "Error",
                        description: "Faltan datos para completar la reserva. Por favor recarga la página e intenta de nuevo.",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    setIsReserving(true);
                    console.log('⏳ Estado de reserva iniciado...');
                    
                    try {
                      // Calcular timestamps
                      const [hours, minutes] = selectedCourtSlot.time.split(':').map(Number);
                      const startDate = new Date(selectedCourtSlot.date);
                      startDate.setHours(hours, minutes, 0, 0);
                      
                      const endDate = new Date(startDate);
                      endDate.setMinutes(endDate.getMinutes() + selectedDuration);
                      
                      // Calcular precio total
                      const pricePerHour = 10;
                      const totalPrice = (pricePerHour * selectedDuration) / 60;
                      
                      // Buscar el courtId basado en el número de pista
                      const courtId = calendarData?.courts.find(c => c.number === selectedCourtSlot.courtNumber)?.id;
                      
                      if (!courtId) {
                        toast({
                          title: "Error",
                          description: "No se pudo identificar la pista seleccionada",
                          variant: "destructive"
                        });
                        setIsReserving(false);
                        return;
                      }
                      
                      console.log('🎾 Creando reserva de pista:', {
                        courtId,
                        courtNumber: selectedCourtSlot.courtNumber,
                        date: selectedCourtSlot.date,
                        time: selectedCourtSlot.time,
                        duration: selectedDuration,
                        totalPrice,
                        userId: currentUser.id
                      });
                      
                      console.log('📡 Enviando petición a la API...', {
                        url: '/api/bookings/court-reservation',
                        body: {
                          clubId,
                          courtId,
                          start: startDate.toISOString(),
                          end: endDate.toISOString(),
                          userId: currentUser.id,
                          duration: selectedDuration,
                          totalPrice,
                        }
                      });
                      
                      // Llamar a la API de reserva
                      const response = await fetch('/api/bookings/court-reservation', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          clubId,
                          courtId,
                          start: startDate.toISOString(),
                          end: endDate.toISOString(),
                          userId: currentUser.id,
                          duration: selectedDuration,
                          totalPrice,
                        }),
                      });
                      
                      console.log('📨 Respuesta recibida:', {
                        status: response.status,
                        ok: response.ok,
                        statusText: response.statusText
                      });
                      
                      const result = await response.json();
                      console.log('📦 Datos de la respuesta:', result);
                      
                      if (response.ok) {
                        console.log('✅ Reserva creada exitosamente:', result);
                        
                        // Mostrar toast de confirmación
                        toast({
                          title: "✅ ¡Reserva confirmada!",
                          description: `Pista ${selectedCourtSlot.courtNumber} • ${selectedCourtSlot.time} • ${selectedDuration} min • ${totalPrice.toFixed(2)}€`,
                          duration: 6000,
                          className: "bg-green-50 border-green-500"
                        });
                        
                        console.log('🎉 Toast de confirmación mostrado');
                        
                        // Cerrar diálogo
                        setShowCourtReservation(false);
                        setSelectedCourtSlot(null);
                        
                        console.log('🗑️ Limpiando caché del calendario...');
                        
                        // Limpiar caché y recargar calendario
                        const dateParam = getLocalDateString(currentDate);
                        const cacheKey = `calendar-${clubId}-${dateParam}`;
                        sessionStorage.removeItem(cacheKey);
                        sessionStorage.removeItem(`${cacheKey}-timestamp`);
                        
                        console.log('🔄 Forzando recarga del calendario...');
                        
                        // Forzar recarga inmediata del calendario
                        setLoading(true);
                        setCalendarData(null); // Limpiar datos actuales
                        
                        // Recargar después de un breve delay para asegurar que la DB se actualizó
                        setTimeout(() => {
                          console.log('⏱️ Ejecutando recarga del calendario...');
                          handleDateChange(new Date(currentDate.getTime() + 1)); // Cambiar referencia
                        }, 100);
                        
                      } else {
                        console.error('❌ Error en la reserva:', result);
                        console.error('📄 Respuesta completa:', response);
                        
                        let errorMsg = result.error || 'No se pudo completar la reserva';
                        if (result.requiredCredits && result.availableCredits) {
                          errorMsg = `Créditos insuficientes. Necesitas ${result.requiredCredits}€ pero tienes ${result.availableCredits}€`;
                        }
                        
                        console.error('💬 Mensaje de error:', errorMsg);
                        
                        toast({
                          title: "Error al crear reserva",
                          description: errorMsg,
                          variant: "destructive",
                          duration: 7000,
                        });
                      }
                    } catch (error) {
                      console.error('❌ Error al crear reserva:', error);
                      console.error('📋 Detalles del error:', {
                        message: error instanceof Error ? error.message : 'Unknown error',
                        stack: error instanceof Error ? error.stack : undefined
                      });
                      
                      toast({
                        title: "Error de conexión",
                        description: "No se pudo procesar la reserva. Verifica tu conexión e intenta de nuevo.",
                        variant: "destructive",
                        duration: 7000,
                      });
                    } finally {
                      console.log('🏁 Finalizando proceso de reserva...');
                      setIsReserving(false);
                    }
                  }}
                  disabled={isReserving}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReserving ? 'Procesando...' : 'Confirmar Reserva'}
                </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
