'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CalendarIcon, ChevronLeft, ChevronRight, Filter, Users, DoorOpen, GraduationCap, UserCircle, LogOut } from 'lucide-react';
import CalendarEventDetails from './CalendarEventDetails';
import DateSelector from './DateSelector';
import ClassCardReal from '@/components/class/ClassCardReal';
import MatchGameCard from '@/components/match/MatchGameCard';
import LogoutConfirmationDialog from '@/components/layout/LogoutConfirmationDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  category?: string;
  price?: number;
  bookings?: any[];
  isOpen?: boolean;
  genderCategory?: string;
  totalCards?: number; // 🆕 Número de tarjetas abiertas para este horario/instructor
}

interface CalendarData {
  courts: Array<{
    id: string;
    number: number;
    name: string;
    clubName?: string;
    clubLogo?: string;
  }>;
  instructors: Array<{
    id: string;
    name: string;
    email: string;
    photo?: string;
    hourlyRate?: number;
    specialties?: string[];
  }>;
  proposedClasses: CalendarEvent[];
  confirmedClasses: CalendarEvent[];
  proposedMatches: CalendarEvent[];
  confirmedMatches: CalendarEvent[];
  events: CalendarEvent[];
  summary: {
    totalCourts: number;
    totalInstructors: number;
    totalClasses: number;
    confirmedClasses: number;
    proposedClasses: number;
    totalMatches: number;
    confirmedMatches: number;
    proposedMatches: number;
    totalBookings?: number;
    emptyClasses?: number;
    fullClasses?: number;
  };
}

export default function ClubCalendar2({ 
  clubId, 
  currentUser,
  viewMode = 'club' // 'user' = solo mi info, 'club' = toda info del club, 'instructor' = info del instructor
}: { 
  clubId: string; 
  currentUser?: any;
  viewMode?: 'user' | 'club' | 'instructor';
}) {
  const router = useRouter();
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true); // Solo para carga inicial
  const [refreshing, setRefreshing] = useState(false); // Para refreshes en background
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('day');
  const [filterType, setFilterType] = useState<'all' | 'classes' | 'matches' | 'instructors' | 'courts'>('all');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showClassCard, setShowClassCard] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showMatchCard, setShowMatchCard] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [showProposalCards, setShowProposalCards] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<{ clubId: string; start: string; instructorId?: string } | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]); // 🆕 Bookings del usuario para colorear días
  // 🆕 Filtro de reservas: en modo 'user' siempre 'mine', en otros modos configurable
  const [bookingFilter, setBookingFilter] = useState<'all' | 'mine'>(viewMode === 'user' ? 'mine' : 'all');
  // Selector de cantidad de jugadores para calcular precio por plaza
  const [selectedGroupSize, setSelectedGroupSize] = useState<1 | 2 | 3 | 4>(1);
  // Layout orientation: horizontal (instructores en filas) o vertical (horas en filas)
  const [layoutOrientation, setLayoutOrientation] = useState<'horizontal' | 'vertical'>('vertical');
  // 🆕 Modo de vista: 'clases', 'partidas', 'reservar-pistas'
  const [viewModeCalendar, setViewModeCalendar] = useState<'clases' | 'partidas' | 'reservar-pistas'>('clases');
  // 🆕 Estado para diálogo de reserva de pista
  const [showCourtReservation, setShowCourtReservation] = useState(false);
  const [selectedCourtSlot, setSelectedCourtSlot] = useState<{ date: Date; time: string; courtNumber?: number } | null>(null);
  // Estado para el diálogo de cerrar sesión
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // 📅 Escuchar eventos de cambio de layout desde la barra de navegación
  useEffect(() => {
    const handleLayoutChange = (event: CustomEvent) => {
      const newLayout = event.detail as 'horizontal' | 'vertical';
      setLayoutOrientation(newLayout);
    };

    window.addEventListener('setCalendarLayout', handleLayoutChange as EventListener);
    return () => {
      window.removeEventListener('setCalendarLayout', handleLayoutChange as EventListener);
    };
  }, []);

  // Debug: verificar currentUser
  useEffect(() => {
    console.log('🎨 ClubCalendar2 - currentUser recibido:', currentUser);
  }, [currentUser]);

  const handleEventClick = (event: CalendarEvent) => {
    // Si es una clase confirmada, mostrar la tarjeta de usuario
    if (event.type === 'class-confirmed') {
      // Extraer el ID real del TimeSlot (remover prefijo "class-")
      const timeSlotId = event.id.replace('class-', '');
      setSelectedClassId(timeSlotId);
      setShowClassCard(true);
    } else if (event.type === 'class-proposal') {
      // Si es una propuesta, mostrar solo las propuestas del instructor específico
      setSelectedProposal({
        clubId: clubId,
        start: event.start,
        instructorId: event.instructorId, // ✅ Filtrar por instructor específico
      });
      setShowProposalCards(true);
    } else if (event.type === 'match-confirmed' || event.type === 'match-proposal') {
      // Para partidas, abrir la tarjeta de partida completa
      const matchId = event.id.replace('match-', '');
      setSelectedMatchId(matchId);
      setShowMatchCard(true);
    } else {
      // Para otros tipos, mostrar el detalle de admin
      setSelectedEvent(event);
      setShowEventDetails(true);
    }
  };

  const handleTimeSlotClick = (slotDate: Date) => {
    // Crear una nueva clase en este slot de tiempo
    console.log('Crear clase en:', slotDate);
    
    // Crear un evento temporal para mostrar el formulario de creación
    const newClassEvent: CalendarEvent = {
      id: 'new-class',
      type: 'class-proposal',
      title: 'Nueva Clase',
      start: slotDate.toISOString(),
      end: new Date(slotDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hora después
      color: '#FFA500',
      maxPlayers: 4
    };
    
    setSelectedEvent(newClassEvent);
    setShowEventDetails(true);
  };

  const handleEventEdit = (event: CalendarEvent) => {
    console.log('Edit event:', event);
    // TODO: Implementar edición de evento
  };

  const handleEventCancel = async (event: CalendarEvent) => {
    console.log('Cancel event:', event);
    // TODO: Implementar cancelación de evento
    await loadCalendarData(); // Recargar datos
  };

  const loadCalendarData = async (isInitialLoad = false, forceRefresh = false) => {
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const startDate = new Date(currentDate);
      startDate.setDate(1); // Primer día del mes
      startDate.setHours(0, 0, 0, 0); // Inicio del día
      
      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Último día del mes
      endDate.setHours(23, 59, 59, 999); // Final del día
      
      const response = await fetch(
        `/api/admin/calendar?clubId=${clubId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        { 
          cache: (isInitialLoad || forceRefresh) ? 'no-store' : 'default',
          ...((isInitialLoad || forceRefresh) ? {} : { next: { revalidate: 30 } })
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Solo logs en desarrollo
        if (isInitialLoad && process.env.NODE_ENV === 'development') {
          console.log('📊 Calendar data loaded:', {
            instructors: data.instructors?.length,
            courts: data.courts?.length,
            proposedClasses: data.proposedClasses?.length,
            confirmedClasses: data.confirmedClasses?.length,
            events: data.events?.length
          });
          
          // 🔍 LOG: Verificar bookings en clases propuestas
          const sampleProposed = data.proposedClasses?.[0];
          if (sampleProposed) {
            console.log('🔍 Sample proposed class:', {
              id: sampleProposed.id,
              playersCount: sampleProposed.playersCount,
              bookingsCount: sampleProposed.bookings?.length,
              firstBooking: sampleProposed.bookings?.[0] ? {
                id: sampleProposed.bookings[0].id,
                groupSize: sampleProposed.bookings[0].groupSize,
                status: sampleProposed.bookings[0].status,
                userName: sampleProposed.bookings[0].user?.name
              } : null
            });
          }
        }
        setCalendarData(data);
        
        // 🐛 DEBUG: Log de clases confirmadas
        if (data.confirmedClasses && data.confirmedClasses.length > 0) {
          console.log('✅ Clases confirmadas cargadas:', data.confirmedClasses.length);
          const sampleConfirmed = data.confirmedClasses[0];
          console.log('📋 Sample confirmed class:', {
            id: sampleConfirmed.id,
            instructorId: sampleConfirmed.instructorId,
            instructorName: sampleConfirmed.instructorName,
            courtId: sampleConfirmed.courtId,
            courtNumber: sampleConfirmed.courtNumber,
            start: sampleConfirmed.start,
            playersCount: sampleConfirmed.playersCount
          });
        }
      }
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  // Efecto para carga inicial y cambios de fecha
  useEffect(() => {
    loadCalendarData(true); // Carga inicial con loading=true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, currentDate]);

  // Efecto separado para cargar bookings del usuario
  useEffect(() => {
    if (currentUser?.id) {
      loadUserBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Efecto para auto-refresh en background (2 minutos)
  useEffect(() => {
    const interval = setInterval(() => {
      loadCalendarData(false); // Refresh silencioso
      if (currentUser?.id) {
        loadUserBookings();
      }
    }, 120000); // Cada 2 minutos para mejor rendimiento
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, currentDate, currentUser?.id]);

  // 🆕 Cargar bookings del usuario para colorear días en el calendario
  const loadUserBookings = async () => {
    if (!currentUser?.id) {
      return;
    }
    
    try {
      // Obtener bookings de clases
      const response = await fetch(`/api/users/${currentUser.id}/bookings`, {
        cache: 'default',
        next: { revalidate: 60 }
      });
      
      let classBookings: any[] = [];
      if (response.ok) {
        classBookings = await response.json();
      }

      // Obtener bookings de partidas
      const matchGamesRes = await fetch(`/api/matchgames?clubId=${clubId || 'club-1'}`);
      let matchBookings: any[] = [];
      
      if (matchGamesRes.ok) {
        const matchGamesData = await matchGamesRes.json();
        const matchGames = matchGamesData.matchGames || [];
        
        // Filtrar solo las partidas donde el usuario tiene booking ACTIVO (no cancelado)
        matchBookings = matchGames
          .filter((mg: any) => mg.bookings.some((b: any) => b.userId === currentUser.id && b.status !== 'CANCELLED'))
          .map((mg: any) => ({
            timeSlotId: mg.id,
            status: 'CONFIRMED',
            date: mg.start
          }));
      }
      
      // Combinar bookings de clases y partidas (excluyendo cancelados)
      const formattedBookings = [
        ...classBookings
          .filter((b: any) => b.status !== 'CANCELLED')
          .map((b: any) => ({
            timeSlotId: b.timeSlotId,
            status: b.status,
            date: b.timeSlot?.start || b.start || new Date()
          })),
        ...matchBookings
      ];
      
      setUserBookings(formattedBookings);
    } catch (error) {
      console.error('❌ Error cargando bookings del usuario:', error);
    }
  };

  const getFilteredEvents = () => {
    if (!calendarData) return [];
    
    let filtered = calendarData.events;
    
    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(event => {
        switch (filterType) {
          case 'classes':
            return event.type.includes('class');
          case 'matches':
            return event.type.includes('match');
          case 'instructors':
            return event.instructorId !== undefined;
          case 'courts':
            return event.courtNumber !== undefined;
          default:
            return true;
        }
      });
    }
    
    // Filtrar por recurso específico
    if (selectedResource !== 'all') {
      if (selectedResource.startsWith('instructor-')) {
        const instructorId = selectedResource.replace('instructor-', '');
        filtered = filtered.filter(e => e.instructorId === instructorId);
      } else if (selectedResource.startsWith('court-')) {
        const courtNumber = parseInt(selectedResource.replace('court-', ''));
        filtered = filtered.filter(e => e.courtNumber === courtNumber);
      }
    }
    
    return filtered;
  };

  const getDaysInView = () => {
    const days: Date[] = [];
    const start = new Date(currentDate);
    
    if (view === 'week') {
      // Obtener el lunes de la semana actual
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      
      for (let i = 0; i < 7; i++) {
        days.push(new Date(start));
        start.setDate(start.getDate() + 1);
      }
    } else if (view === 'day') {
      days.push(new Date(currentDate));
    } else {
      // Vista mensual
      start.setDate(1);
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      for (let i = 0; i < daysInMonth; i++) {
        days.push(new Date(start));
        start.setDate(start.getDate() + 1);
      }
    }
    
    return days;
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return getFilteredEvents().filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const getTimeSlots = () => {
    const slots = [];
    // 🕐 Usar horarios del club si están disponibles
    let startHour = 7;
    let endHour = 22;
    
    // Intentar obtener openingHours del club desde calendarData
    if (calendarData?.courts?.[0]) {
      // Buscar en la API o usar valores por defecto
      // Por ahora, usar 9:00 - 22:00 como solicitado
      startHour = 9;
      endHour = 22;
    }
    
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  // Función para abreviar nombres de instructor
  const abbreviateName = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0]; // Solo un nombre
    
    // Primer nombre + inicial del apellido
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0);
    return `${firstName} ${lastInitial}.`;
  };

  const hasFullHourAvailable = (instructorId: string, slotTime: string, slotDate: Date): boolean => {
    const [hourStr, minuteStr] = slotTime.split(':');
    const slotHour = parseInt(hourStr);
    const slotMinute = parseInt(minuteStr);
    
    // Crear el timestamp de inicio del slot
    const slotStart = new Date(slotDate);
    slotStart.setHours(slotHour, slotMinute, 0, 0);
    
    // Calcular cuándo TERMINARÍA una clase que empiece en este slot (60 minutos después)
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 60);

    // Verificar si alguna clase CONFIRMADA del instructor solapa con estos 60 minutos
    const hasConflict = (calendarData?.confirmedClasses || []).some(cls => {
      if (cls.instructorId !== instructorId) return false;
      
      const clsStart = new Date(cls.start);
      const clsEnd = new Date(cls.end);
      
      // Solo verificar el mismo día
      if (clsStart.toDateString() !== slotDate.toDateString()) return false;
      
      // REGLA: Bloquear solo los últimos 30 minutos antes de la clase
      // Si la nueva clase empezaría exactamente 30min antes, bloquear
      const timeDiff = clsStart.getTime() - slotStart.getTime();
      const is30MinutesBefore = timeDiff === 30 * 60 * 1000;
      
      if (is30MinutesBefore) {
        return true; // BLOQUEADO - No puede empezar 30min antes
      }
      
      // REGLA: Bloquear si hay solapamiento DESPUÉS del inicio de la clase
      // Permitir clases que terminen justo cuando empieza la otra (o antes)
      const wouldOverlap = slotEnd > clsStart && slotStart < clsEnd;
      
      return wouldOverlap;
    });

    return !hasConflict;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    
    setCurrentDate(newDate);
  };

  const getEventStyle = (event: CalendarEvent) => {
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // horas
    
    return {
      backgroundColor: event.color,
      height: `${duration * 60}px`, // 60px por hora
      top: `${startTime.getHours() * 60 + startTime.getMinutes()}px`
    };
  };

  if (loading) {
    return (
      <div className="md:space-y-0 space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-sm">Cargando calendario...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback si no hay datos
  if (!calendarData) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No se pudieron cargar los datos del calendario.
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => loadCalendarData()}>Reintentar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const days = getDaysInView();
  const timeSlots = getTimeSlots();

  return (
    <div className="space-y-3 relative max-h-screen overflow-hidden">
      
      {/* Header unificado con estadísticas - DESKTOP */}
      {calendarData && (
        <Card className="hidden md:block bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 border-0 shadow-2xl overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-4">
              {/* Título con Logo (clickeable) */}
              <div className="flex items-center gap-3 min-w-fit">
                <button
                  onClick={() => router.push('/club')}
                  className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-all cursor-pointer"
                  title="Ir a la página del club"
                >
                  {calendarData.courts[0]?.clubLogo ? (
                    <img 
                      src={calendarData.courts[0].clubLogo} 
                      alt={calendarData.courts[0]?.clubName || 'Club'} 
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <CalendarIcon className="h-5 w-5 text-white" />
                  )}
                </button>
                <h2 className="text-white text-base font-bold whitespace-nowrap leading-tight">
                  Calendario del Club<br />
                  <span className="text-sm font-semibold text-white/80">{calendarData.courts[0]?.clubName || 'Club'}</span>
                </h2>
              </div>
              
              {/* Botones de Vista + Usuario logueado */}
              <div className="flex items-center gap-3">
                {/* Botones de Vista Horizontal/Vertical */}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className={`${
                      layoutOrientation === 'horizontal'
                        ? 'bg-white text-blue-600'
                        : 'bg-white/80 text-gray-600'
                    } hover:bg-white font-semibold border-0 shadow-md h-8 px-3`}
                    onClick={() => setLayoutOrientation(layoutOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
                    title={layoutOrientation === 'horizontal' ? 'Cambiar a Vista Vertical' : 'Cambiar a Vista Horizontal'}
                  >
                    {layoutOrientation === 'horizontal' ? (
                      <>
                        <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="3" y="4" width="18" height="4" strokeWidth="2" rx="1"/>
                          <rect x="3" y="10" width="18" height="4" strokeWidth="2" rx="1"/>
                          <rect x="3" y="16" width="18" height="4" strokeWidth="2" rx="1"/>
                        </svg>
                        Horizontal
                      </>
                    ) : (
                      <>
                        <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="4" y="3" width="4" height="18" strokeWidth="2" rx="1"/>
                          <rect x="10" y="3" width="4" height="18" strokeWidth="2" rx="1"/>
                          <rect x="16" y="3" width="4" height="18" strokeWidth="2" rx="1"/>
                        </svg>
                        Vertical
                      </>
                    )}
                  </Button>

                  {/* Botón de filtro: Ver mis clases / Ver todo */}
                  {currentUser && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className={`${
                        bookingFilter === 'mine'
                          ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300'
                          : 'bg-white/80 text-gray-600 hover:bg-white'
                      } font-semibold border-0 shadow-md transition-all h-8 px-3`}
                      onClick={() => setBookingFilter(bookingFilter === 'all' ? 'mine' : 'all')}
                      title={bookingFilter === 'all' ? 'Ver solo mis clases' : 'Ver todas las clases'}
                    >
                      <Users className="mr-1.5 h-3.5 w-3.5" />
                      {bookingFilter === 'all' ? 'Ver mis clases' : 'Ver todo'}
                    </Button>
                  )}
                </div>

                {/* Perfil del usuario */}
                {currentUser && (
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 hover:bg-white/30 transition-all duration-200 cursor-pointer group"
                    title="Ver mis datos"
                  >
                    {currentUser.profilePictureUrl ? (
                      <img 
                        src={currentUser.profilePictureUrl} 
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-md group-hover:scale-110 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center border-2 border-white shadow-md group-hover:scale-110 transition-transform duration-200">
                        <UserCircle className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-white text-xs font-bold group-hover:text-yellow-200 transition-colors leading-tight">{currentUser.name}</div>
                      <div className="text-white/80 text-[10px] leading-tight">{currentUser.email}</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Versión móvil - OCULTO */}
      {calendarData && (
        <div className="hidden">
          {/* Header móvil - OCULTO */}
          <Card className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 border-0 shadow-lg">
            <CardHeader className="p-4">
              <CardTitle 
                className="flex items-center gap-2 text-white text-lg font-bold cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => router.push('/club')}
                title="Ir a la página del club"
              >
                {calendarData.courts[0]?.clubLogo ? (
                  <img 
                    src={calendarData.courts[0].clubLogo} 
                    alt={calendarData.courts[0]?.clubName || 'Club'} 
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <CalendarIcon className="h-5 w-5" />
                )}
                Calendario del Club, {calendarData.courts[0]?.clubName || 'Club'}
              </CardTitle>
            </CardHeader>
          </Card>
          
          {/* Estadísticas móvil - OCULTO */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/80 font-medium">Propuestas</p>
                    <p className="text-xl font-bold text-white">{calendarData.summary.proposedClasses}</p>
                  </div>
                  <GraduationCap className="h-6 w-6 text-white/80" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/80 font-medium">Confirmadas</p>
                    <p className="text-xl font-bold text-white">{calendarData.summary.confirmedClasses}</p>
                  </div>
                  <GraduationCap className="h-6 w-6 text-white/80" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/80 font-medium">Instructores</p>
                    <p className="text-xl font-bold text-white">{calendarData.summary.totalInstructors || 0}</p>
                  </div>
                  <Users className="h-6 w-6 text-white/80" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500 to-pink-500 border-0 shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/80 font-medium">Partidas</p>
                    <p className="text-xl font-bold text-white">{(calendarData.summary.proposedMatches || 0) + (calendarData.summary.confirmedMatches || 0)}</p>
                  </div>
                  <GraduationCap className="h-6 w-6 text-white/80" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/80 font-medium">Pistas</p>
                    <p className="text-xl font-bold text-white">{calendarData.summary.totalCourts}</p>
                  </div>
                  <DoorOpen className="h-6 w-6 text-white/80" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}



      {/* Selector de Fecha Lineal - Sin fondo, solo contenido */}
      <div className="hidden md:block">
        <DateSelector 
          selectedDate={currentDate}
          onDateChange={setCurrentDate}
          daysToShow={30}
          userBookings={userBookings}
        />
      </div>
      
      {/* Versión móvil del selector de fecha (sin Card) */}
      <div className="md:hidden w-full mt-2">
        <DateSelector 
          selectedDate={currentDate}
          onDateChange={setCurrentDate}
          daysToShow={30}
          userBookings={userBookings}
        />
      </div>

      {/* 🆕 Botones de selección de modo: Clases, Partidas, Reservar Pistas */}
      <div className="flex gap-2 mb-4 justify-center">
        <Button
          onClick={() => setViewModeCalendar('clases')}
          variant={viewModeCalendar === 'clases' ? 'default' : 'outline'}
          className="flex-1 max-w-[200px]"
        >
          🎓 Clases
        </Button>
        <Button
          onClick={() => setViewModeCalendar('partidas')}
          variant={viewModeCalendar === 'partidas' ? 'default' : 'outline'}
          className="flex-1 max-w-[200px]"
        >
          🏆 Partidas
        </Button>
        <Button
          onClick={() => setViewModeCalendar('reservar-pistas')}
          variant={viewModeCalendar === 'reservar-pistas' ? 'default' : 'outline'}
          className="flex-1 max-w-[200px]"
        >
          🎾 Reservar Pistas
        </Button>
      </div>

      {/* Vista del calendario basada en pistas - DISEÑO MEJORADO */}
      <Card className="shadow-xl border-gray-200">
        <CardContent className="p-0">
          {view === 'month' ? (
            // Vista mensual - grid compacto (mantener original)
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="bg-gray-50 p-2 text-center font-semibold text-sm">
                  {day}
                </div>
              ))}
              
              {days.map(day => {
                const events = getEventsForDay(day);
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`bg-white p-2 min-h-[120px] ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: event.color, color: 'white' }}
                          title={event.title}
                          onClick={() => handleEventClick(event)}
                        >
                          {event.title}
                        </div>
                      ))}
                      {events.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{events.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // VISTA HORIZONTAL (ORIGINAL): Instructores en filas, Horas en columnas
            layoutOrientation === 'horizontal' ? (
            <div className="flex flex-col overflow-x-auto md:overflow-x-visible md:rounded-lg md:border md:border-gray-200 -mx-4 md:mx-0">
              {/* Franja superior con selector de precio */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 border-b-2 border-gray-300 py-2 px-4 flex items-center justify-center gap-3">
                <span className="text-sm font-bold text-white uppercase tracking-wide">Precio Plazas:</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedGroupSize(size as 1 | 2 | 3 | 4)}
                      className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                        selectedGroupSize === size
                          ? 'bg-white text-blue-600 shadow-lg scale-110'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                      title={`${size} ${size === 1 ? 'Jugador' : 'Jugadores'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              {/* Header con instructores y horas */}
              <div className="flex border-b-2 border-gray-300 bg-gradient-to-r from-gray-100 to-gray-50 shadow-sm">
                <div className="w-32 border-r-2 border-gray-300 bg-white flex items-center justify-center p-2 flex-shrink-0 sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                  <span className="text-xs font-bold text-gray-600 uppercase">Instructor</span>
                </div>
                {/* Headers de slots de tiempo */}
                <div className="flex min-w-max">
                  {timeSlots.map(time => {
                    const [hour, minute] = time.split(':');
                    return (
                      <div key={time} className="w-12 md:w-14 border-r text-center py-1 flex-shrink-0 hover:bg-blue-50 transition-colors">
                        <div className="text-[14px] font-black text-gray-800 leading-none">{hour}</div>
                        <div className="text-[12px] font-bold text-gray-500 leading-none">{minute}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FILAS: Clases Propuestas por Instructor - DISEÑO MEJORADO */}
              {calendarData?.instructors.map(instructor => (
                <div key={instructor.id} className="flex border-b bg-white hover:bg-blue-50 transition-colors relative">
                  <div className="w-32 border-r border-gray-200 flex items-center px-2 py-2 flex-shrink-0 sticky left-0 bg-white z-20 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-2">
                      {instructor.photo ? (
                        <img 
                          src={instructor.photo} 
                          alt={instructor.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-blue-500 shadow-md flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md flex-shrink-0">
                          {instructor.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">{abbreviateName(instructor.name)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex min-w-max">
                    {timeSlots.map((time, slotIndex) => {
                      // Detectar si este slot es el INICIO de una clase confirmada de 60min
                      const confirmedClassVertical = (calendarData?.confirmedClasses || []).find(cls => {
                        const clsStart = new Date(cls.start);
                        const [hourStr, minuteStr] = time.split(':');
                        const slotHour = parseInt(hourStr);
                        const slotMinute = parseInt(minuteStr);
                        const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                        const isSameTime = clsStart.getHours() === slotHour && clsStart.getMinutes() === slotMinute;
                        const isSameInstructor = cls.instructorId === instructor.id;
                        let matchesUserFilter = true;
                        if (bookingFilter === 'mine' && currentUser?.id) {
                          const isParticipant = cls.bookings?.some((b: any) => b.userId === currentUser.id) || false;
                          const isInstructor = cls.instructorId === currentUser.id;
                          matchesUserFilter = isParticipant || isInstructor;
                        }
                        const isConfirmed = cls.courtId || cls.courtNumber;
                        return isSameInstructor && isSameDay && isSameTime && matchesUserFilter && isConfirmed;
                      });
                      // Detectar si este slot es el slot ANTERIOR a una clase confirmada (para bloquearlo visualmente)
                      const isBufferBeforeClass = (calendarData?.confirmedClasses || []).some(cls => {
                        const clsStart = new Date(cls.start);
                        const [hourStr, minuteStr] = time.split(':');
                        const slotTime = new Date(currentDate);
                        slotTime.setHours(parseInt(hourStr), parseInt(minuteStr), 0, 0);
                        const thirtyMinBefore = new Date(clsStart.getTime() - 30 * 60 * 1000);
                        const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                        const isSameInstructor = cls.instructorId === instructor.id;
                        const is30MinBefore = slotTime.getTime() === thirtyMinBefore.getTime();
                        const isConfirmed = cls.courtId || cls.courtNumber;
                        return isSameDay && isSameInstructor && is30MinBefore && isConfirmed;
                      });
                      // Buscar clases propuestas de ESTE instructor en este slot
                      const canStartClassHere = hasFullHourAvailable(instructor.id, time, currentDate);
                      
                      // 🆕 Si estamos en modo "reservar-pistas", NO mostrar propuestas
                      const showProposals = viewModeCalendar !== 'reservar-pistas';
                      
                      const instructorClasses = showProposals ? (calendarData?.proposedClasses || []).filter(cls => {
                        const clsStart = new Date(cls.start);
                        const [hourStr, minuteStr] = time.split(':');
                        const slotHour = parseInt(hourStr);
                        const slotMinute = parseInt(minuteStr);
                        const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                        const isSameTime = clsStart.getHours() === slotHour && clsStart.getMinutes() === slotMinute;
                        const isSameInstructor = cls.instructorId === instructor.id;
                        let matchesUserFilter = true;
                        if (bookingFilter === 'mine' && currentUser?.id) {
                          const isParticipant = cls.bookings?.some((b: any) => b.userId === currentUser.id) || false;
                          const isInstructor = cls.instructorId === currentUser.id;
                          matchesUserFilter = isParticipant || isInstructor;
                        }
                        return isSameInstructor && isSameDay && isSameTime && matchesUserFilter;
                      }) : [];
                      const hasBookings = instructorClasses.some(cls => cls.bookings && cls.bookings.length > 0);
                      const visibleClasses = (canStartClassHere || hasBookings) ? instructorClasses : [];
                      const sortedClasses = [...visibleClasses].sort((a, b) => {
                        const aHasBookings = (a.bookings?.length || 0) > 0;
                        const bHasBookings = (b.bookings?.length || 0) > 0;
                        if (aHasBookings && !bHasBookings) return -1;
                        if (!aHasBookings && bHasBookings) return 1;
                        return 0;
                      });
                      // Renderizado de celdas
                      // 1. Si el slot anterior a este es el inicio de una clase confirmada, mostrar celda bloqueada
                      // Solo bloquear la celda inmediatamente anterior al inicio de cada clase confirmada
                      // Lógica igual que vertical: buffer solo en el slot anterior, bloque verde solo en el slot de inicio
                      // 1. ¿Es buffer? (slot anterior a clase confirmada de este instructor)
                      const isBufferCell = (calendarData?.confirmedClasses || []).some(cls => {
                        const clsStart = new Date(cls.start);
                        const isSameInstructor = cls.instructorId === instructor.id;
                        const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                        const startIndex = timeSlots.findIndex(t => {
                          const [h, m] = t.split(':');
                          return clsStart.getHours() === parseInt(h) && clsStart.getMinutes() === parseInt(m);
                        });
                        
                        // 🆕 Aplicar filtro de usuario
                        let matchesUserFilter = true;
                        if (bookingFilter === 'mine' && currentUser?.id) {
                          const isParticipant = cls.bookings?.some((b: any) => b.userId === currentUser.id) || false;
                          const isInstructor = cls.instructorId === currentUser.id;
                          matchesUserFilter = isParticipant || isInstructor;
                        }
                        
                        return isSameInstructor && isSameDay && slotIndex === startIndex - 1 && matchesUserFilter;
                      });
                      if (isBufferCell) {
                        return (
                          <div
                            key={slotIndex}
                            className="w-12 md:w-14 h-24 border-r relative flex-shrink-0 bg-gray-100 text-gray-400 flex flex-col items-center justify-center cursor-not-allowed select-none"
                            title="Bloqueado por clase siguiente (buffer 30min)"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v1m-6 0a2 2 0 002 2h8a2 2 0 002-2v-5a2 2 0 00-2-2H8a2 2 0 00-2 2v5zm10-7V7a4 4 0 10-8 0v4" />
                            </svg>
                            <span className="text-[10px] font-bold uppercase">Bloqueado</span>
                          </div>
                        );
                      }
                      // 2. ¿Es inicio de clase confirmada? Renderizar bloque verde absolutely positioned solo en el slot de inicio
                      const confirmedClassHorizontal = (calendarData?.confirmedClasses || []).find(cls => {
                        const clsStart = new Date(cls.start);
                        const isSameInstructor = cls.instructorId === instructor.id;
                        const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                        const [hourStr, minuteStr] = time.split(':');
                        
                        // 🆕 Aplicar filtro de usuario
                        let matchesUserFilter = true;
                        if (bookingFilter === 'mine' && currentUser?.id) {
                          const isParticipant = cls.bookings?.some((b: any) => b.userId === currentUser.id) || false;
                          const isInstructor = cls.instructorId === currentUser.id;
                          matchesUserFilter = isParticipant || isInstructor;
                        }
                        
                        return isSameInstructor && isSameDay && clsStart.getHours() === parseInt(hourStr) && clsStart.getMinutes() === parseInt(minuteStr) && matchesUserFilter;
                      });
                      // Detectar si este slot es el SEGUNDO de una clase confirmada (slot +30min)
                      const isSecondSlotOfConfirmed = (calendarData?.confirmedClasses || []).some(cls => {
                        const clsStart = new Date(cls.start);
                        const clsSecondSlot = new Date(clsStart.getTime() + 30 * 60 * 1000); // +30 minutos
                        const isSameInstructor = cls.instructorId === instructor.id;
                        const isSameDay = clsSecondSlot.toDateString() === currentDate.toDateString();
                        const [hourStr, minuteStr] = time.split(':');
                        
                        // 🆕 Aplicar filtro de usuario
                        let matchesUserFilter = true;
                        if (bookingFilter === 'mine' && currentUser?.id) {
                          const isParticipant = cls.bookings?.some((b: any) => b.userId === currentUser.id) || false;
                          const isInstructor = cls.instructorId === currentUser.id;
                          matchesUserFilter = isParticipant || isInstructor;
                        }
                        
                        return isSameInstructor && isSameDay && clsSecondSlot.getHours() === parseInt(hourStr) && clsSecondSlot.getMinutes() === parseInt(minuteStr) && matchesUserFilter;
                      });
                      
                      if (isSecondSlotOfConfirmed) {
                        // Este slot es el segundo de una clase confirmada, renderizar div vacío (el bloque verde lo cubre)
                        return (
                          <div key={slotIndex} className="w-12 md:w-14 h-24 border-r relative flex-shrink-0" style={{ zIndex: 1 }}></div>
                        );
                      }
                      
                      if (confirmedClassHorizontal) {
                        // Bloque verde ocupa exactamente 2 celdas (60 minutos)
                        return (
                          <div key={slotIndex} className="w-12 md:w-14 h-24 border-r relative flex-shrink-0" style={{ zIndex: 10 }}>
                            <div className="absolute inset-0 w-[calc(200%-1px)] h-full z-10">
                              <div
                                className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-md shadow-lg cursor-pointer hover:shadow-2xl hover:scale-[1.35] transition-all duration-300 flex flex-col items-center justify-center px-1 py-0.5 border-2 border-green-400 h-full w-full hover:z-50"
                                onClick={() => handleEventClick(confirmedClassHorizontal)}
                                title={`✅ CONFIRMADA - Pista ${confirmedClassHorizontal.courtNumber} - ${confirmedClassHorizontal.playersCount}/${confirmedClassHorizontal.maxPlayers}`}
                              >
                                {/* Título CLASES */}
                                <div className="text-[11px] font-black uppercase mb-1">CLASES (60 MIN)</div>
                                
                                {/* Contenedor superior: Instructor centrado CON BORDE */}
                                <div className="flex flex-col items-center w-full mb-1 border border-white/40 rounded p-1.5">
                                  {/* Foto instructor */}
                                  <div className="mb-1">
                                    {confirmedClassHorizontal.instructorPhoto ? (
                                      <img 
                                        src={confirmedClassHorizontal.instructorPhoto} 
                                        alt={confirmedClassHorizontal.instructorName}
                                        className="w-7 h-7 rounded-full object-cover border border-white shadow-md"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center text-[9px] font-bold border border-white shadow-md">
                                        {confirmedClassHorizontal.instructorName?.charAt(0) || '?'}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Nombre */}
                                  <div className="text-[8px] font-bold text-center leading-tight mb-0.5 truncate w-full px-0.5">
                                    {confirmedClassHorizontal.instructorName}
                                  </div>
                                  
                                  {/* Estrellas */}
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <svg
                                        key={star}
                                        className="w-1.5 h-1.5 fill-yellow-300"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                      </svg>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Contenedor de usuarios y nivel CON BORDE */}
                                <div className="border border-white/40 rounded p-1 w-full flex flex-col items-center">
                                  {/* Avatares usuarios */}
                                  {confirmedClassHorizontal.bookings && confirmedClassHorizontal.bookings.length > 0 && (
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                      {confirmedClassHorizontal.bookings.filter((b: any) => b.status === 'CONFIRMED' || b.status === 'CANCELLED').slice(0, 4).map((booking: any) => {
                                        const isCancelled = booking.status === 'CANCELLED';
                                        return (
                                          <div key={booking.id}>
                                            {isCancelled ? (
                                              <div 
                                                className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center shadow-md border-2 border-yellow-500"
                                                title={`Plaza Cancelada - ${booking.user?.name || 'Usuario'} (Reservable con puntos)`}
                                              >
                                                <span className="text-yellow-900 text-xs">♻️</span>
                                              </div>
                                            ) : booking.user?.profilePictureUrl ? (
                                              <img
                                                src={booking.user.profilePictureUrl}
                                                alt={booking.user.name}
                                                className="w-6 h-6 rounded-full object-cover shadow-md border border-white"
                                                title={booking.user.name}
                                              />
                                            ) : (
                                              <div 
                                                className="w-6 h-6 rounded-full bg-white/40 flex items-center justify-center text-[8px] font-bold shadow-md border border-white"
                                                title={booking.user?.name || 'Usuario'}
                                              >
                                                {booking.user?.name?.charAt(0) || '?'}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* Nivel y Formato */}
                                  <div className="text-[9px] font-bold text-white">
                                    {(confirmedClassHorizontal as any).levelRange || confirmedClassHorizontal.category || confirmedClassHorizontal.level || 'Abierto'} • {confirmedClassHorizontal.bookings?.filter((b: any) => b.status === 'CONFIRMED' || b.status === 'CANCELLED').length || 0}p
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // (El slot posterior ya no se bloquea visualmente)
                      // 3. Si hay propuesta, mostrar bloque blanco
                      if (sortedClasses.length > 0) {
                        return (
                          <div key={slotIndex} className={`w-12 md:w-14 h-24 border-r relative flex-shrink-0 ${!canStartClassHere ? 'bg-red-50/30' : ''}`} title={!canStartClassHere ? '⚠️ No hay 60min disponibles' : ''}>
                            <div className="absolute inset-0 p-0.5 overflow-hidden">
                              {sortedClasses.slice(0, 1).map(cls => {
                                const hasPlayers = (cls.playersCount || 0) > 0;
                                const pricePerSlot = cls.price ? (cls.price / selectedGroupSize) : 0;
                                // Calcular si tiene plazas recicladas
                                const recycledCount = cls.bookings?.filter((b: any) => b.status === 'CANCELLED' && b.isRecycled === true).length || 0;
                                const hasRecycledSlots = recycledCount > 0;
                                // 🆕 Obtener número de tarjetas abiertas
                                const totalCards = (cls as any).totalCards || 1;
                                
                                return (
                                  <div
                                    key={cls.id}
                                    className={`rounded shadow-md cursor-pointer hover:shadow-lg hover:scale-105 transition-all h-full flex flex-col items-center justify-center border-2 p-0.5 relative ${
                                      hasPlayers 
                                        ? 'bg-blue-500 text-white border-blue-600' 
                                        : 'bg-white text-gray-700 border-gray-300'
                                    }`}
                                    onClick={() => handleEventClick(cls)}
                                    title={`${cls.category || cls.level} - ${cls.playersCount || 0} alumno${(cls.playersCount || 0) !== 1 ? 's' : ''} inscrito${(cls.playersCount || 0) !== 1 ? 's' : ''} - ${pricePerSlot ? `${pricePerSlot.toFixed(0)}€ por plaza (${selectedGroupSize} ${selectedGroupSize === 1 ? 'jugador' : 'jugadores'})` : ''}${hasRecycledSlots ? ` - ${recycledCount} plaza${recycledCount !== 1 ? 's' : ''} reciclada${recycledCount !== 1 ? 's' : ''} (solo puntos)` : ''}${totalCards > 1 ? ` - ${totalCards} tarjetas abiertas compitiendo` : ''}`}
                                  >
                                    {/* 🆕 Indicador de número de tarjetas abiertas (círculo con número) */}
                                    {totalCards > 1 && (
                                      <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-white flex items-center justify-center shadow-lg z-20">
                                        <span className="text-[9px] font-black text-white">{totalCards}</span>
                                      </div>
                                    )}
                                    
                                    {/* Indicador de plaza reciclada */}
                                    {hasRecycledSlots && (
                                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 border border-yellow-600 flex items-center justify-center shadow-md z-10">
                                        <span className="text-[8px]">♻️</span>
                                      </div>
                                    )}
                                    
                                    {hasPlayers ? (
                                      <div className="text-xs font-black leading-none">
                                        {cls.playersCount}
                                      </div>
                                    ) : pricePerSlot ? (
                                      <>
                                        <div className="text-xs font-bold leading-none mb-1">
                                          {pricePerSlot.toFixed(0)}€
                                        </div>
                                        <div className={selectedGroupSize > 2 ? "grid grid-cols-2 gap-0.5" : "flex items-center gap-0.5"}>
                                          {Array.from({ length: selectedGroupSize }).map((_, idx) => (
                                            <div key={idx} className="w-2.5 h-2.5 rounded-full bg-white border border-gray-400 flex items-center justify-center">
                                              <svg className="w-1.5 h-1.5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                              </svg>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-xs font-black leading-none">
                                        {cls.playersCount || 0}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {sortedClasses.length > 1 && (
                                <div className="text-[6px] text-orange-600 font-bold text-center bg-orange-100 rounded shadow-sm">
                                  +{sortedClasses.length - 1}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      // 4. Celda vacía o botón de reservar pista
                      // Si estamos en modo "reservar-pistas", mostrar botón "Reservar Pista"
                      if (viewModeCalendar === 'reservar-pistas') {
                        return (
                          <div key={slotIndex} className="w-12 md:w-14 h-24 border-r relative flex-shrink-0 bg-blue-50/30 hover:bg-blue-100/50 transition-colors">
                            <button
                              onClick={() => {
                                setSelectedCourtSlot({ date: currentDate, time, courtNumber: undefined });
                                setShowCourtReservation(true);
                              }}
                              className="w-full h-full flex flex-col items-center justify-center text-blue-600 hover:text-blue-800 transition-colors group"
                              title="Reservar pista en este horario"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-[8px] font-bold uppercase">Reservar</span>
                            </button>
                          </div>
                        );
                      }
                      
                      // Celda vacía normal
                      return (
                        <div key={slotIndex} className="w-12 md:w-14 h-24 border-r relative flex-shrink-0"></div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            ) : (
            // VISTA VERTICAL: Horas en filas, Instructores en columnas
            <div className="flex flex-col max-h-[calc(100vh-180px)] overflow-hidden md:rounded-lg md:border md:border-gray-200">
              {/* Franja superior con selector de precio */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 border-b-2 border-gray-300 py-1.5 px-4 flex items-center justify-center gap-3">
                <span className="text-xs font-bold text-white uppercase tracking-wide">Precio Plazas:</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedGroupSize(size as 1 | 2 | 3 | 4)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        selectedGroupSize === size
                          ? 'bg-white text-blue-600 shadow-lg scale-110'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                      title={`${size} ${size === 1 ? 'Jugador' : 'Jugadores'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              {/* Header fijo con instructores */}
              <div className="flex border-b-2 border-gray-300 bg-gradient-to-r from-gray-100 to-gray-50 shadow-sm sticky top-0 z-30">
                <div className="w-20 border-r-2 border-gray-300 bg-white flex items-center justify-center p-2 flex-shrink-0">
                  <span className="text-xs font-bold text-gray-600 uppercase">Hora</span>
                </div>
                {/* Headers de instructores */}
                <div className="flex flex-1 overflow-x-auto">
                  {calendarData?.instructors.map(instructor => (
                    <div key={instructor.id} className="min-w-[120px] border-r bg-white px-2 py-2 flex flex-col items-center">
                      {instructor.photo ? (
                        <img 
                          src={instructor.photo} 
                          alt={instructor.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow-md mb-1"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md mb-1">
                          {instructor.name.charAt(0)}
                        </div>
                      )}
                      <div className="text-xs font-bold text-gray-900 text-center">{abbreviateName(instructor.name)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body scrollable con slots de tiempo */}
              <div className="flex-1 overflow-y-auto">
                {timeSlots.map((time, slotIndex) => {
                  const [hour, minute] = time.split(':');
                  return (
                    <div key={time} className="flex border-b hover:bg-blue-50/30 transition-colors">
                      {/* Columna de hora */}
                      <div className="w-20 border-r-2 border-gray-300 bg-gradient-to-r from-gray-100 to-gray-50 flex flex-col items-center justify-center py-2 flex-shrink-0 sticky left-0 z-20">
                        <div className="text-lg font-black text-gray-800 leading-none">{hour}</div>
                        <div className="text-sm font-bold text-gray-500 leading-none">{minute}</div>
                      </div>
                      
                      {/* Celdas de instructores */}
                      <div className="flex flex-1">
                        {calendarData?.instructors.map(instructor => {
                          // Verificar si tiene 60min disponibles
                          const canStartClassHere = hasFullHourAvailable(instructor.id, time, currentDate);
                          
                          // Buscar clases CONFIRMADAS que EMPIEZAN en este slot
                          const confirmedInSlot = (calendarData?.confirmedClasses || []).filter(cls => {
                            const clsStart = new Date(cls.start);
                            const [hourStr, minuteStr] = time.split(':');
                            const slotHour = parseInt(hourStr);
                            const slotMinute = parseInt(minuteStr);
                            
                            const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                            const isSameTime = clsStart.getHours() === slotHour && clsStart.getMinutes() === slotMinute;
                            const isSameInstructor = cls.instructorId === instructor.id;
                            
                            // Clase confirmada = tiene courtId (pista asignada) O tiene courtNumber
                            const isConfirmed = cls.courtId || cls.courtNumber;
                            
                            // 🆕 Aplicar filtro de usuario
                            let matchesUserFilter = true;
                            if (bookingFilter === 'mine' && currentUser?.id) {
                              const isParticipant = cls.bookings?.some((b: any) => b.userId === currentUser.id) || false;
                              const isInstructor = cls.instructorId === currentUser.id;
                              matchesUserFilter = isParticipant || isInstructor;
                            }
                            
                            return isSameDay && isSameTime && isSameInstructor && isConfirmed && matchesUserFilter;
                          });
                          
                          // Verificar si este slot está ocupado por el SEGUNDO slot de una clase (30-60min)
                          const isSecondSlotOfClass = (calendarData?.confirmedClasses || []).some(cls => {
                            const clsStart = new Date(cls.start);
                            const [hourStr, minuteStr] = time.split(':');
                            const slotTime = new Date(currentDate);
                            slotTime.setHours(parseInt(hourStr), parseInt(minuteStr), 0, 0);
                            
                            const secondSlotStart = new Date(clsStart.getTime() + 30 * 60 * 1000); // 30min después
                            
                            const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                            const isSameInstructor = cls.instructorId === instructor.id;
                            const isSecondSlot = slotTime.getTime() === secondSlotStart.getTime();
                            const isConfirmed = cls.courtId || cls.courtNumber;
                            
                            // 🆕 Aplicar filtro de usuario
                            let matchesUserFilter = true;
                            if (bookingFilter === 'mine' && currentUser?.id) {
                              const isParticipant = cls.bookings?.some((b: any) => b.userId === currentUser.id) || false;
                              const isInstructor = cls.instructorId === currentUser.id;
                              matchesUserFilter = isParticipant || isInstructor;
                            }
                            
                            return isSameDay && isSameInstructor && isSecondSlot && isConfirmed && matchesUserFilter;
                          });
                          
                          // Verificar si este slot es 30min ANTES de una clase confirmada (buffer previo)
                          const isBufferBeforeClass = (calendarData?.confirmedClasses || []).some(cls => {
                            const clsStart = new Date(cls.start);
                            const [hourStr, minuteStr] = time.split(':');
                            const slotTime = new Date(currentDate);
                            slotTime.setHours(parseInt(hourStr), parseInt(minuteStr), 0, 0);
                            
                            const thirtyMinBefore = new Date(clsStart.getTime() - 30 * 60 * 1000);
                            
                            const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                            const isSameInstructor = cls.instructorId === instructor.id;
                            const is30MinBefore = slotTime.getTime() === thirtyMinBefore.getTime();
                            const isConfirmed = cls.courtId || cls.courtNumber;
                            
                            // 🆕 Aplicar filtro de usuario
                            let matchesUserFilter = true;
                            if (bookingFilter === 'mine' && currentUser?.id) {
                              const isParticipant = cls.bookings?.some((b: any) => b.userId === currentUser.id) || false;
                              const isInstructor = cls.instructorId === currentUser.id;
                              matchesUserFilter = isParticipant || isInstructor;
                            }
                            
                            return isSameDay && isSameInstructor && is30MinBefore && isConfirmed && matchesUserFilter;
                          });
                          
                          // Buscar clases propuestas de este instructor en este slot
                          // 🆕 Si estamos en modo "reservar-pistas", NO mostrar propuestas
                          const showProposals = viewModeCalendar !== 'reservar-pistas';
                          
                          const instructorClasses = showProposals ? (calendarData?.proposedClasses || []).filter(cls => {
                            const clsStart = new Date(cls.start);
                            const [hourStr, minuteStr] = time.split(':');
                            const slotHour = parseInt(hourStr);
                            const slotMinute = parseInt(minuteStr);
                            
                            const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                            const isSameTime = clsStart.getHours() === slotHour && clsStart.getMinutes() === slotMinute;
                            const isSameInstructor = cls.instructorId === instructor.id;
                            
                            // 🆕 Aplicar filtro de usuario
                            let matchesUserFilter = true;
                            if (bookingFilter === 'mine' && currentUser?.id) {
                              const isParticipant = cls.bookings?.some((b: any) => b.userId === currentUser.id) || false;
                              const isInstructor = cls.instructorId === currentUser.id;
                              matchesUserFilter = isParticipant || isInstructor;
                            }
                            
                            return isSameDay && isSameTime && isSameInstructor && matchesUserFilter;
                          }).sort((a, b) => {
                            const aHasBookings = (a.bookings?.length || 0) > 0;
                            const bHasBookings = (b.bookings?.length || 0) > 0;
                            if (aHasBookings && !bHasBookings) return -1;
                            if (!aHasBookings && bHasBookings) return 1;
                            return 0;
                          }) : [];

                          return (
                            <div 
                              key={instructor.id} 
                              className={`min-w-[120px] border-r h-16 relative ${!canStartClassHere ? 'bg-red-50/30' : ''} ${isSecondSlotOfClass ? 'bg-gray-300' : ''} ${isBufferBeforeClass ? 'bg-gray-200' : ''}`}
                              title={!canStartClassHere ? '⚠️ No hay 60min disponibles' : isSecondSlotOfClass ? '🔒 Ocupado por clase en curso' : isBufferBeforeClass ? '⏳ Buffer 30min antes de clase' : ''}
                              style={isBufferBeforeClass ? { 
                                backgroundImage: 'repeating-linear-gradient(45deg, #e5e7eb 0, #e5e7eb 10px, #f3f4f6 10px, #f3f4f6 20px)',
                                opacity: 0.6 
                              } : {}}
                            >
                              {/* BLOQUES VERDES: Clases confirmadas - OCUPAN 2 SLOTS (60min) */}
                              {confirmedInSlot.length > 0 && (
                                <div className="absolute inset-0 p-1 overflow-visible z-10">
                                  {confirmedInSlot.map(cls => {
                                    // Verificar si es el slot de inicio
                                    const clsStart = new Date(cls.start);
                                    const isStartSlot = clsStart.getHours() === parseInt(time.split(':')[0]) && 
                                                       clsStart.getMinutes() === parseInt(time.split(':')[1]);
                                    
                                    if (!isStartSlot) return null;
                                    
                                    return (
                                      <div
                                        key={cls.id}
                                        className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded shadow-lg cursor-pointer hover:shadow-2xl hover:scale-[1.25] transition-all duration-300 flex flex-col items-center justify-center p-1 border-2 border-green-400 hover:z-50"
                                        style={{
                                          position: 'absolute',
                                          top: '4px',
                                          left: '4px',
                                          right: '4px',
                                          height: 'calc(200% - 8px)', // Ocupa exactamente 2 filas
                                        }}
                                        onClick={() => handleEventClick(cls)}
                                        title={`✅ CONFIRMADA - Pista ${cls.courtNumber} - ${cls.playersCount}/${cls.maxPlayers} alumnos`}
                                      >
                                        {/* Título CLASES */}
                                        <div className="text-[11px] font-black uppercase mb-1">CLASES (60 MIN)</div>
                                        
                                        {/* Contenedor superior: Instructor centrado CON BORDE */}
                                        <div className="flex flex-col items-center w-full mb-1 border border-white/40 rounded p-1">
                                          {/* Foto del instructor */}
                                          <div className="mb-0.5">
                                            {cls.instructorPhoto ? (
                                              <img 
                                                src={cls.instructorPhoto} 
                                                alt={cls.instructorName}
                                                className="w-8 h-8 rounded-full object-cover border border-white shadow-md"
                                              />
                                            ) : (
                                              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold border border-white shadow-md">
                                                {cls.instructorName?.charAt(0) || '?'}
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Nombre */}
                                          <div className="text-[8px] font-bold text-center leading-tight mb-0.5 truncate w-full px-0.5">
                                            {cls.instructorName}
                                          </div>
                                          
                                          {/* Estrellas centradas */}
                                          <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <svg
                                                key={star}
                                                className="w-1.5 h-1.5 fill-yellow-300"
                                                viewBox="0 0 20 20"
                                              >
                                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                              </svg>
                                            ))}
                                          </div>
                                        </div>
                                        
                                        {/* Contenedor de usuarios y nivel CON BORDE */}
                                        <div className="border border-white/40 rounded p-1 w-full flex flex-col items-center">
                                          {/* Avatares de usuarios inscritos */}
                                          {cls.bookings && cls.bookings.length > 0 && (
                                            <div className="flex items-center justify-center gap-0.5 mb-0.5">
                                              {cls.bookings.filter((b: any) => b.status === 'CONFIRMED' || b.status === 'CANCELLED').slice(0, 4).map((booking: any) => {
                                                const isCancelled = booking.status === 'CANCELLED';
                                                return (
                                                  <div key={booking.id}>
                                                    {isCancelled ? (
                                                      <div 
                                                        className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center shadow-md border-2 border-yellow-500"
                                                        title={`Plaza Cancelada - ${booking.user?.name || 'Usuario'} (Reservable con puntos)`}
                                                      >
                                                        <span className="text-yellow-900 text-sm">♻️</span>
                                                      </div>
                                                    ) : booking.user?.profilePictureUrl ? (
                                                      <img
                                                        src={booking.user.profilePictureUrl}
                                                        alt={booking.user.name}
                                                        className="w-7 h-7 rounded-full object-cover shadow-md border border-white"
                                                        title={booking.user.name}
                                                      />
                                                    ) : (
                                                      <div 
                                                        className="w-7 h-7 rounded-full bg-white/40 flex items-center justify-center text-[8px] font-bold shadow-md border border-white"
                                                        title={booking.user?.name || 'Usuario'}
                                                      >
                                                        {booking.user?.name?.charAt(0) || '?'}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                          
                                          {/* Nivel y Formato */}
                                          <div className="text-[9px] font-bold text-white">
                                            {(cls as any).levelRange || cls.category || cls.level || 'Abierto'} • {cls.bookings?.filter((b: any) => b.status === 'CONFIRMED' || b.status === 'CANCELLED').length || 0}p
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {/* BLOQUES BLANCOS/NARANJAS: Clases propuestas (solo si NO hay confirmada Y NO es segundo slot Y NO es buffer antes) */}
                              {confirmedInSlot.length === 0 && !isSecondSlotOfClass && !isBufferBeforeClass && instructorClasses.length > 0 && (
                                <div className="absolute inset-0 p-1 overflow-hidden">
                                  {instructorClasses.slice(0, 1).map(cls => {
                                    const hasPlayers = (cls.playersCount || 0) > 0;
                                    const pricePerSlot = cls.price ? (cls.price / selectedGroupSize) : 0;
                                    // Calcular si tiene plazas recicladas
                                    const recycledCount = cls.bookings?.filter((b: any) => b.status === 'CANCELLED' && b.isRecycled === true).length || 0;
                                    const hasRecycledSlots = recycledCount > 0;
                                    // 🆕 Obtener número de tarjetas abiertas
                                    const totalCards = (cls as any).totalCards || 1;
                                    
                                    return (
                                      <div
                                        key={cls.id}
                                        className={`rounded shadow-md cursor-pointer hover:shadow-lg hover:scale-105 transition-all h-full flex flex-col items-center justify-center border-2 p-1 relative ${
                                          hasPlayers 
                                            ? 'bg-blue-500 text-white border-blue-600' 
                                            : 'bg-white text-gray-700 border-gray-300'
                                        }`}
                                        onClick={() => handleEventClick(cls)}
                                        title={`${cls.category || cls.level} - ${cls.playersCount || 0} alumno${(cls.playersCount || 0) !== 1 ? 's' : ''} inscrito${(cls.playersCount || 0) !== 1 ? 's' : ''} - ${pricePerSlot ? `${pricePerSlot.toFixed(0)}€ por plaza (${selectedGroupSize} ${selectedGroupSize === 1 ? 'jugador' : 'jugadores'})` : ''}${hasRecycledSlots ? ` - ${recycledCount} plaza${recycledCount !== 1 ? 's' : ''} reciclada${recycledCount !== 1 ? 's' : ''} (solo puntos)` : ''}${totalCards > 1 ? ` - ${totalCards} tarjetas abiertas compitiendo` : ''}`}
                                      >
                                        {/* 🆕 Indicador de número de tarjetas abiertas (círculo con número) */}
                                        {totalCards > 1 && (
                                          <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-white flex items-center justify-center shadow-lg z-20">
                                            <span className="text-[9px] font-black text-white">{totalCards}</span>
                                          </div>
                                        )}
                                        
                                        {/* Indicador de plaza reciclada */}
                                        {hasRecycledSlots && (
                                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 border border-yellow-600 flex items-center justify-center shadow-md z-10">
                                            <span className="text-[10px]">♻️</span>
                                          </div>
                                        )}
                                        
                                        {hasPlayers ? (
                                          <div className="text-sm font-black leading-none">
                                            {cls.playersCount}
                                          </div>
                                        ) : pricePerSlot ? (
                                          <>
                                            <div className="text-sm font-bold leading-none mb-1">
                                              {pricePerSlot.toFixed(0)}€
                                            </div>
                                            <div className="flex items-center gap-1">
                                              {Array.from({ length: selectedGroupSize }).map((_, idx) => (
                                                <div key={idx} className="w-4 h-4 rounded-full bg-white border border-gray-400 flex items-center justify-center">
                                                  <svg className="w-2.5 h-2.5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                  </svg>
                                                </div>
                                              ))}
                                            </div>
                                          </>
                                        ) : (
                                          <div className="text-sm font-black leading-none">
                                            {cls.playersCount || 0}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {instructorClasses.length > 1 && (
                                    <div className="text-[8px] text-orange-600 font-bold text-center bg-orange-100 rounded shadow-sm mt-1">
                                      +{instructorClasses.length - 1}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* 🆕 Botón "Reservar Pista" en modo reservar-pistas */}
                              {viewModeCalendar === 'reservar-pistas' && confirmedInSlot.length === 0 && !isSecondSlotOfClass && !isBufferBeforeClass && instructorClasses.length === 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedCourtSlot({ date: currentDate, time, courtNumber: undefined });
                                    setShowCourtReservation(true);
                                  }}
                                  className="absolute inset-0 flex flex-col items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-100/30 transition-all group"
                                  title="Reservar pista en este horario"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-1 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                  </svg>
                                  <span className="text-[9px] font-bold uppercase">Reservar</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )
          )
          }
        </CardContent>
      </Card>

      {/* Diálogo de detalles del evento */}
      {selectedEvent && (
        <CalendarEventDetails
          event={selectedEvent}
          open={showEventDetails}
          onClose={() => setShowEventDetails(false)}
          onEdit={handleEventEdit}
          onCancel={handleEventCancel}
        />
      )}

      {/* Modal para mostrar tarjeta de clase como la ve el usuario */}
      <Dialog open={showClassCard} onOpenChange={setShowClassCard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Clase</DialogTitle>
          </DialogHeader>
          {selectedClassId && (
            <ClassCardWrapper 
              classId={selectedClassId}
              onClose={() => {
                setShowClassCard(false);
                setSelectedClassId(null);
              }}
              onBookingSuccess={() => {
                setShowClassCard(false);
                setSelectedClassId(null);
                // Recargar SIN CACHE después de cerrar el modal
                setTimeout(() => {
                  loadCalendarData(false, true);
                  loadUserBookings();
                }, 300);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para mostrar propuestas de clases (bloques naranjas) */}
      <Dialog open={showProposalCards} onOpenChange={setShowProposalCards}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Botón de cierre mejorado */}
          <button
            onClick={() => {
              setShowProposalCards(false);
              setSelectedProposal(null);
            }}
            className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 z-50 group"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <DialogHeader>
            <DialogTitle>Propuestas de Clase Disponibles</DialogTitle>
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <div className="p-1 bg-blue-500 rounded">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">📍 Has seleccionado el punto de inicio de una clase</p>
                  <ul className="text-gray-700 space-y-1 list-disc list-inside">
                    <li><strong>Las clases duran 60 minutos</strong> (ocupan dos bloques de 30 minutos)</li>
                    <li>Este recuadro marca el <strong>horario de inicio</strong> de la clase</li>
                    <li>Al reservar, ocuparás automáticamente los siguientes 60 minutos completos</li>
                    <li>Elige tu opción preferida abajo (1, 2, 3 o 4 jugadores) para continuar</li>
                  </ul>
                </div>
              </div>
            </div>
          </DialogHeader>
          {selectedProposal && (
            <ProposalCardsWrapper 
              clubId={selectedProposal.clubId}
              start={selectedProposal.start}
              instructorId={selectedProposal.instructorId}
              onClose={() => {
                setShowProposalCards(false);
                setSelectedProposal(null);
              }}
              onBookingSuccess={() => {
                setShowProposalCards(false);
                setSelectedProposal(null);
                // Recargar SIN CACHE después de booking
                setTimeout(() => {
                  loadCalendarData(false, true);
                  loadUserBookings();
                }, 300);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para mostrar tarjeta de partida */}
      <Dialog open={showMatchCard} onOpenChange={setShowMatchCard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Partida</DialogTitle>
          </DialogHeader>
          {selectedMatchId && (
            <MatchCardWrapper 
              matchId={selectedMatchId}
              onClose={() => {
                setShowMatchCard(false);
                setSelectedMatchId(null);
              }}
              onBookingSuccess={() => {
                setShowMatchCard(false);
                setSelectedMatchId(null);
                // Recargar SIN CACHE después de cerrar el modal
                setTimeout(() => {
                  loadCalendarData(false, true);
                  loadUserBookings();
                }, 300);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 🆕 Modal para reservar pista */}
      <Dialog open={showCourtReservation} onOpenChange={setShowCourtReservation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reservar Pista</DialogTitle>
          </DialogHeader>
          <CourtReservationDialog 
            selectedSlot={selectedCourtSlot}
            clubId={clubId}
            currentUser={currentUser}
            calendarData={calendarData}
            onClose={() => {
              setShowCourtReservation(false);
              setSelectedCourtSlot(null);
            }}
            onReservationSuccess={() => {
              setShowCourtReservation(false);
              setSelectedCourtSlot(null);
              // Recargar calendario
              setTimeout(() => {
                loadCalendarData(false, true);
                loadUserBookings();
              }, 300);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para cerrar sesión */}
      <LogoutConfirmationDialog
        isOpen={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
        onConfirm={() => {
          // Limpiar datos de sesión
          localStorage.removeItem('currentUser');
          sessionStorage.clear();
          // Redirigir a login
          window.location.href = '/auth/login';
        }}
      />
    </div>
  );
}

// 🆕 Componente para diálogo de reserva de pista
function CourtReservationDialog({ 
  selectedSlot, 
  clubId, 
  currentUser,
  calendarData,
  onClose, 
  onReservationSuccess 
}: { 
  selectedSlot: { date: Date; time: string; courtNumber?: number } | null;
  clubId: string;
  currentUser: any;
  calendarData: CalendarData | null;
  onClose: () => void;
  onReservationSuccess: () => void;
}) {
  const [duration, setDuration] = useState<30 | 60 | 90 | 120>(60);
  const [loading, setLoading] = useState(false);
  const [pricePerHour, setPricePerHour] = useState<number>(10);

  useEffect(() => {
    // Calcular precio por hora según la hora seleccionada
    if (selectedSlot) {
      fetchCourtPrice();
    }
  }, [selectedSlot]);

  const fetchCourtPrice = async () => {
    if (!selectedSlot) return;
    
    try {
      const [hour, minute] = selectedSlot.time.split(':');
      const startDate = new Date(selectedSlot.date);
      startDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
      
      // Obtener precio de pista para esa hora
      const response = await fetch(`/api/court-pricing?clubId=${clubId}&date=${startDate.toISOString()}`);
      if (response.ok) {
        const data = await response.json();
        setPricePerHour(data.pricePerHour || 10);
      }
    } catch (error) {
      console.error('Error fetching court price:', error);
    }
  };

  const handleReservation = async () => {
    if (!selectedSlot || !currentUser) return;
    
    setLoading(true);
    try {
      const [hour, minute] = selectedSlot.time.split(':');
      const startDate = new Date(selectedSlot.date);
      startDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + duration);
      
      // Calcular precio proporcional
      const totalPrice = pricePerHour * (duration / 60);
      
      // Crear reserva privada de pista
      const response = await fetch('/api/bookings/court-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId,
          courtId: selectedSlot.courtNumber !== undefined && calendarData?.courts[selectedSlot.courtNumber] 
            ? calendarData.courts[selectedSlot.courtNumber].id 
            : null, // Si no hay pista específica, el backend asignará automáticamente
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          userId: currentUser.id,
          duration,
          totalPrice
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear reserva');
      }
      
      onReservationSuccess();
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error al crear reserva');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedSlot) return null;
  
  const totalPrice = pricePerHour * (duration / 60);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Fecha:</strong> {selectedSlot.date.toLocaleDateString('es-ES')}
        </p>
        <p className="text-sm text-gray-700">
          <strong>Hora:</strong> {selectedSlot.time}
        </p>
        {selectedSlot.courtNumber !== undefined && (
          <p className="text-sm text-gray-700">
            <strong>Pista:</strong> {selectedSlot.courtNumber}
          </p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Duración</label>
        <div className="grid grid-cols-2 gap-2">
          {[30, 60, 90, 120].map((dur) => (
            <Button
              key={dur}
              onClick={() => setDuration(dur as 30 | 60 | 90 | 120)}
              variant={duration === dur ? 'default' : 'outline'}
              className="w-full"
            >
              {dur} min
            </Button>
          ))}
        </div>
      </div>
      
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex justify-between items-center">
          <span className="font-medium">Precio por hora:</span>
          <span className="text-lg font-bold">{pricePerHour.toFixed(2)}€</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="font-medium">Duración:</span>
          <span>{duration} minutos</span>
        </div>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-300">
          <span className="font-bold text-lg">Total a pagar:</span>
          <span className="text-2xl font-bold text-green-700">{totalPrice.toFixed(2)}€</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={onClose}
          variant="outline"
          className="flex-1"
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleReservation}
          className="flex-1"
          disabled={loading}
        >
          {loading ? 'Reservando...' : 'Confirmar Reserva'}
        </Button>
      </div>
    </div>
  );
}

// Componente wrapper para cargar la clase y mostrar el ClassCardReal
function ClassCardWrapper({ classId, onClose, onBookingSuccess }: { classId: string; onClose: () => void; onBookingSuccess?: () => void }) {
  const [classData, setClassData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Cargar usuario actual con JWT
        const token = localStorage.getItem('auth_token');
        const userResponse = await fetch('/api/users/current', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUser(userData.user || userData);
        }

        // Cargar datos de la clase usando el nuevo endpoint
        const classResponse = await fetch(`/api/timeslots/${classId}`);
        if (classResponse.ok) {
          const slot = await classResponse.json();
          setClassData(slot);
        } else {
          console.error('Error al cargar la clase:', classResponse.status);
        }
      } catch (error) {
        console.error('Error loading class:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [classId]);

  const handleBookingSuccess = () => {
    onClose();
    if (onBookingSuccess) {
      onBookingSuccess();
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando clase...</div>;
  }

  if (!classData) {
    return <div className="p-8 text-center">No se pudo cargar la clase</div>;
  }

  return (
    <ClassCardReal
      classData={classData}
      currentUser={currentUser}
      onBookingSuccess={handleBookingSuccess}
      showPointsBonus={true}
      instructorView={currentUser?.role === 'INSTRUCTOR'}
      isInstructor={currentUser?.role === 'INSTRUCTOR'}
      instructorId={currentUser?.role === 'INSTRUCTOR' ? currentUser?.instructorId : undefined}
    />
  );
}

// Componente wrapper para cargar y mostrar propuestas de clase compatibles
function ProposalCardsWrapper({ 
  clubId, 
  start,
  instructorId, 
  onClose, 
  onBookingSuccess 
}: { 
  clubId: string; 
  start: string;
  instructorId?: string; 
  onClose: () => void; 
  onBookingSuccess?: () => void;
}) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Cargar usuario actual con JWT
        const token = localStorage.getItem('auth_token');
        const userResponse = await fetch('/api/users/current', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUser(userData.user || userData);
          
          // Cargar propuestas - Filtrar por instructor específico si se proporciona
          const url = instructorId 
            ? `/api/timeslots/proposals?clubId=${clubId}&start=${start}&instructorId=${instructorId}`
            : `/api/timeslots/proposals?clubId=${clubId}&start=${start}`;
          
          const proposalsResponse = await fetch(url);
          
          if (proposalsResponse.ok) {
            const data = await proposalsResponse.json();
            setProposals(data.proposals || []);
            console.log(`📋 Propuestas cargadas: ${data.proposals?.length || 0}`);
          } else {
            console.error('Error al cargar propuestas:', proposalsResponse.status);
          }
        }
      } catch (error) {
        console.error('Error loading proposals:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [clubId, start, instructorId]);

  const handleBookingSuccess = () => {
    if (onBookingSuccess) {
      onBookingSuccess();
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando propuestas...</div>;
  }

  if (proposals.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No hay propuestas compatibles con tu nivel</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <strong>💡 Propuestas compatibles:</strong> Mostrando {proposals.length} opciones que coinciden con tu nivel
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proposals.map((proposal) => (
          <ClassCardReal
            key={proposal.id}
            classData={proposal}
            currentUser={currentUser}
            onBookingSuccess={handleBookingSuccess}
            showPointsBonus={true}
            instructorView={currentUser?.role === 'INSTRUCTOR'}
            isInstructor={currentUser?.role === 'INSTRUCTOR'}
            instructorId={currentUser?.role === 'INSTRUCTOR' ? currentUser?.instructorId : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// Componente wrapper para cargar y mostrar una partida
function MatchCardWrapper({ 
  matchId, 
  onClose, 
  onBookingSuccess 
}: { 
  matchId: string; 
  onClose: () => void; 
  onBookingSuccess?: () => void;
}) {
  const [matchData, setMatchData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Cargar usuario actual con JWT
        const token = localStorage.getItem('auth_token');
        const userResponse = await fetch('/api/users/current', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (userResponse.ok) {
          const data = await userResponse.json();
          const userData = data.user || data;
          setCurrentUser(userData);
          
          // Cargar la partida específica
          const matchResponse = await fetch(`/api/matchgames?clubId=club-1`);
          
          if (matchResponse.ok) {
            const matchesData = await matchResponse.json();
            const match = matchesData.matchGames?.find((m: any) => m.id === matchId);
            
            if (match) {
              setMatchData(match);
            } else {
              console.error('Partida no encontrada:', matchId);
            }
          }
        }
      } catch (error) {
        console.error('Error loading match:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [matchId]);

  const handleBookingSuccess = () => {
    if (onBookingSuccess) {
      onBookingSuccess();
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando partida...</div>;
  }

  if (!matchData) {
    return <div className="p-8 text-center">No se pudo cargar la partida</div>;
  }

  return (
    <MatchGameCard
      matchGame={matchData}
      currentUser={currentUser}
      onBookingSuccess={handleBookingSuccess}
      showLeaveButton={true}
      showPrivateBookingButton={false}
    />
  );
}
