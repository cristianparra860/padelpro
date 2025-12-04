'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CalendarIcon, ChevronLeft, ChevronRight, Filter, Users, DoorOpen, GraduationCap, UserCircle } from 'lucide-react';
import CalendarEventDetails from './CalendarEventDetails';
import DateSelector from './DateSelector';
import ClassCardReal from '@/components/class/ClassCardReal';
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
  type: 'class-proposal' | 'class-confirmed' | 'match' | 'instructor-blocked' | 'court-blocked';
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
}

interface CalendarData {
  courts: Array<{
    id: string;
    number: number;
    name: string;
    clubName?: string;
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
  events: CalendarEvent[];
  summary: {
    totalCourts: number;
    totalInstructors: number;
    totalClasses: number;
    confirmedClasses: number;
    proposedClasses: number;
    totalMatches: number;
    totalBookings?: number;
    emptyClasses?: number;
    fullClasses?: number;
  };
}

export default function ClubCalendar({ 
  clubId, 
  currentUser,
  viewMode = 'club' // 'user' = solo mi info, 'club' = toda info del club, 'instructor' = info del instructor
}: { 
  clubId: string; 
  currentUser?: any;
  viewMode?: 'user' | 'club' | 'instructor';
}) {
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
  const [showProposalCards, setShowProposalCards] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<{ clubId: string; start: string; instructorId?: string } | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]); // 🆕 Bookings del usuario para colorear días
  // 🆕 Filtro de reservas: en modo 'user' siempre 'mine', en otros modos configurable
  const [bookingFilter, setBookingFilter] = useState<'all' | 'mine'>(viewMode === 'user' ? 'mine' : 'all');

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
      const response = await fetch(`/api/users/${currentUser.id}/bookings`, {
        cache: 'default',
        next: { revalidate: 60 }
      });
      if (response.ok) {
        const bookings = await response.json();
        
        // Transformar para el DateSelector
        const formattedBookings = bookings.map((b: any) => ({
          timeSlotId: b.timeSlotId,
          status: b.status,
          date: b.timeSlot?.start || b.start || new Date()
        }));
        
        setUserBookings(formattedBookings);
      }
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
            return event.type === 'match';
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
    for (let hour = 7; hour <= 22; hour++) {
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
            <Button size="sm" variant="outline" onClick={loadCalendarData}>Reintentar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const days = getDaysInView();
  const timeSlots = getTimeSlots();

  return (
    <div className="space-y-6">
      {/* 🔧 MODO MÓVIL: Barra compacta fija para navegación rápida - OCULTA */}
      <div className="hidden">
        <button onClick={() => navigateDate('prev')} className="px-2 py-1 text-white text-sm font-semibold bg-white/20 rounded hover:bg-white/30">◀</button>
        <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1 text-white text-sm font-semibold bg-white/20 rounded hover:bg-white/30">Hoy</button>
        <button onClick={() => navigateDate('next')} className="px-2 py-1 text-white text-sm font-semibold bg-white/20 rounded hover:bg-white/30">▶</button>
        <div className="flex-1 text-center text-white text-xs font-medium">
          {currentDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
        <div className="flex gap-1">
          {['day','week','month'].map(v => (
            <button key={v} onClick={() => setView(v as any)} className={`px-2 py-1 rounded text-xs font-semibold ${view===v ? 'bg-white text-purple-600' : 'bg-white/20 text-white'} transition`}>{v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}</button>
          ))}
        </div>
      </div>
      
      {/* Header unificado con estadísticas - DESKTOP */}
      {calendarData && (
        <Card className="hidden md:block bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 border-0 shadow-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-6">
              {/* Título con Logo */}
              <div className="flex items-center gap-4 min-w-fit">
                {calendarData.courts[0]?.clubLogo ? (
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <img 
                      src={calendarData.courts[0].clubLogo} 
                      alt={calendarData.courts[0]?.clubName || 'Club'} 
                      className="h-16 w-16 object-contain"
                    />
                  </div>
                ) : (
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <CalendarIcon className="h-6 w-6 text-white" />
                  </div>
                )}
                <h2 className="text-white text-xl font-bold whitespace-nowrap">Calendario del Club, {calendarData.courts[0]?.clubName || 'Club'}</h2>
              </div>
              
              {/* Botones a la derecha */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white hover:bg-gray-100 text-blue-600 font-semibold border-0 shadow-md"
                  onClick={() => window.location.href = '/activities'}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Clases
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white hover:bg-gray-100 text-blue-600 font-semibold border-0 shadow-md"
                  onClick={() => setBookingFilter('mine')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Mi Calendario
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white hover:bg-gray-100 text-blue-600 font-semibold border-0 shadow-md"
                  onClick={() => setBookingFilter('all')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Calendario del Club
                </Button>
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
              <CardTitle className="flex items-center gap-2 text-white text-lg font-bold">
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
            // NUEVA VISTA: Basada en pistas con fila de propuestas - DISEÑO MEJORADO Y RESPONSIVE
            <div className="flex flex-col overflow-x-auto md:overflow-x-visible md:rounded-lg md:border md:border-gray-200 -mx-4 md:mx-0">
              {/* Columna de horas (izquierda) */}
              <div className="flex border-b-2 border-gray-300 bg-gradient-to-r from-gray-100 to-gray-50 shadow-sm">
                <div className="w-24 border-r-2 border-gray-300 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-2 flex-shrink-0 sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                  <span className="text-xs font-bold text-white">⏰ Horarios</span>
                </div>
                {/* Headers de slots de tiempo */}
                <div className="flex min-w-max">
                  {timeSlots.map(time => {
                    const [hour, minute] = time.split(':');
                    return (
                      <div key={time} className="w-8 md:w-11 border-r text-center py-1 flex-shrink-0 hover:bg-blue-50 transition-colors">
                        <div className="text-[14px] font-black text-gray-800 leading-none">{hour}</div>
                        <div className="text-[12px] font-bold text-gray-500 leading-none">{minute}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FILAS: Clases Propuestas por Instructor - DISEÑO MEJORADO */}
              {calendarData?.instructors.map(instructor => (
                <div key={instructor.id} className="flex border-b bg-gradient-to-r from-orange-50 to-orange-100/50 hover:from-orange-100 hover:to-orange-100 transition-colors">
                  <div className="w-24 border-r flex items-center px-2 py-1 flex-shrink-0 sticky left-0 bg-gradient-to-r from-orange-50 to-orange-100 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-1">
                      {instructor.photo ? (
                        <img 
                          src={instructor.photo} 
                          alt={instructor.name}
                          className="w-6 h-6 rounded-full object-cover border-2 border-orange-500 shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                          {instructor.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-orange-900 truncate">{abbreviateName(instructor.name)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex min-w-max">
                    {timeSlots.map((time, slotIndex) => {
                      // 🔍 VERIFICAR SI ESTE SLOT TIENE 60 MINUTOS COMPLETOS DISPONIBLES
                      const canStartClassHere = hasFullHourAvailable(instructor.id, time, currentDate);
                      
                      // Buscar clases propuestas de ESTE instructor en este slot
                      const instructorClasses = (calendarData?.proposedClasses || []).filter(cls => {
                        const clsStart = new Date(cls.start);
                        const [hourStr, minuteStr] = time.split(':');
                        const slotHour = parseInt(hourStr);
                        const slotMinute = parseInt(minuteStr);
                        
                        // Filtrar por instructor, día y hora
                        const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                        const isSameTime = clsStart.getHours() === slotHour && clsStart.getMinutes() === slotMinute;
                        const isSameInstructor = cls.instructorId === instructor.id;
                        
                        // 🆕 Aplicar filtro de usuario si está activo
                        let matchesUserFilter = true;
                        if (bookingFilter === 'mine' && currentUser?.id) {
                          // Mostrar clases donde el usuario está como participante O como instructor
                          const isParticipant = cls.bookings?.some((b: any) => b.userId === currentUser.id) || false;
                          const isInstructor = cls.instructorId === currentUser.id;
                          matchesUserFilter = isParticipant || isInstructor;
                        }
                        
                        return isSameInstructor && isSameDay && isSameTime && matchesUserFilter;
                      });

                      // ⚠️ SOLO MOSTRAR PROPUESTAS SI HAY 60 MINUTOS DISPONIBLES
                      // 🔧 EXCEPCIÓN: Siempre mostrar si ya tiene bookings (inscripciones)
                      const hasBookings = instructorClasses.some(cls => cls.bookings && cls.bookings.length > 0);
                      const visibleClasses = (canStartClassHere || hasBookings) ? instructorClasses : [];
                      
                      // 🎯 ORDENAR: Mostrar primero las clases con bookings
                      const sortedClasses = [...visibleClasses].sort((a, b) => {
                        const aHasBookings = (a.bookings?.length || 0) > 0;
                        const bHasBookings = (b.bookings?.length || 0) > 0;
                        if (aHasBookings && !bHasBookings) return -1;
                        if (!aHasBookings && bHasBookings) return 1;
                        return 0;
                      });

                      return (
                        <div 
                          key={slotIndex} 
                          className={`w-8 md:w-11 h-10 border-r relative flex-shrink-0 ${!canStartClassHere ? 'bg-red-50/30' : ''}`}
                          title={!canStartClassHere ? '⚠️ No hay 60min disponibles' : ''}
                        >
                          {sortedClasses.length > 0 && (
                            <div className="absolute inset-0 p-0.5 overflow-hidden">
                              {sortedClasses.slice(0, 1).map(cls => {
                                const hasPlayers = cls.playersCount > 0;
                                // Azul brillante cuando hay jugadores, naranja cuando está vacío
                                const bgColor = hasPlayers 
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                                  : 'bg-gradient-to-br from-orange-500 to-orange-600';
                                const borderColor = hasPlayers ? 'border-blue-400' : 'border-orange-400';
                                
                                // 🔍 LOG: Verificar datos de la clase
                                if (cls.bookings && cls.bookings.length > 0) {
                                  console.log('🎯 RENDERIZANDO CLASE CON BOOKINGS:', {
                                    id: cls.id,
                                    playersCount: cls.playersCount,
                                    bookingsLength: cls.bookings.length,
                                    bookings: cls.bookings.map((b: any) => ({
                                      groupSize: b.groupSize,
                                      status: b.status
                                    }))
                                  });
                                }
                                
                                return (
                                  <div
                                    key={cls.id}
                                    className={`${bgColor} text-white rounded shadow-md cursor-pointer hover:shadow-lg hover:scale-105 transition-all h-full flex items-center justify-center ${borderColor} border p-0.5`}
                                    onClick={() => handleEventClick(cls)}
                                    title={`${cls.category || cls.level} - ${cls.playersCount} alumno${cls.playersCount !== 1 ? 's' : ''} inscrito${cls.playersCount !== 1 ? 's' : ''}`}
                                  >
                                    <div className="text-xs font-black leading-none">
                                      {cls.playersCount}
                                    </div>
                                  </div>
                                );
                              })}
                              {sortedClasses.length > 1 && (
                                <div className="text-[6px] text-orange-600 font-bold text-center bg-orange-100 rounded shadow-sm">
                                  +{sortedClasses.length - 1}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* FILAS: Pistas (1, 2, 3, 4...) - DISEÑO MEJORADO Y RESPONSIVE */}
              {calendarData?.courts.map(court => (
                <div key={court.id} className="flex border-b hover:bg-blue-50/30 transition-colors">
                  <div className="w-24 border-r flex items-center px-2 py-1 flex-shrink-0 bg-white sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-1">
                      <div className="p-1 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm flex-shrink-0">
                        <DoorOpen className="h-3 w-3 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-gray-900">🎾 Pista {court.number}</div>
                        <div className="text-[8px] text-gray-600 font-medium truncate">{court.name}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex min-w-max">
                    {timeSlots.map((time, slotIndex) => {
                      // Buscar clases confirmadas en esta pista, slot Y del día seleccionado
                      const confirmedInSlot = (calendarData?.confirmedClasses || []).filter(cls => {
                        const clsStart = new Date(cls.start);
                        const [hourStr, minuteStr] = time.split(':');
                        const slotHour = parseInt(hourStr);
                        const slotMinute = parseInt(minuteStr);
                        
                        // IMPORTANTE: Verificar que sea del mismo día
                        const isSameDay = clsStart.toDateString() === currentDate.toDateString();
                        const isSameTime = clsStart.getHours() === slotHour && clsStart.getMinutes() === slotMinute;
                        
                        // 🆕 Aplicar filtro de usuario si está activo
                        let matchesUserFilter = true;
                        if (bookingFilter === 'mine' && currentUser?.id) {
                          // Mostrar clases donde el usuario está como participante O como instructor
                          const isParticipant = cls.bookings?.some((b: any) => b.userId === currentUser.id) || false;
                          const isInstructor = cls.instructorId === currentUser.id;
                          matchesUserFilter = isParticipant || isInstructor;
                        }
                        
                        return cls.courtNumber === court.number && isSameDay && isSameTime && matchesUserFilter;
                      });

                      // 🔍 VERIFICAR SI ESTE SLOT ESTÁ OCUPADO POR UNA CLASE DE 60MIN
                      // Una clase que empieza 30min antes también ocupa este slot
                      const slotDate = new Date(currentDate);
                      const [hourStr, minuteStr] = time.split(':');
                      slotDate.setHours(parseInt(hourStr), parseInt(minuteStr), 0, 0);
                      
                      const isOccupiedByPreviousClass = (calendarData?.confirmedClasses || []).some(cls => {
                        if (cls.courtNumber !== court.number) return false;
                        
                        const clsStart = new Date(cls.start);
                        const clsEnd = new Date(cls.end);
                        
                        // Verificar si este slot está DENTRO del rango de la clase
                        return clsStart <= slotDate && slotDate < clsEnd;
                      });

                      // Solo advertir en desarrollo
                      if (confirmedInSlot.length > 1 && process.env.NODE_ENV === 'development') {
                        console.warn(`⚠️ OVERLAP: ${confirmedInSlot.length} classes at same time on court ${court.number}`);
                      }

                      // Verificar si este slot es parte de una clase de 60min
                      const isPartOfClass = confirmedInSlot.length > 0;

                      return (
                        <div 
                          key={slotIndex} 
                          className={`w-8 md:w-11 h-14 border-r relative flex-shrink-0 ${isOccupiedByPreviousClass && !isPartOfClass ? 'bg-green-100' : ''}`}
                          title={isOccupiedByPreviousClass && !isPartOfClass ? '🔒 Ocupado por clase anterior (60min)' : ''}
                        >
                          {confirmedInSlot.slice(0, 1).map(cls => { // 🛡️ SOLO MOSTRAR LA PRIMERA CLASE para evitar solapamientos visuales
                            // Solo renderizar en el primer slot (00 o 30 inicial)
                            const clsStart = new Date(cls.start);
                            const isStartSlot = clsStart.getHours() === parseInt(time.split(':')[0]) && 
                                               clsStart.getMinutes() === parseInt(time.split(':')[1]);
                            
                            if (!isStartSlot) return null;

                            // Clase ocupa 2 slots (60min) = exactamente 2 celdas sin sobresalir
                            return (
                              <div
                                key={cls.id}
                                className="absolute left-0.5 top-0.5 bottom-0.5 right-0.5 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-md shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all z-10 flex flex-col items-center justify-center px-1 py-0.5 border-2 border-green-400"
                                style={{
                                  width: 'calc(200% - 4px)', // Exactamente 2 celdas menos el padding
                                }}
                                onClick={() => handleEventClick(cls)}
                                title={`${cls.instructorName} - ${cls.category || cls.level} (${cls.playersCount}/${cls.maxPlayers})`}
                              >
                                {/* Fila superior: Foto y dígitos */}
                                <div className="flex items-center justify-between w-full">
                                  {/* Foto del instructor */}
                                  <div className="flex-shrink-0">
                                    {cls.instructorPhoto ? (
                                      <img 
                                        src={cls.instructorPhoto} 
                                        alt={cls.instructorName}
                                        className="w-6 h-6 rounded-full object-cover border border-white shadow-sm"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-[8px] font-bold border border-white shadow-sm">
                                        {cls.instructorName?.charAt(0) || '?'}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Número de inscritos */}
                                  <div className="text-sm font-black leading-none">
                                    {cls.playersCount}/{cls.maxPlayers}
                                  </div>
                                </div>
                                
                                {/* Fila inferior: Nombre del instructor */}
                                <div className="text-[9px] font-bold truncate w-full text-center">
                                  {cls.instructorName?.split(' ')[0]}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                setTimeout(() => loadCalendarData(false, true), 300);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para mostrar propuestas de clases (bloques naranjas) */}
      <Dialog open={showProposalCards} onOpenChange={setShowProposalCards}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Propuestas de Clase Disponibles</DialogTitle>
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
                setTimeout(() => loadCalendarData(false, true), 300);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
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
          />
        ))}
      </div>
    </div>
  );
}
